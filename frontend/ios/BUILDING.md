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

The renamed workflow is **Ludolume iOS build (manual)**. GitHub's
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

The same manual workflow now has an `upload_testflight` boolean, defaulting to
`false`. The default remains the unsigned simulator job. Selecting `true` uses
the signed job only on `improvement/clean-code-sweep` and requires approval of
the `ios-testflight` environment. No push or pull-request event uploads a build.
The helper `scripts/ios-testflight.mjs` is dedicated to this job: it checks the
app/team/profile/certificate, assigns a unique build number, archives an iPhone
app, exports an internal-only TestFlight IPA and uploads through Apple's tool.
It removes temporary signing material and signed outputs; neither is uploaded
as a public Actions artifact. Tool checks on Windows do not prove macOS signing.

The first protected run, `34504646121`, stopped at uploader preflight before
dependencies, signing credentials or uploads were used: `altool --help` did not
list `--bundle-id`. The helper now uses the already-verified IPA metadata instead
of duplicate bundle/version command-line overrides, and Apple's documented
`./private_keys/AuthKey_<key-id>.p8` lookup inside its owned temporary directory.
Preflight checks the flags from the actual upload command, not a separate list.
This was not a certificate rejection or an Apple upload failure.

Run `34505161671` then passed uploader preflight, locked web tests/build, native
synchronization, signing-identity import, iPhone archive/export, IPA metadata,
deep signature verification and embedded-profile matching. It stopped while
extracting the signing certificate: the optional `codesign --extract-certificates`
prefix was passed separately, making it another input path. The helper now uses
`--extract-certificates=<prefix>` and retains the leaf-certificate comparison.
Cleanup passed. No upload was attempted; the corrected extraction and subsequent
Apple upload still need runner verification.

The GitHub `ios-testflight` environment was created and read back on 2026-09-10:

- Only the branch `improvement/clean-code-sweep` is allowed (no tag rule).
- `Good-Loops` is a required reviewer. Self-review remains available because the
  owner also starts manual runs; otherwise a sole operator could not approve them.
  The owner should review the exact source commit in GitHub before approving a
  signing run. This is a release checkpoint, not two-person separation of duties.
- The Developer-role team API key is stored as `ASC_PRIVATE_KEY_P8`, with its
  non-secret identifiers in environment variables. The signed/upload path is
  prepared but has not yet completed a signing run. Configuring credentials
  does not start a build or publish.
- When rolling the active branch, explicitly update its exact branch policy;
  do not replace it with a broad wildcard to work around a blocked run.

Keep signing credentials in this environment, not repository-wide secrets:

| Secret | Purpose/status |
| --- | --- |
| `IOS_DISTRIBUTION_P12_BASE64` | Configured: encrypted distribution identity, including Apple G3 intermediate |
| `IOS_DISTRIBUTION_P12_PASSWORD` | Configured: randomly generated identity password |
| `IOS_PROVISION_PROFILE_BASE64` | Configured: active App Store profile for this app ID and certificate |
| `ASC_PRIVATE_KEY_P8` | Configured: App Store Connect API authentication key |

Distribution credentials created with owner approval on 2026-09-10:

- Certificate `Q4FS72TU6B`, Apple Distribution, team `AX4Z7T24C9`, expires
  2027-09-10. Its public key matches the encrypted local RSA private key and
  its signature verifies against Apple's G3 intermediate.
- Profile `Z392C733U4`, **Ludolume App Store 2026-09-10**, UUID
  `e312aedc-9b44-4464-8ce9-0e0f0fb39c0a`, expires 2027-09-10. Its CMS signature,
  exact application identifier, non-development entitlements and matching
  distribution certificate were checked before storage.
- Chrome blocked certificate downloads both manually and through browser
  automation. Apple's official certificate/profile GET endpoints returned
  HTTP 200 using the existing Developer-role API key; no roles or browser
  security settings were changed to retrieve them.
- The three signing secret names were read back from `ios-testflight` after
  storage. Values are not readable through GitHub; successful macOS import and
  signing remain the first protected run's acceptance check.
- The local backup is under `%LOCALAPPDATA%/Ludolume/Apple/Distribution-20260910`,
  restricted to this Windows user and SYSTEM. Both the RSA key and P12 are
  encrypted; the password is DPAPI-protected for the same user and computer.
  Do not commit this folder or treat it as portable recovery storage.

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
- Categories: Entertainment (primary), Music (secondary), saved and verified
  after reloading App Information on 2026-09-10.
- Status: Prepare for Submission; no binary upload, review submission or release.

The on-device display name is Ludolume. Apple Developer's Identifiers list
confirmed the renamed description; App Store Connect's bundle selector still
showed the previous description after refresh. The underlying identifier is
unchanged. Google Play registration remains separate.

The owner's confirmed sequence is Apple distribution signing and a signed
TestFlight build for the iPhone, Google/Apple sign-in, then the Clean Code sweep.
Keep the signing/upload milestone below in scope; public store publication
still requires separate release approval.

API access verified 2026-09-10 after the owner accepted Apple's API-use agreement:

- Created the team key `Ludolume GitHub TestFlight` with the Developer role,
  not Admin. Team keys apply to all apps in the Apple account; their name does
  not restrict access to Ludolume alone.
- Stored `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_APP_ID`, `IOS_TEAM_ID`,
  `IOS_BUNDLE_ID` and `IOS_BUNDLE_RESOURCE_ID` as variables in `ios-testflight`.
  The bundle resource ID (`BFW2RJD725`) is distinct from the app ID (`6810735137`).
- Scoped, 120-second JWT GET requests returned HTTP 200 for the exact app and
  filtered bundle record. Both names were already Ludolume and the bundle was
  `com.mickeyf.app`. Node required `--use-system-ca` on this Windows host;
  certificate verification was not disabled.
- An idempotent attempt to refresh the bundle description through PATCH returned
  HTTP 403 with this Developer key. No permission escalation was performed.
  Do not create an Admin CI key or recreate the app to fix the stale UI label.
- A Windows-DPAPI-encrypted local backup is under
  `%LOCALAPPDATA%/Ludolume/Apple/ASC-<key-id>.dpapi.xml`, restricted to the current
  Windows user and SYSTEM. Its decryption round trip was verified before the
  plaintext download was removed. This backup requires the same Windows user
  and computer; it is not a portable recovery file. Rotate the Apple key and
  replace the GitHub secret if access is lost or compromise is suspected.

These checks prove API authentication and record reads, not GitHub-runner key
consumption, signed compilation, TestFlight upload or native runtime behavior.
Do not expose the P8 or minted JWTs in logs, source, artifacts or chat.

Before running the signed upload:

1. Use the existing Ludolume App Store Connect record (`6810735137`) and
   registered `com.mickeyf.app` bundle ID; do not create a duplicate record or
   change the identifier to refresh its displayed description.
2. Preserve the configured GitHub environment's approved release branch and
   manual review. Keep Apple credentials out of repository-wide build jobs and
   untrusted pull-request code.
3. Confirm the configured Apple Distribution identity (`.p12` plus password)
   and matching App Store provisioning profile are current. Reuse App Store Connect
   API key/issuer/key ID through protected secret storage. Never commit or paste
   private signing keys into chat. The ignore rules are only a safety net.
4. Review the exact source commit and approve the protected manual signing job.
   It uses unique build numbers and temporary-keychain cleanup. Uploading to
   TestFlight does not authorize public App Store submission or release.
5. Check installation, artwork, audio playback and gameplay on the owner's
   iPhone. Native auth/session acceptance follows the origin/login work below;
   do not confuse successful installation with authentication readiness.
   Preserve the PWA and Android tracks.

First native-device acceptance limits identified on 2026-09-10:

- Production CORS currently allows the website origins, not `capacitor://localhost`.
  The native-origin preflight received no `Access-Control-Allow-Origin`, so
  native login/leaderboards need origin/session work in the following login
  milestone. This signing task does not change or deploy the backend.
- Check Three Bosses' packaged asset URLs in WKWebView on the device; a custom
  scheme behaves differently from a normal website origin. Desktop URL parsing
  alone is not proof of a device failure or success.
- Check user-selected audio playback and interruption/resume. No first-party
  microphone capture was found; do not add a microphone permission without a use.
- If Apple reports Missing Compliance, the owner must confirm the encryption
  answers before the build becomes available to testers. No exemption declaration
  has been inferred or inserted into Info.plist by this workflow.

Standard runner compute is free for public repositories. Private repositories
use their plan's included allowance, then paid usage; storage has separate
allowances. The manual trigger, 30/35-minute simulator/signing timeouts, no dependency cache, and
one-day artifact retention limit incidental usage. They are not an account-wide
spending cap. Never buy larger runners or change billing limits implicitly.

References checked 2026-09-10:
[Capacitor requirements](https://capacitorjs.com/docs/getting-started/environment-setup),
[GitHub manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[GitHub Apple signing](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications),
[Apple API keys](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/),
[Apple API tokens](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests),
[Windows encrypted credential exports](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/import-clixml),
[runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing).
