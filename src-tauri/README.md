# TG Master Journal — Desktop (Tauri)

Native desktop wrapper for Windows and macOS. The window loads the latest
deployed Lovable URL (`https://master-journal-tg.lovable.app`), so future
front-end deploys appear inside the desktop app automatically without a new
binary build. Only re-build the desktop binary when native desktop
functionality changes.

## Prerequisites

Install once per developer machine:

- Rust toolchain — https://rustup.rs
- Tauri v2 CLI — `cargo install tauri-cli --version "^2.0"`
- Platform-native build tools:
  - **Windows**: Visual Studio Build Tools + WebView2 runtime (preinstalled on Windows 11)
  - **macOS**: Xcode Command Line Tools

## Run in development

```bash
cargo tauri dev
```

This opens a native window pointed at the production Lovable URL.

## Build installers

```bash
# Windows .exe (NSIS installer)
cargo tauri build --target x86_64-pc-windows-msvc

# macOS Universal .dmg
cargo tauri build --target universal-apple-darwin
```

Output goes to `src-tauri/target/release/bundle/`.

## How auto-update works (no desktop rebuild needed)

The window URL is hard-coded to the published Lovable app. Every Lovable
deploy is served from that URL, so opening the desktop app after a deploy
shows the new UI immediately. The Rust binary only needs rebuilding when:

- The window URL changes
- Native Tauri commands are added
- The Tauri framework itself is upgraded

## Cross-platform notes

A single source tree produces both Windows and macOS bundles. macOS `.dmg`
requires building on a Mac (Apple notarization rules); Windows `.exe` can be
cross-compiled from any platform with `cargo tauri build --target ...`.
