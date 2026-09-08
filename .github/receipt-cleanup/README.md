# Submission receipt retention job

This is a separately approved **production deletion job**, not an HTTP API route
and not part of the automatic main-branch deploy. Nothing in this directory
creates cloud resources when the website is built or deployed. The checked-in
job is disabled and has intentionally invalid image/secret placeholders.

## Runtime contract

- The backend's existing Docker build packages
  `dist/submission-receipt-cleanup.min.js`. The same reviewed digest may serve the
  API and this one-task job, with separate commands, credentials and identities.
- The job uses only `RECEIPT_CLEANUP_*` credentials. It does not load `.env`, use
  `DB_*` fallback credentials, open a port, or enable score submissions.
- Before querying receipts, it verifies the actual schema, server UUID,
  `CURRENT_USER()`, no active/mandatory roles, and the exact self-grants:
  `SELECT(user_id, game_run_id, submitted_at)` plus `DELETE` on
  `cms.game_submission_receipts`. No table-level SELECT, score/payload reads,
  personal-best/user/migration writes, global grants, grant options or roles.
- Global oldest-first indexed scans reach inactive users. Each delete acquires
  the same database-scoped per-user lock as submission/replay, then samples
  `UTC_TIMESTAMP(6)` in the DELETE statement. Only rows **strictly older than
  24 hours** can be removed. Replays cannot renew `submitted_at`.
- Each invocation allows at most 100 scans and 100 delete batches of at most
  200 rows (20,000 deletions), a 120-second whole-operation deadline, 10-second
  driver query timeouts, and 5-second shutdown. The Cloud Run task hard limit is
  180 seconds; one task, parallelism 1, no automatic task retries. Independent
  manual/duplicate invocations remain safe because they share the user locks.
- Successful hourly runs normally retain rows for 24 to approximately 25 hours.
  This is **not a hard upper bound during failures/backlog**. The job reports
  backlog as a failure, never silently claims that retention is satisfied.
- Structured stdout has `component=submission-receipt-cleanup`, counts/duration,
  `status` and `severity`. Exit 0 means no expired rows remain; exit 2 means
  backlog; exit 1 means configuration, identity, DB, deadline or shutdown failure.
  No credentials, IDs, scores, queries or raw driver errors are logged.

## Activation gates (operator checklist; do not skip)

1. Obtain explicit approval for the production schema/data and IAM changes.
   Verify the receipt migration and the removed personal-best dependency first;
   record that all bests and their leaderboard ordering survived the cutover.
   Keep the cleanup job disabled until the reviewed receipt-backed API is live.
2. Create a dedicated proxy-only MySQL account `receipt_cleanup@cloudsqlproxy~%`
   **without automatic Cloud SQL administrator roles**. Apply only the output
   from `renderReceiptCleanupGrantStatements` in
   `backend/ts/security/receiptCleanupGrantManifest.ts`. Independently inspect its
   complete grants and roles. The existing runtime/operator accounts do not
   receive any new DELETE privilege.
3. Store a separately generated cleanup password in the named Secret Manager
   secret; never paste it in a command, source file or log. Create the dedicated
   job service account with Cloud SQL Client and access to **only this secret**.
   Create a different scheduler identity with `roles/run.invoker` on **only this
   job**, no secret/SQL roles. Keep the Google-managed Scheduler service agent's
   required service-agent role; do not grant that role to the caller identity.
4. Reverify the project/instance/schema/server UUID against the intended live
   target. Render the job template outside the repository using the approved,
   scanned full image digest and a numeric pinned secret version. Do not use
   `latest`. First keep `RECEIPT_CLEANUP_ENABLED=false`. Review the rendered JSON
   diff; the v1 JSON document is accepted as YAML by `gcloud run jobs replace`.
5. Configure operator alerting **before enabling deletion**. Match Cloud Run Job
   execution failures (not just Scheduler HTTP errors), this component's ERROR
   logs/backlog, and absence of a successful completion for two consecutive
   hourly schedules. Route alerts to an existing approved operator notification
   channel; do not invent recipients. Test alert routing with the disabled job's
   sanitized configuration failure. Scheduler receiving 2xx only proves that a
   job execution was created, not that cleanup completed.
6. With explicit activation approval, set the rendered job's cleanup flag to
   `true`, replace the job, and execute it once manually. Verify completion,
   sanitized counts, remaining-expired probe, unchanged personal bests and
   authenticated replay behavior. If backlog remains, investigate/catch up using
   further bounded executions before enabling the schedule; do not increase
   limits automatically.
7. Only after the manual result and alerts pass, create the Scheduler resource
   from `cloud-scheduler-job.template.json`: UTC hourly, authenticated POST to the
   Jobs API using OAuth, not OIDC. It contains no execution overrides or secret.
   Observe the first scheduled **execution result**, then record deployment
   evidence and ownership in the release checkpoint.

To stop deletion, pause the Scheduler job and cancel any running cleanup
execution, then disable the cleanup flag. Do not drop personal bests or widen
the runtime role as a rollback. Already expired receipts cannot be recreated
without a separately reviewed backup restore, and their deletion must never
invalidate permanent personal bests. The normal 30-minute run-ticket expiration
does not change, and receipt deletion removes historical ID recognition.

## Official references

- [Schedule Cloud Run Jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule)
- [Cloud Run Job YAML schema](https://docs.cloud.google.com/run/docs/reference/yaml/v1)
- [Scheduler OAuth for Google API targets](https://docs.cloud.google.com/scheduler/docs/http-target-auth)

No Cloud Run job, Scheduler resource, secret, service account or IAM binding has
been created by adding these templates.
