# Personal bests and bounded submission receipts

Implementation checkpoint: 2026-09-08. The storage contract below is implemented
but **not migrated in production**. Subsequent approved zero-traffic deployment,
backend acceptance and read-only planning are recorded separately below.
Historical migrations 0001–0003 are unchanged. Live schema, grants, traffic and
cleanup activation require a separate approved cutover.

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

## Frozen rollout tooling — separate approval per live action

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

The frozen deployment, read-only traffic planning and separately approved
traffic apply have been exercised against live resources as recorded below.
The latest local run passed 57 frozen-rollout checks plus the three existing
candidate-image and two cleanup-template contracts (62 total). Traffic
drain, migration and write enablement remain separate gates.

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
  to the reviewed revision under its fresh service etag. Receipt apply now
  rejects missing/incomplete lock instrumentation and ineffective PROCESS
  access before transition DDL; empty lock tables cannot establish readiness.
- **Accepted design:** UUID recognition ends when its receipt is deleted;
  retention can exceed 24 hours during job failure/backlog; existing ticket
  expiration and game validation remain unchanged.
- **Operational limitation:** repeated trigger/build checks and service etags
  are not a distributed IAM lock. An explicitly controlled maintenance window
  must prevent other operators/automation from re-enabling triggers, routing
  traffic or starting writers between checks. Google-authenticated provenance
  binding is not independent signature verification; do not claim otherwise.
- **Blocked database readiness:** production `@@performance_schema=0` and the
  existing operator's PROCESS probe is denied. Do not accept empty lock tables
  or operator-limited activity visibility as a drained database. Establish an
  approved maintenance/metadata inspection path and explicitly review the
  disabled-instrumentation case before DDL. No privilege or instance change is
  implied by the approved traffic freeze.
- **Blocked pending explicit rollout approval:** live migration and grant
  cutover, enabled-revision deployment, cleanup credentials/IAM, alert routing
  and scheduler activation. Approved deployment, login acceptance and traffic
  freezing do not authorize these remaining actions.
- **Deferred to release closeout:** the cumulative whole-project security pass
  and the remaining release/device checks in `PROJECT_PLAN.md`.
- **Unresolved verification:** the latest disposable MySQL run's unchanged
  runtime-grant session-drain test saw a session after client close; resolve
  before grant cutover. The active dev install also retains four known parser
  test failures until a deliberate refresh to the locked dependencies.

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

## Approved image-build review (2026-09-08)

The user subsequently approved the exact candidate image build and scan review,
not deployment, traffic, schema/grant changes or cleanup activation.

- Source: `d1d5dbf6fcc1bedd596827a540779f437fe3501f`.
- Manual source trigger: `648fadca-3cd1-4b57-9d35-0f62a1468443`
  (`feature-new-leaderboard-candidate`). Its default ref remains
  `refs/heads/feature/new-leaderboard`; the explicit `--sha` override selected
  the reviewed commit for both requested and resolved Git source. No trigger
  configuration was changed.
- Build: `12ec9e8e-ff4a-493c-be8c-025423e5110c`, approved at
  `2026-09-08T17:28:37.010377Z`, successful at
  `2026-09-08T17:30:24.913932Z`.
- Image repository:
  `us-central1-docker.pkg.dev/noted-reef-387021/cloud-run-source-deploy/cloud-run-source-deploy`.
- Immutable digest:
  `sha256:9ec1bd83ea73a283ad36961b2dcd3022b9b0a40cbf16bd725398ff562015c3c3`.
- Source, exact image-only steps, fixed build identity, approval and authenticated
  provenance binding all passed against actual records. The live envelope uses
  URL-safe base64 for its signature; its payload exactly equals the displayed
  statement. The two resolved dependencies are the exact Git commit and pinned
  Docker builder. The checker now requires that exact pair rather than a loose
  builder-URI prefix; signature metadata remains distinct from independent
  cryptographic signature verification.
- Scan discovery: `FINISHED_SUCCESS`, continuous analysis `ACTIVE`, last scan
  `2026-09-08T17:30:35.899738685Z`; completed types include OS, NPM and SECRET.
  Direct regional Container Analysis queries for this exact image returned
  HTTP 200 `{}` for both VULNERABILITY and SECRET, with no pagination token:
  zero occurrences in either complete result. Recheck before deployment;
  advisories and the two-hour source-build freshness gate can change readiness.
- Cloud Run remained at generation 126, with 100% traffic to
  `mickeyf-org-build-3db9219129ee44e88daba01bcdcf9c3d`. No revision, traffic,
  SQL, IAM, scheduler or trigger configuration was changed.

The queued raw build configuration was compared with the committed image-only
recipe before approval. Commands used were `gcloud builds triggers run` with
the exact trigger/`--sha`, then `gcloud beta builds approve` for that one build.
The installed stable track has no `builds approve` command; the successful
approval was verified from the authoritative build record. Registry discovery
and direct occurrence reads followed success. Operational checker/documentation
fixes do not change the application image's pinned source commit above.

Next gate: separately approve the frozen zero-traffic revision and necessary
automation exclusions described in checklist step 2. Do not infer approval for
traffic cutover, migration or write enablement from this image-build checkpoint.

## Approved frozen zero-traffic deployment (2026-09-08)

The user subsequently approved checklist step 2, including temporary pauses of
the two canonical automatic deployment triggers. No traffic cutover, database
mutation, IAM/grant change, cleanup or scheduler action was performed.

- Deployment build: `4e24e8ec-6254-4262-a068-832699ba92ba`, approved at
  `2026-09-08T17:43:48.258676Z`; all seven steps succeeded at
  `2026-09-08T17:49:12.520244Z`.
- Dedicated source-less, approval-required trigger:
  `1c9c6502-f53f-4e04-ac9e-06bf49668acf` (`frozen-backend-receipts`). Its inline
  configuration and the pending build were compared exactly to the locally
  reviewed renderer output before approval; no source/event binding was added.
- Source/image pins are unchanged from the approved image-build review above.
  Independently resolved deployment-step SHA-256:
  `8effa287403d64d0184169a5a4a517a3b725926fee95f9f38add1dcfee8bc783`.
  The successful build's executable steps exactly matched this offline evidence.
- Ready revision: `mickeyf-org-freeze-12ec9e8eff4a493cbe8c025423e5110c`.
  Both score-submission flags are `false`; the complete runtime contract and
  provenance/scan checks passed, including the post-deployment exclusion check.
- Service generation changed from 126 to 127. The prior revision
  `mickeyf-org-build-3db9219129ee44e88daba01bcdcf9c3d` still has 100% normal
  traffic. The only added routing entry is the zero-traffic frozen test tag:
  `https://f-12ec9e8eff4a493cbe8c025423e5110c---mickeyf-org-j7yuum4tiq-uc.a.run.app`.
- Public leaderboard/database reads, unknown-game/legacy read contracts,
  anonymous authentication, Three Bosses HTTP 403 `SUBMISSION_DISABLED` and
  p4-Vega HTTP 503 `SUBMISSIONS_FROZEN` checks passed. The SDK emitted an API-
  enablement precheck warning; actual revision readiness and database reads
  succeeded, so no permission or API configuration was changed.
- After terminal success, the dedicated deployment trigger was disabled and
  canonical Stage B then Stage A were restored to their original enabled states.
  Full configurations matched the captured originals; the manual source trigger
  stayed unchanged. No pending/queued/working builds remained in either region.
  This is not the all-trigger maintenance freeze required by checklist step 3.

At deployment completion, existing-account login remained untested; anonymous
smoke alone could not accept that part of the rollback candidate. The subsequent
operator-assisted acceptance below closes that backend gate. Checklist step 3
still requires separate maintenance-freeze and traffic-plan approval. The schema
migration must not start yet.

## Existing-account backend acceptance (2026-09-08)

The operator entered an existing website account's credentials into a masked
VS Code terminal prompt, not chat or a saved credential file. The one-shot
helper pinned the exact frozen HTTPS origin and revision/image above, refused
redirects, retained TLS verification and kept the cookie jar in memory only.
The check completed successfully at `2026-09-08T18:06:15.6709583Z`:

- Anonymous `GET /auth/verify-token` returned `loggedIn: false` without a cookie.
- Existing-account `POST /api/users` login succeeded with the expected identity.
- Exactly one signed `session` cookie had Secure, HttpOnly, SameSite=None and
  Path=/ attributes, with no Domain broadening.
- The same in-memory cookie jar's `GET /auth/verify-token` returned
  `loggedIn: true` and the matching identity. No bearer token shortcut was used.
- Post-login cloud reads confirmed the same settled service generation 127 and
  exact zero-traffic tag mapping. An independent subsequent read confirmed the
  pinned image, both submission flags false and unchanged original 100% traffic.

This verifies password-column access, bcrypt/JWT issuance and the signed-cookie
backend round trip. It does not assert browser cross-site cookie compatibility.
No signup, score write, database mutation or traffic change was performed.
The retained non-secret result contains only pass/stage, UTC timestamp,
revision, image digest and test scope; the username/password/cookie are absent.
The frozen backend rollback candidate is now accepted on the existing schema;
post-migration schema/grants/read-path validation remains mandatory.

## Approved automation pause and read-only traffic plan (2026-09-08)

After backend acceptance, the user approved pausing backend deployment automation
and preparing the traffic-freeze plan. The three still-enabled triggers were
patched using only `updateMask=disabled`; the already-disabled frozen deployment
trigger stayed disabled. Full before/after comparisons confirmed no other
configuration changes:

- Stage A: `ef5a2981-95be-4f4d-af91-f997fde73356` — disabled.
- Stage B: `d71109da-8350-4f2f-a3be-2053bb6ccd45` — disabled.
- Manual image source: `648fadca-3cd1-4b57-9d35-0f62a1468443` — disabled.
- Frozen deployment: `1c9c6502-f53f-4e04-ac9e-06bf49668acf` — remains disabled.

The `us-central1` trigger inventory is empty. The planner's paginated checks
verified no pending, queued or working builds in either region. These backend
Cloud Build triggers remain paused pending controlled cutover; GitHub/Firebase
frontend workflows were not changed. If the cutover is abandoned, restore only
the captured original enabled states after checking drift: frozen deployment
must stay disabled. Do not silently leave backend deployment automation paused.

The exact existing source/deployment pins and independently reviewed steps hash
above produced the following **read-only** plan:

- Created: `2026-09-08T18:13:03.959Z`; generation `127`, with an etag-bound
  service/configuration fingerprint and exact frozen-revision fingerprint.
- Plan SHA-256: `d488bb2c40889ccfae4c72477581d5457055dfd50755e25f3bcc04c30fe84da4`.
- Before: original enabled revision at 100%, accepted frozen candidate at zero
  traffic via its `f-12ec9e8eff4a493cbe8c025423e5110c` tag.
- Proposed: exact accepted frozen revision at 100%, all revision tags removed
  (the current inventory has only that one tag).
- Not executed: no traffic PATCH, schema/data/grant changes or cleanup actions.
  Public score writes remain enabled on the old revision until traffic changes.
- Validity: five minutes from creation; an expired/drifted plan must be freshly
  generated and reviewed, never applied by bypassing the time/etag guards.

The Windows token launcher needed one fixed-command correction from `gcloud`
to `gcloud.cmd` inside its existing noninteractive PowerShell child. Timeout,
output sanitization and no-stdin behavior are preserved; execution policy was
not altered. The exact corrected token launch and live planning succeeded.
The planning invocation used `node --use-system-ca
scripts/frozen-backend-traffic.mjs plan --pins <reviewed-traffic-pins.json>
--output <new-plan.json>` so Node trusts the existing system certificate store
without disabling TLS checks. All 62 targeted rollout contracts and
`git diff --check` passed; no application/Unity rebuild was required.

Next approval can batch traffic freezing with read-only readiness/drain checks.
The freeze temporarily rejects score submissions, but preserves login and
leaderboard reads. Readiness and the mandatory old-request drain are distinct;
signup/operator sessions can still write and must be accounted for before DDL.
Database migration, grant changes and score-write enablement remain outside
this approval boundary.

## Approved traffic-only freeze and database-readiness blocker (2026-09-08)

The user approved routing all traffic to the accepted frozen backend and the
bounded read-only readiness/drain checks, excluding migration and permission
changes. A fresh plan at `18:19:24.571Z` matched the previous plan's routing,
source/deployment pins and service fingerprints exactly; only its timestamp
changed. Its SHA-256 was
`53ce1331052791c90f4a7462235302ae9f2747e8cf9429044438a6d6ddfc6283`.
The guarded command was:

```text
node --use-system-ca scripts/frozen-backend-traffic.mjs apply --plan <reviewed-plan.json> --confirm-plan 53ce1331052791c90f4a7462235302ae9f2747e8cf9429044438a6d6ddfc6283 --confirm-freeze-all-traffic
```

The etag-bound, traffic-only PATCH completed successfully. Cloud Run reported
Ready at `18:20:20.586249Z`, service generation 128, exactly 100% to
`mickeyf-org-freeze-12ec9e8eff4a493cbe8c025423e5110c`, and no revision tags.
An independent settled observation was recorded by `18:20:38Z`; this later
time is the conservative start of the old-request drain window. The complete
runtime configuration and frozen revision fingerprints are unchanged. All four
backend triggers remain disabled and no active builds were found.

The first public check passed all ten anonymous HTTP/database-read contracts:
root and unknown-game responses, anonymous auth/no cookie, catalog, both
leaderboards, both Three Bosses 403 gates, p4-Vega's 503 frozen gate, and legacy
p4 leaderboard parity. Signed-in login is the earlier accepted exact-revision
check, not a newly repeated browser test. No authenticated score write or signup
was attempted. All eight non-target revisions were listed as retired and had
300-second timeouts. These checks alone did not complete the delayed drain.

The delayed samples completed at `18:26:18.852Z` and `18:26:42.707Z`, respectively
340.852 and 364.707 seconds after the conservative settled observation. Each
rechecked exact generation/routing/configuration, frozen revision pins, all
eight retired states and timeouts, and paused automation/no active builds.
Complete paginated request-log queries found zero non-target-revision requests
with timestamps at or after `18:20:38Z`. These two samples were 23.855 seconds
apart; explicit result assertions verified zero old requests and all retired
states rather than treating successful collection as a pass. All three samples
passed ten public HTTP checks each (30 total), with identical p4-Vega and Three
Bosses response hashes throughout. This is bounded traffic/request-drain
evidence, not proof that database or external writers are idle.

At `18:23:36.091Z`, a read-only SQL probe through the verified existing Cloud SQL
proxy used the existing `michel_operator@cloudsqlproxy~%` account. Database `cms`
and server UUID `d1e6865c-ecad-11ee-a6b0-42010a400002` matched the pinned target.
The effective PROCESS probe returned `ER_SPECIFIC_ACCESS_DENIED_ERROR`, and
`@@performance_schema` was 0. Therefore neither full transaction visibility nor
instrumented metadata-lock visibility was available. No player rows were read,
no credentials were emitted or persisted, and no SQL/grant/instance mutation
was made. Existing local encrypted credentials were used only in memory through
the child process's standard input.

**Database drain remains unverified and migration is blocked.** The existing
operator must not be silently elevated, and enabling server instrumentation is
not authorized here. The next maintenance plan must resolve full activity/lock
visibility and the migration preflight's disabled-instrumentation case, then
repeat drain evidence while operators and external writers are excluded.
Signup remains writable on the frozen backend. No migration, cleanup job,
Scheduler activation or write re-enablement has occurred. The migration's
metadata-lock preflight has subsequently been hardened locally to fail closed
when instrumentation is disabled or invisible. Merely granting PROCESS would
not resolve the independently confirmed production instrumentation gap.

The dated non-secret plan and three readiness snapshots, SQL-visibility result
and one-shot probes are retained outside the repository in the operator's
`mickeyf-traffic-cutover-20260908-1819` temporary evidence folder. No production
source changed in this checkpoint; tracked changes record the rollout and
blocker in this runbook and `PROJECT_PLAN.md`. `git diff --check` passed;
application/Unity builds and unit suites were not rerun for documentation-only
changes.

## Local visibility guard verification (2026-09-08)

Receipt apply checks `@@performance_schema`, effective PROCESS through
`INNODB_BUFFER_POOL_STATS`, enabled metadata-lock instrumentation and the global
instrumentation consumer. Lost metadata-lock/thread-instance counters must be
zero both before and after reading transactions and pending locks. Missing,
denied or malformed results fail closed with sanitized errors. This does not
replace maintenance-window writer exclusion or reconstruct unrecorded locks.

Commands run from `backend`:

- `node --test -r ts-node/register ts/migrations/receiptTransition.test.ts`:
  27/27 passed, including unavailable/disabled instrumentation and lost records.
- `npm run test`: TypeScript passed.
- `npm run test:unit`: 194/198 passed. The four existing Express/body-parser
  parser checks fail with installed `qs` 6.15.3 versus locked 6.16.0. No active
  installation changes or weakened assertions were used.
- `npm run test:migrations`: 49/50 passed in the guarded disposable MySQL
  8.0.31 container, including all 19 migration tests. New refusal cases preserve
  schema, history and data; the existing successful transition test also passes.
  The unchanged runtime-grant session-drain test found an open session after
  client close. A teardown timing race is a hypothesis, not a verified cause.
  The runner removed its container and network; no production SQL was involved.

## Maintenance-access proposal (not executed)

A read-only instance description verified `cms-mickeyf` in `noted-reef-387021`:
MySQL 8.0.31, Enterprise, regional, tier `db-custom-1-3840` (3.75 GB), with no
explicit database flags returned. This tier supports `performance_schema`
without resizing. Enabling it requires a database restart and adds memory
overhead; database-backed login/leaderboards can be interrupted during restart.
Disabling it again also requires a restart. [Cloud SQL flag requirements](https://docs.cloud.google.com/sql/docs/mysql/flags).

The next approval may cover this bounded maintenance/inspection batch only:

1. Capture fresh instance settings/flags and version, backup/PITR readiness and
   active-operation state. Preserve unrelated flags and configuration when
   enabling `performance_schema`; do not clear flags wholesale. Keep the frozen
   revision, score gates and paused backend triggers unchanged. Any rollback
   restores the captured flag state with its separately understood restart.
2. Reuse an already approved maintenance identity if available; otherwise use
   an authorized administrator to create one short-lived inspector through the
   existing Cloud SQL proxy. Leave `michel_operator` and the API account alone.
   Grant only global PROCESS plus SELECT on these exact tables:
   `performance_schema.metadata_locks`, `performance_schema.setup_instruments`,
   `performance_schema.setup_consumers`, `performance_schema.global_status`.
   This inspector needs no player-table, DDL/DML, GRANT OPTION or connection-kill
   privileges. PROCESS exposes server-wide activity: collect aggregates only.
   Avoid inherited `cloudsqlsuperuser` access; use explicit SQL grants or verify
   and remove broad defaults before use. [Cloud SQL user roles](https://docs.cloud.google.com/sql/docs/mysql/users).
3. After the controlled restart, verify enabled metadata/global instrumentation
   and zero lost-record counters; keep them enabled for the entire window.
   Do not treat enabling a previously disabled instrument mid-session as
   recovery of earlier locks. Obtain fresh bounded transaction/lock and writer
   exclusion evidence; signup and external operators can still write despite
   the score freeze. [MySQL metadata-lock instrumentation](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html),
   [lost-record counters](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variables.html).
4. Close inspector sessions, remove its temporary access/account, and verify
   removal when inspection ends. Report failures instead of leaving elevated
   access silently. If no authorized administrator exists, stop for a separate
   access-bootstrap decision rather than escalating the application account.

This proposal does not authorize migration DDL, runtime-grant cutover, cleanup,
IAM/scheduler activation or score re-enablement. The migration principal and
its DDL rights require their own reviewed scope; the inspector is not that
principal. Resolve the existing grant-test failure before any grant cutover.
No instance, account, production data or traffic changes were made while
preparing this plan.
