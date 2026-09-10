# Ludolume iOS cloud builds

## First stage: unsigned simulator compilation

`.github/workflows/ios-build.yml` is manual-only. It uses a standard GitHub-hosted
macOS 26 runner with Xcode 26.6, the existing CocoaPods project, and locked npm
dependencies. It builds the web assets, synchronizes Capacitor, then compiles the
shared `App` scheme with signing disabled. It does not deploy the website, change
the backend, contact Apple to publish, or use Apple credentials.

The workflow was activated on the repository's default branch (`main`) by
approved PR #330 on 2026-09-10. That PR contained only the workflow and signing
ignore rules. Merging the full development branch also carries its website/auth
changes and can trigger website deployment; that remains separate approval.

The renamed workflow is **Ludolume iOS simulator build (manual)**. GitHub's
Actions listing may retain its original title until this workflow-only rename
reaches `main`; this does not authorize merging the full development branch.
Select **Run workflow** and choose the reviewed branch. The stable filename
also allows the equivalent command:

```sh
gh workflow run ios-build.yml --repo Good-Loops/mickeyf.com --ref <reviewed-branch>
```

The result is an unsigned simulator `.app` in a ZIP, retained for one day.
Xcode diagnostics are retained for one day on failure. This is **not an IPA**,
cannot be installed on a physical iPhone, and is not a TestFlight build.
Successful compilation is not proof of working WKWebView authentication,
microphone/audio permissions, packaged Unity assets, or native gameplay.

First cloud compile verified on 2026-09-10:
[run 34494943864](https://github.com/Good-Loops/mickeyf.com/actions/runs/34494943864),
development commit `aa83270262ce579826eab79bc85ee55f85139da9`. TypeScript and all
202 frontend tests, Vite build, Capacitor/CocoaPods synchronization, unsigned
Xcode simulator compilation, packaging and artifact upload passed. The uploaded
ZIP was 57,907,439 bytes and expires after one day. Windows still cannot run this
Xcode build locally, and no simulator/device runtime test is claimed.

The first compile predates the owner-approved bundle ID correction to
`com.mickeyf.app`. The correction was checked across Capacitor, both parsed
Xcode build configurations, Android's namespace/application ID, Java activity
path/package, XML resources and instrumented-test expectation. No fresh native
compile or device test was run just for this identifier change.

Non-failing upstream/tooling warnings were retained rather than patched inside
dependencies: Capacitor's Swift closure capture, the runner's Metal-toolchain
search path, optional App Intents metadata, CocoaPods script dependency analysis,
and the artifact action's Node runtime/deprecation notices. The build completed;
these are not evidence of native runtime correctness or a clean warning-free build.

Native artwork sources, generation prompts and export instructions are in
`../resources/README.md`. The iOS icon is opaque and the launch screen uses one
shared celestial image; its navy background avoids a white reveal. This is the
OS launch screen, not an added timed loading overlay.

## Next stage: signed TestFlight builds

The GitHub `ios-testflight` environment was created and read back on 2026-09-10:

- Only the branch `improvement/clean-code-sweep` is allowed (no tag rule).
- `Good-Loops` is a required reviewer. Self-review remains available because the
  owner also starts manual runs; otherwise a sole operator could not approve them.
  The owner should review the exact source commit in GitHub before approving a
  signing run. This is a release checkpoint, not two-person separation of duties.
- No Apple secrets or variables have been stored, and no signed/upload workflow
  has been enabled. Creating this environment does not start a build or publish.
- When rolling the active branch, explicitly update its exact branch policy;
  do not replace it with a broad wildcard to work around a blocked run.

Keep signing credentials in this environment, not repository-wide secrets:

| Planned secret | Purpose |
| --- | --- |
| `IOS_DISTRIBUTION_P12_BASE64` | Distribution certificate and its private signing key |
| `IOS_DISTRIBUTION_P12_PASSWORD` | Password protecting that signing identity |
| `IOS_PROVISION_PROFILE_BASE64` | Apple profile authorizing this app ID and certificate |
| `ASC_PRIVATE_KEY_P8` | App Store Connect API authentication key |

Team ID, API key ID, issuer ID and the numeric App Store Connect app ID are
non-secret identifiers to confirm from Apple. Generate the temporary runner
keychain password per job; never expose keys through logs or public artifacts.
Apple Developer registration was verified on 2026-09-10: explicit bundle ID
`com.mickeyf.app`, description `Ludolume`, team `AX4Z7T24C9`. No optional
capabilities were enabled. After the original listing name was rejected, Apple
accepted the owner-selected name Ludolume and created its App Store Connect record:

- Apple app ID: `6810735137`.
- Platform/language: iOS, English (U.S.).
- SKU: `ludolume-ios`.
- Status: Prepare for Submission; no binary upload, review submission or release.

The on-device display name is Ludolume. Apple Developer's Identifiers list
confirmed the renamed description; App Store Connect's bundle selector still
showed the previous description after refresh. The underlying identifier is
unchanged. Google Play registration remains separate.

Before adding a signing/upload job:

1. Use the existing Ludolume App Store Connect record (`6810735137`) and
   registered `com.mickeyf.app` bundle ID; do not create a duplicate record or
   change the identifier to refresh its displayed description.
2. Configure a protected GitHub environment with approved release branches and
   manual review. Keep Apple credentials out of repository-wide build jobs and
   untrusted pull-request code.
3. Supply an Apple Distribution signing identity (`.p12` plus password), matching
   App Store provisioning profile, and appropriately scoped App Store Connect
   API key/issuer/key ID through protected secret storage. Never commit or paste
   private signing keys into chat. The ignore rules are only a safety net.
4. Add a separately approved signed archive/export/upload job, with unique build
   numbers and temporary-keychain cleanup. Uploading to TestFlight does not
   authorize public App Store submission or release.
5. Check the signed build on the owner's iPhone, including native auth/session,
   audio permissions and gameplay. Preserve the PWA and Android tracks.

Standard runner compute is free for public repositories. Private repositories
use their plan's included allowance, then paid usage; storage has separate
allowances. The manual trigger, 30-minute job timeout, no dependency cache, and
one-day artifact retention limit incidental usage. They are not an account-wide
spending cap. Never buy larger runners or change billing limits implicitly.

References checked 2026-09-10:
[Capacitor requirements](https://capacitorjs.com/docs/getting-started/environment-setup),
[GitHub manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[GitHub Apple signing](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications),
[runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing).
