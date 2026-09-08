# Personal bests and bounded submission receipts

Implementation checkpoint: 2026-09-08. This is the new local backend contract,
**not evidence of a production migration or deployment**. Historical migrations
0001–0003 are unchanged. Live schema, grants, traffic and cleanup activation
require a separate approved cutover.

## Storage contract

- `game_personal_bests` is permanent: one row per game, rules version and user.
  Existing score/time values and `recorded_at` are preserved by the transition.
  No source-receipt foreign key is needed to display or retain a best.
- `game_submission_receipts` replaces `game_runs` in place. It is short-lived
  retry/rate-limit state, not a permanent play-history feature. It keeps the
  existing `game_run_id` primary key to avoid an unnecessary identifier change.
- `improved_personal_best` means **this accepted submission improved the best at
  that moment**, not that it remains the player's current best. The HTTP field
  remains `personalBest`; an identical retry returns its original outcome.
- Three Bosses keeps an accepted receipt even when the score is not an
  improvement. Otherwise repeated non-best submissions could evade the existing
  ten-submissions-per-fifteen-minutes limit or return inconsistent retry results.
  p4-Vega continues its existing best-only write path and creates no receipts.
- Receipts remain for at least 24 hours. The hourly bounded cleanup deletes
  only rows strictly older than that cutoff. Normal retention is about 24–25
  hours; outages/backlog can extend it. Expiry is not renewed by retrying.
- While a receipt exists, identical retries are replayed and changed payloads
  conflict. Once deleted, historical UUID recognition is no longer guaranteed;
  a valid new submission is compared against the permanent best again. The
  signed run-ticket lifetime stays 30 minutes and is never extended by this job.
- Submission/replay and deletion take the same per-user MySQL lock. Cleanup
  commits each bounded deletion before releasing that lock. Account deletion's
  existing user-owned cascading deletion semantics remain unchanged.

## Reviewable migration commands

From the repository root:

```text
npm --prefix backend run migrations:receipts:plan
npm --prefix backend run migrations:receipts:apply
npm --prefix backend run migrations:receipts:verify
```

The existing dedicated migration connection configuration is required; commands
never fall back to the website credentials. Plan/verify need the exact
`MIGRATION_CONFIRM_DATABASE`, `MIGRATION_CONFIRM_TARGET` (`host:port/database`)
and resolved-account confirmation. Plans report target identity, immutable SQL
checksums, schema/history state and ordered data counts/hashes, not player rows.

Apply additionally requires all existing mutation confirmations plus:

```text
MIGRATION_ALLOW_APPLY=1
MIGRATION_ALLOW_RECEIPT_TRANSITION=1
MIGRATION_CONFIRM_SUBMISSIONS_DRAINED=1
MIGRATION_CONFIRM_RECEIPT_TRANSITION=game_runs -> bounded submission receipts
MIGRATION_CONFIRM_RECEIPT_PLAN_SHA256=<reviewed plan digest>
MIGRATION_CONFIRM_SERVER_UUID=<independently verified server UUID>
```

These are guards, not instructions to run against production now. A submitted
plan digest is rechecked under the migration lock before DDL. The production
`cms` name also requires the independently pinned Cloud SQL UUID. Generic
`migrations:apply` cannot perform these two migrations.

## Production cutover checklist — separate approval required

1. Review the exact source commit/image, new SQL, target identity, grants and
   backup/PITR restore procedure. Inventory readers, writers, scheduled jobs,
   views, routines, events and foreign keys. Include the TablePlus operator's
   old-table grants. Do not remove the existing production image yet.
2. Freeze **both** games' submissions on every serving revision and drain all
   writers, including operator edits and any background jobs. Keep the receipt
   cleanup disabled. The migration advisory lock alone does not freeze the API.
   Verify no active transactions or pending metadata locks. Use a maintenance
   identity able to inspect that metadata; denied/incomplete visibility is a
   blocker, not a reason to remove the preflight.
3. Capture/review the plan only after draining writers. Record best/receipt
   counts and hashes as preservation evidence. Approve that exact plan and
   target, then run the guarded apply. `0004` atomically detaches the best's
   source dependency; `0005` atomically renames the receipt table/boolean and
   replaces the obsolete source index with a covering expiry index. Neither
   migration deletes bests or receipts. Verify the final state and compare the
   before/after preservation hashes while writers remain frozen.
4. Cut over privileges explicitly: MySQL table rename does **not** migrate
   table/column grants. Review/revoke the exact obsolete `game_runs` grants,
   then plan/apply/verify the new runtime manifest. Its unexpected-grant check
   deliberately refuses to silently retain or broadly revoke obsolete grants.
   Review the operator account separately. Do not add DELETE to the API account.
5. Deploy the exact receipt-compatible backend with both submission flags still
   disabled. An old backend is not write-compatible with the final schema;
   a new backend is not write-compatible with the old schema. Verify login and
   unchanged leaderboard ordering, then separately approve write activation.
   Test authorized first acceptance, identical retry, payload conflict, worse
   score, best improvement and rate limiting on an approved test account.
6. Only afterward follow the [cleanup activation runbook](../.github/receipt-cleanup/README.md):
   dedicated least-privilege SQL/job/scheduler identities, pinned image and secret
   version, execution/backlog/missing-run alerts, a reviewed manual run, then the
   hourly schedule. Prove expired cleanup leaves personal bests unchanged.

## Failure and recovery

Keep writers frozen on any failure. MySQL DDL is not transactionally rolled
back together with `schema_migrations`. If either atomic ALTER succeeds but its
history insert fails, inspect the actual schema, produce a **new** recovery
plan, compare its data hashes with the original approved evidence, and approve
that new digest. The runner verifies the entire expected stage before recording
missing history; do not edit old SQL checksums or manually mark a migration done.

After cutover, use only a schema-compatible frozen backend for a quick service
rollback. Returning to the old ledger schema/image requires a separately reviewed
restore/reverse migration. Once cleanup deletes expired receipts, that history
cannot be reconstructed from best rows; it is intentionally disposable. Stop
cleanup by pausing its schedule, cancelling active executions and disabling its
flag. Permanent best rows must never be deleted as part of that rollback.

## Scoped security disposition

- **Fixed locally:** receipt retention no longer controls best retention;
  per-user locking covers cleanup/replay; cleanup has only the required SELECT
  columns and receipt DELETE; target/grants verified before access; bounded
  queries/execution; sanitized failures; migration plan and data-preservation
  checks; original immutable migration checksums preserved.
- **Accepted design:** UUID recognition ends when its receipt is deleted;
  retention can exceed 24 hours during job failure/backlog; existing ticket
  expiration and game validation remain unchanged.
- **Blocked pending explicit rollout approval:** live migration and grant
  cutover, new image deployment, cleanup credentials/IAM, alert routing and
  scheduler activation. No such production action is implied by this commit.
- **Deferred to release closeout:** the cumulative whole-project security pass
  and the remaining release/device checks in `PROJECT_PLAN.md`.

## Local verification checkpoint (2026-09-08)

- `npm --prefix backend test`: TypeScript passed.
- `npm --prefix backend run test:unit`: 171 passed with a fresh, isolated
  `npm ci --ignore-scripts --no-audit --no-fund` installation from the unchanged
  backend lockfile. The active development install instead produced 167 passes
  and four pre-existing parser-security failures: installed `qs` 6.15.3 differs
  from the locked 6.16.0. Running-server dependencies were deliberately not
  replaced; align that local installation before using it as release evidence.
- `npm --prefix backend run test:migrations`: all 49 isolated MySQL 8.0.31
  integration tests passed. Includes exact best/receipt preservation, interrupted
  DDL recovery, BIGINT pagination, concurrent retry/cleanup, per-user rate limits,
  signed-in HTTP round trip and actual cleanup under the restricted account.
  The disposable Docker database and its network were removed afterward.
- `npm run prod` in the isolated locked backend: both API and cleanup bundles
  built. `RECEIPT_CLEANUP_ENABLED=false node dist/submission-receipt-cleanup.min.js`
  returned the expected exit 1 and one sanitized configuration-failure event.
- `npm run test:receipt-cleanup`: 2 template contracts passed.
  `npm run test:cloudbuild-candidate`: 3 image-only contracts passed.
- `npm run docs`: passed once with the overlapping watcher paused; generated
  docs have no tracked diff. `git diff --check` passed.

Temporary validation files remain outside version control because filesystem
deletion was blocked. They are not deployable release artifacts. No dependency
versions, feature flags, Unity assets or production resources changed here.
