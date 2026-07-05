# TG Master Journal — Desktop (Tauri)

Native desktop wrapper for Windows and macOS. The window is **frameless**
(custom dark title bar rendered by the React app) and loads the latest
deployed Lovable URL directly, so future front-end deploys appear inside
the desktop app automatically. Only re-build the desktop binary when
native functionality changes or a Tauri upgrade requires it.

## Prerequisites

Install once per developer machine:

- Rust toolchain — https://rustup.rs
- Tauri v2 CLI — `cargo install tauri-cli --version "^2.0"`
- Platform-native build tools:
  - **Windows**: Visual Studio Build Tools + WebView2 runtime (preinstalled on Windows 11)
  - **macOS**: Xcode Command Line Tools

## Run in development

```bash
npm install
npm run tauri:dev
```

This opens a native frameless window pointed at the production Lovable URL.

## Build installers

```bash
# Windows .exe (NSIS installer) + updater artifacts
npm run tauri:build -- --target x86_64-pc-windows-msvc

# macOS Universal .dmg + updater artifacts
npm run tauri:build -- --target universal-apple-darwin
```

Output goes to `src-tauri/target/release/bundle/`. When the updater is
enabled (see below) each bundle target also emits a `*.sig` file and a
`latest.json` manifest.

---

## How the two update paths work

There are **two independent update mechanisms**, each with a different job:

### 1. Web UI updates — instant, no rebuild
The window URL is hard-coded to `https://master-journal-tg.lovable.app`.
Every Lovable deploy is served from that URL, so opening the desktop app
after a deploy immediately shows the new UI. No installer, no `cargo
build`, no VS Code — just relaunch the app.

### 2. Native shell updates — automatic via Tauri Updater
When the Rust shell itself changes (new Tauri version, new native
command, changed window URL), users receive an in-app "Update Now"
notification. Flow:

1. On launch the desktop app hits the `endpoints` URL in
   `src-tauri/tauri.conf.json` (currently a GitHub Releases
   `latest.json`).
2. If a newer version is published there, an in-app banner appears with
   **Update Now / Later**.
3. Clicking **Update Now** downloads the signed installer, verifies the
   signature against the embedded `pubkey`, installs it, and relaunches.

Users never touch git, npm, cargo, or the installer manually.

### One-time signing setup

Tauri requires a signing key so users cannot be tricked into installing a
malicious update. Do this **once** per project:

```bash
# 1. Generate a key-pair (keep the private key secret; commit only the pub key).
cargo tauri signer generate -w ~/.tauri/tg-master-journal.key

# 2. Copy the printed public key into `src-tauri/tauri.conf.json`:
#    "plugins": { "updater": { "pubkey": "<paste here>" } }

# 3. Export the private key + password before every `tauri build`:
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/tg-master-journal.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<your passphrase>"

npm run tauri:build
```

The build produces `latest.json` alongside the installer. Uploading them
to a GitHub Release under
`TG-MasterJournal/desktop-releases` (or updating the `endpoints` URL to
your own release repo) is all that is needed — the running desktop app
will pick it up on next launch.

### Rolling out an update

1. Bump `version` in `src-tauri/tauri.conf.json` and `package.json`.
2. Run `npm run tauri:build`.
3. Upload `latest.json`, the `.exe`/`.dmg`, and their `.sig` files to a
   new GitHub Release tagged with the new version.
4. Done — every user's desktop app will offer the update on next launch.

---

## Data synchronization (desktop ↔ web)

Desktop and web run the same React bundle against the same Supabase
project. In addition to that, the app subscribes to Supabase Realtime for
every user-facing table (`RealtimeSyncProvider`). When you edit a record
on the website the desktop app receives the change instantly and
refreshes the affected views, and vice-versa — so you never work against
stale data and never see spurious "Save failed" errors caused by a
concurrent edit on the other client.

