# Multi Agent desktop app distribution

This guide covers building and distributing Multi Agent for macOS and Windows.
Run the commands from the project root.

## Requirements

- Node.js 22 or a compatible current LTS release, with npm.
- A copy of the Firebase Web app configuration in `.env.local`. Start from
  `.env.example` and add the public Web app values; do not put a Firebase service
  account key in the desktop app.
- Google Chrome installed on each user's computer. Multi Agent launches the
  installed Chrome executable when the user starts a profile.
- A macOS build host for macOS packages. Windows packages can be created on
  Windows or as ZIP archives on macOS.

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase project and
configuration details. `.env.local` is ignored by Git and must be configured on
each build machine.

## Prepare and verify a release

Install dependencies and run the checks:

```sh
npm ci
npm test -- --pool=forks --poolOptions.forks.singleFork
npm run build
```

Update the app version in `package.json` before a versioned release. The
electron-builder configuration uses the version from that file in generated
artifact names.

## macOS

On macOS, build both Apple Silicon (arm64) and Intel (x64) packages:

```sh
npm run pack:mac -- --publish never
```

Artifacts are written to `release/`:

| Architecture | Installer | ZIP |
| --- | --- | --- |
| Apple Silicon | `Multi Agent-<version>-arm64.dmg` | `Multi Agent-<version>-arm64-mac.zip` |
| Intel | `Multi Agent-<version>.dmg` | `Multi Agent-<version>-mac.zip` |

For a single architecture, run one of these instead:

```sh
npx electron-builder --mac dmg zip --arm64 --publish never
npx electron-builder --mac dmg zip --x64 --publish never
```

The current configuration does not enable Apple notarization. A locally built
app may show a Gatekeeper warning on another Mac. Before public distribution,
configure Developer ID signing and Apple notarization credentials and verify
the downloaded artifact on a clean Mac.

## Windows

For a Windows installer and ZIP packages, build on a Windows machine:

```powershell
npm ci
npm test -- --pool=forks --poolOptions.forks.singleFork
npm run pack:win -- --publish never
```

The configured targets produce an NSIS Setup `.exe` and ZIP archives for x64
and ARM64 in `release/`. To build only a specific target and architecture:

```powershell
npm run pack:win
```

On macOS, Windows ZIP archives can be built without the NSIS installer:

```sh
npm run build
npx electron-builder --win zip --x64 --publish never
npx electron-builder --win zip --arm64 --publish never
```

NSIS Setup `.exe` generation requires a compatible NSIS compiler. On this
Apple-Silicon build host, electron-builder's bundled macOS NSIS compiler cannot
run, so create Setup installers on Windows. The Windows signing configuration
is currently unsigned; configure a code-signing certificate before publishing
to reduce Windows security warnings.

## Distribution checklist

1. Confirm the version and Firebase Web configuration are correct for the
   release.
2. Run the tests and build commands above.
3. Build each target on the recommended host and inspect the files in `release/`.
4. Test installation, login, profile sync, profile launch, and uninstall on a
   clean machine for each supported OS and architecture.
5. Sign and notarize macOS releases and code-sign Windows releases before
   broad public distribution.
6. Distribute only the intended files from `release/`; do not distribute
   `.env.local`, signing credentials, or Firebase service-account keys.

## Release
```sh

git tag v1.1.0
git push origin v1.1.0

gh release create v1.1.0 \
  "release/Multi Agent-1.1.0-arm64.dmg" \
  "release/Multi Agent-1.1.0.dmg" \
  "release/Multi Agent Setup 1.1.0.exe" \
  --title "Multi Agent v1.1.0" \
  --notes "Release v1.1.0: Updates and improvements."
```