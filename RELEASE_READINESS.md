# Release readiness and cumulative security ledger

Reconciled 2026-09-08 local (2026-09-09 UTC), against source checkpoint
`015d962e3b056b6c0aa1ad306a4ca4b94a398b79`. This is the current gate summary;
dated entries in [PROJECT_PLAN.md](PROJECT_PLAN.md) and
[RECEIPT_RETENTION.md](backend/RECEIPT_RETENTION.md) remain supporting history.
Update this ledger instead of treating superseded historical blockers as new work.

**Release is not yet approved.** After the initial Firebase audit failure,
the scoped dependency patch `3ea379fe` passed the complete non-deploying CI run
`34301221560`. The later ledger update is documentation-only; the tested source
is identified explicitly below. No PR, deployment or production mutation was
performed. CI success does not transfer an image-specific risk acceptance or
replace the outstanding real-device, browser-cookie and merge/release gates.

## Current dispositions

| ID | Status | Evidence and remaining boundary |
| --- | --- | --- |
| S1 | Fixed; dated production acceptance | Receipt migration, exact SQL runtime/operator grants, preservation checks, temporary-account removal, 64 enabled HTTP acceptance assertions and 36 promotion assertions are complete. Do not repeat migrations or synthetic-account acceptance. These are not browser-cookie tests. |
| S2 | Fixed; scoped live readback | Cloud Run remains generation/observed generation 132, with 100% intended/observed traffic to `mickeyf-org-scores-9ec1bd83-0908` and receipt image `9ec1bd83…c3c3`. Its DB/session references remain numeric versions 1/2, not plaintext values. Runtime and cleanup workers have only Cloud SQL Client in the inspected project bindings; the scheduler caller has no project binding. Each inspected secret policy grants its accessor only to the intended worker; the cleanup Job grants Invoker only to its scheduler caller. Ancestor/organization policies and SQL grants were not freshly enumerated. |
| S3 | Fixed; source and live control checks | Backend build contexts exclude local environment/dependency/generated files; Docker remains pinned, multistage and non-root. All four existing global backend build/deploy triggers are disabled; none are configured in `us-central1`. Reviewed frozen deployment/traffic guards remain. Do not re-enable triggers or route traffic as part of verification. |
| S4 | Fixed; operational acceptance | Manual cleanup/retry acceptance, hourly activation and exact first natural execution `zjpfg` succeeded. One-off follow-up was deleted. Permanent bests remain independent of receipt deletion. No extra cleanup dispatch is needed. |
| S5 | Blocked; limited verification | Complete fresh readback of three alert policies is still unavailable. Prior activation snapshots establish their configuration; only missing-success basic UI fields were refreshed during the natural-tick check. Browser retry still fails before navigation with a missing kernel-assets path. No alert failure or schedule failure is inferred. |
| S6 | Fixed in branch; not merged | At the initial reconciliation, 13 of 14 open default-branch dependency alerts mapped to fixes already in branch locks: eight `fast-uri` alerts (3.1.7), two `qs` alerts (6.16.0), three `xmldom` alerts (0.8.15 / 0.9.12). This alert-to-lock comparison is distinct from the subsequent CI audit findings in S12. |
| S7 | Accepted; bounded and expiring | Deployment-only `stream-json` 1.9.1, GHSA-528h-pc64-c93x, remains under the owner's static-Hosting-only exception through 2026-10-07 or earlier reassessment triggers. Firebase 15.28.1, locked install, high audit gate and eight-minute deployment timeout remain. No import/framework pipeline expansion or major override is accepted. |
| S8 | Accepted; bounded and expiring | On 2026-09-08 local (2026-09-09 UTC), the owner explicitly approved the exact receipt-image exception recorded below through 2026-10-07, subject to earlier reassessment triggers. Verified OCI manifests/configurations share the Node base layers; no affected call chain was identified in the examined API/cleanup source. This is risk acceptance, not an OpenSSL fix, transfer of an earlier exception, or approval for a replacement image/deployment. Clean OS/NPM/SECRET scans still do not certify the embedded component. |
| S9 | Fixed; tested CI checkpoint | Authorized non-deploying run `34301221560` passed both jobs on `3ea379fe`: dependency validation/audits, frontend tests/build, WebGL package/tooling checks, backend unit/MySQL integration tests/build, docs watcher tests/docs build and Unity static integrity. All reported test summaries had zero skips. This supersedes failed run `34300667096`; it is not a Unity rebuild or a browser/device test. A PR with required checks/CodeQL on its eventual merge head remains a separate gate. |
| S10 | Fixed controls; limited scan coverage | Main ruleset requires PR/thread resolution, strict Web/Unity checks and CodeQL errors/high-or-higher protection, with no bypass actors. Zero open code/secret-scanning alerts were observed; main CodeQL evidence covers `2bffc0db`, not this branch. Push protection is enabled; non-provider patterns and validity checks are disabled. Zero alerts is not proof that no secret exists. |
| S11 | Deferred; local maintenance | Active backend install still has `qs` 6.15.3 versus locked 6.16.0. Isolated locked tests already passed. Refresh only during a deliberate development-stack stop; do not use the stale install as release evidence or modify running dependencies silently. |
| S12 | Fixed; deployment-only dependency patch | `3ea379fe` updates exactly four lock entries: `js-yaml` 4.3.2, `hono` 4.13.7, `morgan` 1.12.0 and Firebase-scoped `csv-parse` 7.0.2. Firebase stays 15.28.1. Fresh locked install, full production dependency-tree validation, CLI version check, eight offline CSV tests and twelve smoke-tool tests pass. Audit now has zero high/critical and only the two previously accepted stream-json/parent moderate entries. No unrelated finding was waived or threshold lowered. |
| R1 | Fixed; certified local candidate | Package `2e660337…a7fe7` remains the certified 996-file Unity candidate from `8eaa6615`. Unity source and frontend runtime have not changed since that source checkpoint. Candidate packaging/hash checks, local header simulation and signed-out Chrome startup passed previously. No source-driven rebuild is required by this reconciliation. |
| R2 | Blocked; candidate browser/device evidence | Still missing: current-candidate HTTPS browser-cookie login/submission/exact retry/PB/leaderboard round trip; uncached physical Safari loading; exact-16:9 Fire invisible-hit-area clearance; exhaustive ten-weapon/21-clip evidence. Backend HTTP acceptance and warm-cache/normal-route checks do not certify these narrower cases. |
| R3 | Fixed; accepted owner checks | Keep closed: Android/iPhone normal routes and recorded defeat/retry/menu checks; touch controls; mute persistence; automatic/combined pause; complete outcome-centering audit; accepted fullscreen-button placement and Safari toolbar limitation; recovered desktop FPS incident. No blanket replay of these checks. |
| R4 | Blocked; publication decisions | Public mobile gameplay remains disabled outside the DEV-only preview. Backend score-write activation did not change that gate. Main merge, publishing, mobile enablement and any hosted candidate preview require their own scoped approval; verify actual new-package CDN bytes/headers/compression after approved delivery. |
| M1 | Fixed; named scope | Named temporary-artifact cleanup and the 57-script bounded audit are complete. Recycled copies remain recoverable; intentional verification/recovery archives remain. Do not reopen an unlimited package/filesystem audit. |
| M2 | Deferred; explicit follow-ups | Shared-shell device checks (landscape nav/dropdowns with browser bars; Dancing Circles aspect/color) remain distinct from Three Bosses gameplay. Also retain the large-chunk warning, Unity CLI/Pipeline compatibility follow-up and unmeasured DB instrumentation overhead. p4-Vega polish and the incremental Clean Code sweep follow this release phase. |

## Exact dependency interpretation

The initial GitHub snapshot reported 14 default-branch alerts: nine high, five medium.
Alert #288 was added on September 8 for precisely xmldom 0.9.11; this branch
already has the patched 0.9.12. The opt-in serializer semantics are unchanged;
the patch is not a claim that arbitrary untrusted DOM serialization is safe.
[Primary advisory](https://github.com/advisories/GHSA-jxjr-3g7g-3944).

The sole remaining GitHub alert from that snapshot in the reviewed locks was #287,
[stream-json GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x).
The earlier npm audit's two moderate package entries (library plus parent) are
not two separate GitHub advisory alerts. Reassess on compatible upstream
remediation or changes involving imports, framework builds, untrusted JSON,
CLI/configuration/workflow scope, and no later than the exception's expiry.
The inspected Hosting scope/configuration has not changed since acceptance.

`stream-json` is Firebase CLI tooling for incremental JSON processing. Its
installed callers handle Auth-user JSON imports, Realtime Database imports and
Next.js framework dependency parsing. This project publishes static
`frontend/dist` files; those processing paths are outside the reviewed Hosting
workflow. The library is absent from the root/frontend/backend lockfiles but
remains a declared Firebase CLI dependency, so deleting its installed files is
not a supported remediation. [Library documentation](https://github.com/uhop/stream-json).

### Authorized CI checkpoint: 2026-09-09 01:49 UTC

[Run 34300667096](https://github.com/Good-Loops/mickeyf.com/actions/runs/34300667096)
checked `cd347db91edfc62541e793c824e0251407cc648d` using `pr-ci.yml`.
The failure was `npm --prefix .github/firebase-deploy audit --audit-level=high --omit=dev`,
not a production deployment or an application test failure. Unity static checks
passed; all web validation after the audit was skipped, including MySQL integration,
packaged WebGL validation, frontend/backend builds and documentation tests/builds.

The locked `js-yaml` 4.3.1 falls in the high-severity advisory's affected range;
4.3.2 is the patched v4 release. The advisory was added to GitHub's database on
September 8, so the preceding default-branch alert comparison did not establish
the latest audit result. [Primary advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
The additional moderate entries require their own review; the previously accepted
stream-json risk is not a blanket waiver. No dependency changes, audit-threshold
changes, forced fixes, local installs or production actions were made in this run.

### Scoped remediation: `3ea379fe`

The isolated `.github/firebase-deploy` install was refreshed using Node 22.23.2
and npm 11.6.2 with `npm ci --ignore-scripts --no-audit --no-fund`. No separate
temporary install copy was created; frontend/backend installs and servers were
not changed. YAML, Hono and Morgan patches stay within their parent ranges.
CSV's exact override is scoped to `firebase-tools@15.28.1`, not every consumer.
Firebase 15.29.0 still requests CSV v5; no patched v5/v6 release was available.
[CSV advisory](https://github.com/adaltas/node-csv/security/advisories/GHSA-8cw4-87c7-c6xx),
[Firebase caller](https://github.com/firebase/firebase-tools/blob/v15.28.1/src/commands/auth-import.ts#L63),
[CSV changelog](https://github.com/adaltas/node-csv/blob/master/packages/csv-parse/CHANGELOG.md).

The permanent `csv-parse-compat.test.mjs` resolves CSV from Firebase's actual
caller without executing `auth:import`. It covers default array-record streams,
UTF-8/chunk boundaries, LF/CRLF, quoting, empty fields, malformed-input errors
and duplicate-`__proto__` safety. Seven compatibility cases passed with old
CSV 5.6.0 while the security regression failed; all eight pass with 7.0.2.
Both PR CI and Hosting dependency validation now run these tests. They do not
authorize or claim a live auth import. Static Hosting scope, CLI pin, audit
threshold, timeout and existing stream-json disposition are unchanged.

Local commands passed: `node --test .github/firebase-deploy/csv-parse-compat.test.mjs`,
`npm --prefix .github/firebase-deploy run test:three-bosses-webgl-smoke`,
`npm --prefix .github/firebase-deploy ls --omit=dev --json`,
`npm --prefix .github/firebase-deploy audit --audit-level=high --omit=dev --json`,
and the Firebase CLI version check. Both edited workflows parse as YAML and
`git diff --check` passes. Existing upstream deprecation warnings for `json-ptr`,
`node-domexception` and `glob` remain separate maintenance notes; they are not
new findings in the passing audit or justification for a broad dependency update.

[CI run 34301221560](https://github.com/Good-Loops/mickeyf.com/actions/runs/34301221560)
completed successfully at 2026-09-09 01:59:52 UTC on
`3ea379fe1db4e3818e61b55ad828585d9e6f7f08`. Both `Web audit, test, and build` and
`Unity source integrity` passed. The frontend large-chunk warning remains;
the docs-watcher test uses Node's experimental MockTimers API. Neither warning
was suppressed or turned into additional unrelated work. Documentation-only
recording after this run does not claim a new tested SHA or require repeating
unchanged application checks merely to update this ledger.

## Embedded OpenSSL: no automatic carry-forward

The most recent historical exception covered image
`sha256:3bba5ca29a474c6b75d92f48f93a9efc6cfa3fe32d3a4ddb7b82f2a610baaa48`.
Current receipt image is
`sha256:9ec1bd83ea73a283ad36961b2dcd3022b9b0a40cbf16bd725398ff562015c3c3`.
Its Dockerfile/base pin is unchanged, but backend dependencies and code changed.
The refreshed component/reachability evidence for this exact image follows.
Do not interpret approval of migration/promotion or of this review as an
unrecorded security waiver.

The official release index still lists Node **22.23.2**, dated **2026-07-28**,
with embedded OpenSSL **3.5.7** as the latest published Node 22 release.
A normal Node 22 patch bump therefore does not yet provide OpenSSL 3.5.8.
[Node distribution index](https://nodejs.org/dist/index.json).
Alpine's separately patched shared libraries are not Node's embedded copy.
OpenSSL 3.5.8 security fixes remain relevant to this component review;
[official release notes](https://www.openssl-library.org/news/openssl-3.5-notes/index.html).
The old note calling Node PR #65542 open is historical; its closure alone does
not prove a new Node 22 release exists. Do not introduce an unreviewed custom
Node build or silently transfer the old exception.

### Exact receipt-image review: 2026-09-09 UTC

Read-only Cloud Run inspection reconfirmed generation/observed generation 132,
100% intended/observed traffic to the receipt revision and container HTTP port
8080. Global Cloud Build `12ec9e8e-ff4a-493c-be8c-025423e5110c` reports SUCCESS,
resolved Git revision `d1d5dbf6fcc1bedd596827a540779f437fe3501f` and the exact
receipt digest above. No revision, traffic, flag, grant or data was changed.

Both OCI manifest and configuration bodies were fetched through the existing
authenticated read-only registry access and independently SHA256-verified.
The current and prior images are Linux/amd64, declare Node 22.23.2, run as
`node`, and share the first four compressed layer digests byte-for-byte. Their
Node installation layer is
`sha256:efbef6f9e333972a10ca323e700496a64e7ddcc3a6725e6afbbae52e690f4a4a`
(the earlier roadmap abbreviated this digest incorrectly). Both exact sources
have Dockerfile blob `2b3c60894c2a73e701230482f3b722a72e017725`; later layers
differ. This establishes base-component identity, not a new deployed-binary
execution or a complete native-addon inventory.

Comparing prior source `e91d3b1177932614c22fbed059a42a05fcb10793` to the resolved
receipt source found no new runtime package among 103 non-dev lock records;
the only production version delta is `qs` 6.15.3 to 6.16.0. `fast-uri` changes
are dev-only. New run tickets use HMAC-SHA256/HS256; the API remains an Express
HTTP listener, and API/cleanup production database connections use a Cloud SQL
socket rather than application-configured TLS. JWT key normalization can call
`createPublicKey`, but key material is server-owned, not supplied by requests.
No caller for QUIC, DTLS, RPK, CMS, CMP or cipher/decipher APIs was identified
in the reviewed application paths. Those capabilities must not be described
as absent from the bundled OpenSSL binary.

| Reviewed family | Application prerequisite and current boundary |
| --- | --- |
| QUIC: CVE-2026-18798, -14456, -63075 | OpenSSL QUIC endpoints/connection processing; not identified in the HTTP API or cleanup path. |
| DTLS: CVE-2026-54874 | DTLS handshake records; no DTLS listener/caller identified. |
| RPK: CVE-2026-14457 | Explicit raw-public-key configuration without the corresponding certificate; no such configuration identified. |
| CMS: CVE-2026-63072 | CMS message decryption/key unwrapping; no CMS processing identified. |
| CMP: CVE-2026-63076, -63073, -63074 | CMP message protection/response/server-context handling; no CMP endpoint or message processing identified. |
| AEAD: CVE-2026-75803 | Affected direct one-shot `EVP_Cipher()` finalization. Reviewed Node wrappers use Update/Final; application uses HMAC/hash rather than cipher calls. |

Prerequisites: official [August 25 advisory](https://openssl-library.org/news/secadv/20260825.txt)
and [August 13 advisory](https://openssl-library.org/news/secadv/20260813.txt).
Pinned Node [cipher wrapper](https://github.com/nodejs/node/blob/v22.23.2/deps/ncrypto/ncrypto.cc)
and [HMAC implementation](https://github.com/nodejs/node/blob/v22.23.2/src/crypto/crypto_hmac.cc)
support the API distinction; it is not an upstream guarantee of non-exploitability.

CCM remains a separate caveat: Node supports it and requires exactly one
`update()` call. A synthetic probe on local Windows Node 22.23.2/OpenSSL 3.5.7
accepted an arbitrary CCM tag when Update was omitted and rejected it when an
empty Update was supplied. This is not a deployed-Linux-image test or proof of
CVE-2026-75803 exposure; no application cipher/decipher caller was identified.
Do not assume an OpenSSL-only patch fixes Node's skipped-finalization path.
[Node CCM contract](https://nodejs.org/download/release/v22.23.2/docs/api/crypto.html#ccm-mode).

**Owner-approved bounded exception:** on **2026-09-08 local (2026-09-09 UTC)**,
the owner explicitly approved retaining only receipt image
`sha256:9ec1bd83ea73a283ad36961b2dcd3022b9b0a40cbf16bd725398ff562015c3c3`
under an exception through **2026-10-07**, with earlier reassessment when
a patched supported Node release is available, this image/relevant code/runtime
dependencies/configuration change, or a relevant advisory/incident appears.
Introducing native addons, FFI, custom providers or affected cipher/protocol
features also invalidates the present scope. The conclusion is limited to
"no affected call chain identified in the examined application," not "OpenSSL
is fixed/unused". This is a new, exact-image risk acceptance, not a transfer of
an earlier exception. It does not authorize a replacement image, new deployment,
traffic changes or publication. Reassessment is required by expiry or an earlier
trigger; no unchanged source/component review is needed before then.

Non-secret OCI hashes, metadata and scope limitations are retained outside Git
in `release-checks-20260907/receipt-openssl-review-20260908.json`. No image layers
were pulled or executed; no production requests, secret payload reads, rebuild,
scan, deployment or complete image-wide native inventory were performed.

## Next execution order and authority

1. Retry only the bounded S5 policy readback when the existing browser/tool
   connection works; no SDK installation or permissions expansion is needed
   merely to repeat a failed verification. Keep the approved S8 disposition
   closed unless its expiry or an earlier reassessment trigger applies.
2. Arrange only R2's missing candidate checks on an approved HTTPS test route;
   scope any disposable account/score lifecycle separately. Keep accepted R3
   checks closed. A development-only mobile preview is not proof of an enabled
   production mobile route.
3. Resolve or explicitly disposition all remaining gates before requesting
   publication/mobile approval, then verify hosted delivery. A PR and current
   CodeQL/required checks remain necessary for its eventual merge head; the
   completed standalone CI is not merge approval. No main merge, deployment,
   dependency refresh or cloud mutation is implied by this ledger.

Accepted operational limits remain: expired receipt IDs lose historical retry
recognition; failures/backlog can extend retention; expired receipts require a
separately reviewed backup restore; traffic etags/trigger checks are not a
distributed IAM lock. Use a controlled maintenance window for later mutations.

## Verification record

The initial reconciliation used read-only Git/GitHub state, manifest/source/history
comparisons, selected Cloud Run/trigger/secret-IAM/project-role reads and official
upstream metadata. Secret payloads were not read; only configuration metadata and secret
references were inspected. No fresh SQL query,
image build/scan, full transitive-IAM audit, npm audit, application test or
physical-device session is claimed for that initial checkpoint. The later CI
run's exact audit/static-check coverage and skipped steps are recorded above.
`git diff --check` covers the documentation
changes. Non-secret snapshots are retained outside Git in the existing Codex
`release-checks-20260907/release-gates-20260908.json` evidence file.
