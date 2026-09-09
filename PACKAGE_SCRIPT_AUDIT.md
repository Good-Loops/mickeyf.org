# Package script audit — bounded first pass

Reviewed on 2026-09-08 against `79daf4a2`, before any script changes.
Scope: all four tracked first-party `package.json` files. Dependencies, generated
output and vendored packages are excluded. This is a static usage audit, not a
claim that every command was executed successfully.

## Applied consolidation — 2026-09-08

The owner approved the next batch after the first-pass checkpoint `249d0b93`.
Removed only the frontend and backend `docs:json` aliases. The root
`docs:json:frontend`, `docs:json:backend` and aggregate `docs:json` commands,
TypeDoc configurations and public entrypoints are unchanged. No tracked callers
needed repair; the README now gives the root replacements and correctly
distinguishes `docs:dev` from the initial-build `docs:dev:fresh` variant.

Current script count: **59** (root 33, frontend 5, backend 19, Firebase 2).
The **61-script inventory below is the historical first-pass baseline**; its two
consolidation candidates are now completed. The receipt-cleanup conveniences
and watcher-overlap decision remain open; their commands/behavior are untouched.
Validation used JSON/structural assertions, a focused caller check and Git diff
checks, not a documentation build, install, server restart or application test.

## First-pass result and proposed batch (historical)

| Manifest | Scripts | Keep | Consolidate | Needs confirmation | Remove outright |
| --- | ---: | ---: | ---: | ---: | ---: |
| Root | 33 | 32 | 0 | 1 | 0 |
| Frontend | 6 | 5 | 1 | 0 | 0 |
| Backend | 20 | 17 | 1 | 2 | 0 |
| Firebase deployment | 2 | 2 | 0 | 0 | 0 |
| **Total** | **61** | **56** | **2** | **3** | **0** |

Recommended small follow-up batch:

1. Consolidate the frontend and backend `docs:json` shortcuts into the already
   existing root `docs:json:frontend` and `docs:json:backend` commands. Both local
   shortcuts run `typedoc --options typedoc.json`; the root commands use the same
   configuration, TypeScript configuration and JSON destination. CI/editor
   documentation workflows already use the root pipeline. No callers of the two
   local shortcuts were found. Keep both TypeDoc configurations and all public
   entrypoints. A standalone manual habit is the only unresolved reason to retain
   those aliases; absence of callers alone is not proof of disuse.
2. Decide whether to retain/document the two backend `receipts:cleanup` aliases
   as manual operator conveniences. Neither alias has a repository caller or
   documented invocation. The actual cleanup implementation must stay: the
   Cloud Run Job invokes `node dist/submission-receipt-cleanup.min.js` directly.
   `receipts:cleanup:local` executes TypeScript source; its name does **not**
   guarantee a local/disposable database. Do not execute either during cleanup.
3. Keep `docs:watch`, but handle its documented overlapping rebuilds in a separate
   focused change (serialize/coalesce rebuild requests). Correct the README's
   claim that `docs:dev` performs an initial build: `docs:dev:fresh` is the command
   that explicitly does so. This is a workflow defect, not an unused-script case.

No script is removed by this audit. Required release, migration, recovery and
verification commands are not disposable simply because they run infrequently.

## Complete first-pass inventory (historical)

The linked manifests are the authoritative command definitions; each script is
listed below with its purpose and disposition.

### Root — 33 scripts

Source: [package.json](package.json).

| Disposition | Scripts | Purpose / usage |
| --- | --- | --- |
| Keep | `infra:up`, `infra:down` | Start/stop the documented local Cloud SQL proxy Compose service. |
| Keep | `backend:dev:local`, `frontend:dev:local` | Supervised development stacks; README and VS Code consumers; frontend `dev` delegates here. |
| Keep | `three-bosses:webgl:build`, `three-bosses:webgl:release:build` | Documented development/release build entrypoints, with distinct build modes. |
| Keep | `three-bosses:webgl:package`, `three-bosses:webgl:release:validate` | Package and validate the release contract. |
| Keep | `three-bosses:webgl:hosting:verify`, `three-bosses:webgl:preview:smoke` | Hosting delivery checks and browser smoke verification; deployment CI consumes the tooling. |
| Keep | `three-bosses:webgl:serve` | Serve the local WebGL artifact; used by the frontend development stack. |
| Keep | `test:three-bosses-webgl-build`, `test:three-bosses-webgl-package`, `test:three-bosses-webgl-server`, `test:three-bosses-webgl-hosting`, `test:three-bosses-webgl-smoke` | WebGL tooling contracts, wired into PR CI directly or through the Firebase package. |
| Keep | `test:cloudbuild-candidate`, `test:frozen-backend`, `test:receipt-cleanup` | Deployment/receipt-job contract checks used by PR CI. |
| Keep | `docs:clean`, `docs:json:frontend`, `docs:json:backend`, `docs:json`, `docs:assets`, `docs:build`, `docs` | Explicit documentation pipeline used by CI and editor workflows; granular stages also support troubleshooting. |
| Keep | `docs:serve`, `docs:dev`, `docs:dev:fresh` | Serve/watch documentation, with an explicit initial-build variant. |
| Needs confirmation | `docs:watch` | Active documentation watcher; retain the command and agree a bounded overlap-handling fix, not deletion. |
| Keep | `hooks:install`, `test:unity-yaml-normalizer`, `unity:yaml:normalize-staged` | Documented Git hook setup, staged Unity YAML normalization and its contract test. |

Evidence: [VS Code tasks](.vscode/tasks.json),
[terminal definitions](.vscode/restore-terminals.json),
[README](README.md), [PR CI](.github/workflows/pr-ci.yml),
[hosting workflow](.github/workflows/firebase-hosting-merge.yml),
[documentation workflow](.github/workflows/docs.yml),
[pre-commit hook](.githooks/pre-commit), and the recorded watcher overlap in
[receipt-retention verification](backend/RECEIPT_RETENTION.md).

The root smoke wrappers delegate to the separate Firebase package that owns the
browser dependency; these are package-boundary entrypoints, not duplicate test
implementations. `hooks:install` is explicit, not an automatic npm lifecycle hook.

### Frontend — 6 scripts

Source: [frontend/package.json](frontend/package.json).

| Disposition | Script | Purpose / usage |
| --- | --- | --- |
| Keep | `dev` | README/VS Code entrypoint into the root supervised development stack. |
| Keep | `dev:vite` | Vite-only process used by the root stack; also permits independent recovery without recursively starting that stack. |
| Keep | `test` | TypeScript check plus nine explicit Node test files; PR CI and VS Code invoke it. |
| Keep | `build` | Vite production build used by PR CI and Firebase deployment. |
| Keep | `preview` | Manual built-artifact preview; Vite configuration specifies port 4173. No automated caller is required for this useful manual entrypoint. |
| Consolidate | `docs:json` | Redundant local TypeDoc shortcut; proposed canonical replacement is root `docs:json:frontend`. |

Evidence: the workflows/editor references above,
[Vite configuration](frontend/vite.config.ts), and
[TypeDoc configuration](frontend/typedoc.json). The TypeScript configuration,
all nine test targets, HTML/Vite entrypoints and four public documentation
entrypoints exist. The VS Code task named “Frontend: typecheck” also runs those
tests; its label is only a minor naming mismatch.

### Backend — 20 scripts

Source: [backend/package.json](backend/package.json).

| Disposition | Scripts | Purpose / usage |
| --- | --- | --- |
| Keep | `test`, `test:unit`, `test:migrations`, `prod` | Separate typecheck, unit, database-integration and production-bundle commands; all invoked by PR CI, with `prod` also used by Docker. |
| Keep | `watch`, `dev` | Build watcher and server process used by the root development stack/VS Code. |
| Keep | `migrations:plan`, `migrations:apply` | Documented schema planning and additive migration operations. |
| Keep | `migrations:p4-drop:plan`, `migrations:p4-drop:apply`, `migrations:p4-drop:verify` | Supported historical pre-drop backup replay and its reconciliation safety checks. |
| Keep | `runtime-grants:plan`, `runtime-grants:verify`, `runtime-grants:apply` | Documented runtime grant maintenance and drift verification. |
| Keep | `migrations:receipts:plan`, `migrations:receipts:apply`, `migrations:receipts:verify` | Guarded receipt-transition planning, application and verification/recovery. |
| Consolidate | `docs:json` | Redundant local TypeDoc shortcut; proposed canonical replacement is root `docs:json:backend`. |
| Needs confirmation | `receipts:cleanup`, `receipts:cleanup:local` | Manual compiled/source cleanup conveniences; production uses the compiled entrypoint directly, not these aliases. |

Evidence: [README maintenance commands](README.md),
[Dockerfile](Dockerfile), [backend build configuration](backend/webpack.config.js),
[leaderboard recovery contract](backend/LEADERBOARD_DESIGN.md),
[receipt-transition runbook](backend/RECEIPT_RETENTION.md),
[cleanup job template](.github/receipt-cleanup/cloud-run-job.template.json), and
[TypeDoc configuration](backend/typedoc.json).

All explicit source/configuration targets exist, including 31 unit-test files,
six integration-test targets selected by the migration test runner, and its
Compose input. Both generated bundle targets also existed when inspected.
No cloud backup inventory was refreshed: keeping recovery tooling follows the
currently documented support contract, not a new claim about live backups.

### Firebase deployment — 2 scripts

Source: [.github/firebase-deploy/package.json](.github/firebase-deploy/package.json).

| Disposition | Script | Purpose / usage |
| --- | --- | --- |
| Keep | `three-bosses:webgl:preview:smoke` | Deployment/browser smoke checks, with the browser dependency isolated in this package. |
| Keep | `test:three-bosses-webgl-smoke` | Smoke-tool contract tests used by root verification/PR CI. |

Both referenced files exist. Preserve the independent deployment package boundary.

## Verification boundary

Used tracked-file inventory, manifest/configuration reads, target existence
checks and scoped reference searches across source, workflows, hooks, editor
tasks and documentation. Nested npm references resolve. None of the four
manifests declares automatic pre/post/install lifecycle scripts.

No dependencies installed, package scripts executed, tests/builds run, servers
restarted, database/cloud changes made, or package/lockfile edits performed.
No `node_modules` contents were searched as part of this script audit. The
separate disposable-folder cleanup used filesystem metadata to check safety.
