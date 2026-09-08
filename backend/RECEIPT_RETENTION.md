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

1. Review the exact source commit, new SQL, target identity, grants and
   backup/PITR restore procedure. Inventory readers, writers, scheduled jobs,
   views, routines, events and foreign keys, including the TablePlus operator's
   old-table grants. Before DDL, obtain the receipt-compatible image's immutable
   digest, authenticated Google provenance binding and completed vulnerability-
   scan evidence.
   A successful local build is not that production artifact evidence.
2. With separate deployment approval, prepare the exact receipt-compatible
   image as a **frozen, zero-traffic revision before DDL**. Both
   `P4_VEGA_SCORE_SUBMISSIONS_ENABLED` and
   `THREE_BOSSES_RUN_SUBMISSIONS_ENABLED` must be `false`. Verify the complete
   revision configuration, login and leaderboard reads on the existing schema,
   plus p4's HTTP 503 `SUBMISSIONS_FROZEN` and Three Bosses' HTTP 403
   `SUBMISSION_DISABLED` contracts. Retain this tested frozen revision/digest as
   the post-migration service rollback target. Keep the prior image for
   pre-migration rollback; do not assume an old enabled revision can serve the
   new schema. The canonical main-only Stage B enables both games and therefore
   is not the frozen deployment path. The frozen deployment preflight requires
   canonical Stage A/B and any unreviewed triggers disabled, no competing active
   builds, and its reviewed source/deployment triggers still enabled.
3. **After the zero-traffic deployment succeeds**, separately approve and verify
   disabling every Cloud Build trigger in `global` and `us-central1`, including
   the reviewed manual source and frozen-deployment triggers. Disabling those
   two before the deployment preflight would prevent it from passing. Verify
   no pending, queued or working builds in either region. Then review and
   separately approve a fresh, etag-bound traffic-only plan routing 100% to the
   verified frozen revision and removing **all** revision tags, including
   reachable zero-traffic enabled candidates. A traffic plan expires after five
   minutes; expired or changed state requires a new plan/review. After routing
   settles, wait **longer than 300 seconds**, the reviewed old-request maximum
   (or longer if any retiring revision has a larger timeout), then repeat
   delayed checks of retired revisions, outstanding requests and SQL activity.
   Routing success is not proof of drain. Confirm no enabled revision is still
   reachable and drain operator edits and background score writers. Keep
   receipt cleanup disabled. Freezing score submission does not make the whole
   website read-only: signup can still insert users. The advisory lock alone
   does not freeze the API. Verify no active transactions or pending metadata
   locks with a maintenance identity able to inspect that metadata;
   denied/incomplete visibility is a blocker, not a reason to remove preflight.
4. Capture/review the plan only after draining writers. Record best/receipt
   counts and hashes as preservation evidence. Approve that exact plan and
   target, then run the guarded apply. `0004` atomically detaches the best's
   source dependency; `0005` atomically renames the receipt table/boolean and
   replaces the obsolete source index with a covering expiry index. Neither
   migration deletes bests or receipts. Verify the final state and compare the
   before/after preservation hashes while writers remain frozen.
5. Cut over privileges explicitly: MySQL table rename does **not** migrate
   table/column grants. Review/revoke the exact obsolete `game_runs` grants,
   then plan/apply/verify the new runtime manifest. Its unexpected-grant check
   deliberately refuses to silently retain or broadly revoke obsolete grants.
   Review the operator account separately. Do not add DELETE to the API account.
6. Reverify final schema/history, exact privileges, login and unchanged
   leaderboard ordering while the tested receipt-compatible revision remains
   frozen. Only then separately approve an enabled revision of that same image
   and its reachable test endpoint. Test authorized first acceptance, identical
   retry, payload conflict, worse score, best improvement and rate limiting on
   an approved test account before approving normal enabled traffic. Anonymous
   HTTP 401 probes only demonstrate an open gate, not working persistence.
7. Only afterward follow the [cleanup activation runbook](../.github/receipt-cleanup/README.md):
   dedicated least-privilege SQL/job/scheduler identities, pinned image and secret
   version, execution/backlog/missing-run alerts, a reviewed manual run, then the
   hourly schedule. Prove expired cleanup leaves personal bests unchanged.

## Frozen rollout tooling — local preparation only

- `scripts/render-frozen-backend-deploy.mjs` derives a separate source-less
  deployment document offline from a hash-pinned canonical Stage B recipe. Its
  contract pins the reviewed feature source and immutable image, requires
  provenance/scan validation, sets both submission flags to `false`, and uses
  a separately approved, approval-required trigger. It neither changes the
  canonical main trigger nor includes traffic promotion or a notifier. Rendered
  output still needs review and explicit approval before any cloud execution.
- `scripts/frozen-backend-traffic.mjs` separates a fresh read-only routing plan
  from an explicitly authorized, etag-bound traffic-only apply. Its cutover is
  to the exact verified frozen revision, with all revision tags removed; it is
  not an image deployment, schema migration or write-enablement command.

The renderer takes one reviewed source-pin JSON file and prints the deployment
configuration as JSON (also valid YAML); it performs no cloud actions:

```text
node scripts/render-frozen-backend-deploy.mjs <reviewed-source-pins.json>
```

That file must contain exactly `sourceBuildId`, `sourceCommit`, `imageDigest`,
`sourceTriggerId`, `sourceTriggerName`, `sourceRef` and `deploymentTriggerName`.
Use the exact successful feature image build, full 40-character commit and
`sha256:` image digest. The dedicated source trigger/ref must match that build;
neither canonical main trigger is a feature-image source. Keep the reviewed
rendered configuration and evidence outside deployable project assets. Creating
the source-less, approval-required deployment trigger, starting its pending
build and approving it are separate live actions, not consequences of rendering.

Before approving that deployment, derive its expected steps digest from the
**offline reviewed configuration**, not from steps returned by the live build.
Use the same reviewed pins and unchanged reviewed checkout, plus the actual
pending deployment build ID and exact deployment trigger ID:

```text
node scripts/render-frozen-backend-deploy.mjs --steps-sha256 <reviewed-source-pins.json> <pending-deployment-build-id> <deployment-trigger-id>
```

This re-renders the configuration and resolves its Cloud Build substitutions
before hashing. The live build's `_DEPLOY_TRIGGER_ID` must be that trigger UUID;
its `_APPROVAL` must be exactly
`freeze-zero-traffic:<sourceCommit>:<sourceBuildId>:<imageDigest>`. The generated
defaults are deliberately `INVALID`. Do not hash the unresolved template or
copy a hash of live steps: either loses the independent review boundary. The
successful approved deployment must attest the source provenance, image scan
and exact reviewed steps before traffic planning. The provenance check uses
authenticated Google API evidence and validates envelope metadata plus
source/image/build binding; it is **not** independent cryptographic signature
verification. The source image build still requests
`requestedVerifyOption: VERIFIED`.

After the successful frozen deployment and the trigger/build freeze in step 3,
prepare a **separate** traffic-pin JSON file with exactly these fields:

```json
{
  "sourceBuildId": "<reviewed feature image build UUID>",
  "sourceCommit": "<full 40-character source commit>",
  "imageDigest": "sha256:<64-character image digest>",
  "deploymentBuildId": "<successful approved frozen deployment build UUID>",
  "deploymentTriggerId": "<reviewed frozen deployment trigger UUID>",
  "deploymentStepsSha256": "<64-character offline resolved steps digest>"
}
```

The placeholders are deliberately invalid until replaced with reviewed evidence.
The following plan reads live state and writes a new local review file; it does
not change cloud routing. The output path must not already exist:

```text
node scripts/frozen-backend-traffic.mjs plan --pins <reviewed-traffic-pins.json> --output <new-plan.json>
```

Review the target revision, prior routing, all tags to remove and printed
`planSha256`. Only with separate approval for that exact traffic change, within
the five-minute plan lifetime:

```text
node scripts/frozen-backend-traffic.mjs apply --plan <new-plan.json> --confirm-plan <planSha256> --confirm-freeze-all-traffic
```

Apply rechecks the disabled trigger inventory, absence of active builds,
deployment evidence, frozen revision and service etag before changing only
traffic to 100% frozen with no tags. It does not disable triggers itself, freeze
operator sessions, drain database writers or make signup read-only. Keep those
operational checks explicit; settled routing alone is not permission for DDL.

These local deliverables have not been executed against production. The latest
completed local run passed 56 frozen-rollout checks, plus the three existing
candidate-image and two cleanup-template contracts. Live
deployment, freeze/drain and migration validation remain separate gates.

## Failure and recovery

Keep writers frozen on any failure. MySQL DDL is not transactionally rolled
back together with `schema_migrations`. If either atomic ALTER succeeds but its
history insert fails, inspect the actual schema, produce a **new** recovery
plan, compare its data hashes with the original approved evidence, and approve
that new digest. The runner verifies the entire expected stage before recording
missing history; do not edit old SQL checksums or manually mark a migration done.

After cutover, route service rollback only to the receipt-compatible frozen
revision verified and retained **before** DDL. The old generic-only image can
serve the unchanged leaderboard reads with its gates closed, but must not be
re-enabled: `0004` removes the source column used by its p4 improvement writes,
and `0005` removes the table name used by its Three Bosses submissions.
Returning to the old ledger schema/image requires a separately reviewed
restore/reverse migration. Once cleanup deletes expired receipts, that history
cannot be reconstructed from best rows; it is intentionally disposable. Stop
cleanup by pausing its schedule, cancelling active executions and disabling its
flag. Permanent best rows must never be deleted as part of that rollback.

## Scoped security disposition

- **Fixed locally:** receipt retention no longer controls best retention;
  per-user locking covers cleanup/replay; cleanup has only the required SELECT
  columns and receipt DELETE; target/grants verified before access; bounded
  queries/execution; sanitized failures; migration plan and data-preservation
  checks; original immutable migration checksums preserved. Frozen-rollout
  tooling independently pins approved deployment steps and image provenance,
  requires frozen flags and automation exclusion, and limits the traffic patch
  to the reviewed revision under its fresh service etag.
- **Accepted design:** UUID recognition ends when its receipt is deleted;
  retention can exceed 24 hours during job failure/backlog; existing ticket
  expiration and game validation remain unchanged.
- **Operational limitation:** repeated trigger/build checks and service etags
  are not a distributed IAM lock. An explicitly controlled maintenance window
  must prevent other operators/automation from re-enabling triggers, routing
  traffic or starting writers between checks. Google-authenticated provenance
  binding is not independent signature verification; do not claim otherwise.
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
versions, feature flags, Unity assets or production resources changed in that
receipt-implementation checkpoint.

The subsequent local rollout-preparation checkpoint updates the root tooling
lockfile's `qs` from 6.15.3 to 6.16.0. An isolated root dependency audit reported
zero vulnerabilities. This is separate from the backend lockfile and does not
establish a newly scanned Cloud Build image or change the running dev install.
The combined command
`node --test --test-reporter=spec scripts/render-frozen-backend-deploy.test.mjs scripts/frozen-backend-traffic.test.mjs scripts/cloudbuild-candidate.test.mjs .github/receipt-cleanup/templates.test.mjs`
passed all 61 checks: 11 renderer/preflight, 45 traffic guard, three existing
image-only and two cleanup-template contracts. This includes Bash/Python syntax
checks without executing deployment commands. PR CI YAML parsing and test-step
wiring passed using the existing Node YAML parser; system Python has no PyYAML.
Independent scoped review found no remaining P1/P2 findings. Cloud API response
normalization and a real approved zero-traffic deployment remain unverified.

Removal of the isolated root verification directory was blocked by filesystem
policy. It remains outside the repository at
`C:\Users\User\AppData\Local\Temp\mickeyf-root-qs-verified-c6949cf50c76471d870f9eb834acd5bb`;
it contains reproducible test dependencies, not release assets or credentials.
No deletion workaround was attempted.
No live build, CI trigger, deployment, traffic, schema, grants or cleanup
activation is authorized by these local preparation changes.
