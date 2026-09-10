# BeatCalc iOS cloud builds

## First stage: unsigned simulator compilation

`.github/workflows/ios-build.yml` is manual-only. It uses a standard GitHub-hosted
macOS 26 runner with Xcode 26.6, the existing CocoaPods project, and locked npm
dependencies. It builds the web assets, synchronizes Capacitor, then compiles the
shared `App` scheme with signing disabled. It does not deploy the website, change
the backend, contact Apple to publish, or use Apple credentials.

The workflow must first be present on the repository's default branch (`main`)
before GitHub will accept a manual dispatch. Merging the current development
branch also carries its other changes and can trigger website deployment;
that is a separate approval, not an incidental cloud-build setup step.

After the workflow is available on `main`, select **Actions → BeatCalc iOS
simulator build (manual) → Run workflow** and choose the reviewed branch. The
equivalent command is:

```sh
gh workflow run ios-build.yml --repo Good-Loops/mickeyf.com --ref <reviewed-branch>
```

The result is an unsigned simulator `.app` in a ZIP, retained for one day.
Xcode diagnostics are retained for one day on failure. This is **not an IPA**,
cannot be installed on a physical iPhone, and is not a TestFlight build.
Successful compilation is not proof of working WKWebView authentication,
microphone/audio permissions, packaged Unity assets, or native gameplay.

No cloud compile has been verified yet. Windows can run the frontend checks,
but it cannot validate Xcode compilation locally.

## Next stage: signed TestFlight builds

Before adding a signing/upload job:

1. Confirm `org.mickeyf.app` is the intended and available Apple bundle ID;
   the local Capacitor config does not reserve it. Create the App Store Connect
   app record and confirm the Apple team.
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
