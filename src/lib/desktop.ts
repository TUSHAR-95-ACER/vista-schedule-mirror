/**
 * Desktop-only helpers. Every function safely no-ops in the browser so the
 * same web bundle powers both the Lovable web app and the Tauri desktop shell.
 */

export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
};

export async function openExternal(url: string): Promise<void> {
  if (!isDesktop()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function nativeNotify(title: string, body?: string): Promise<void> {
  if (!isDesktop()) return;
  try {
    const notif = await import('@tauri-apps/plugin-notification');
    let granted = await notif.isPermissionGranted();
    if (!granted) granted = (await notif.requestPermission()) === 'granted';
    if (granted) notif.sendNotification({ title, body });
  } catch { /* ignore */ }
}

/**
 * Poll the updater endpoint. Returns metadata about an available update so
 * callers can show an in-app notification. Installation is a separate
 * explicit action via `installUpdate` — we never restart the app silently.
 */
export interface UpdateInfo {
  version: string;
  currentVersion?: string;
  notes?: string;
  install: () => Promise<void>;
}

export async function checkForUpdatesInfo(): Promise<UpdateInfo | null> {
  if (!isDesktop()) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      currentVersion: (update as any).currentVersion,
      notes: (update as any).body,
      install: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch (e) {
    console.warn('[desktop] update check failed', e);
    return null;
  }
}

/** Legacy signature preserved for existing Settings panel. */
export async function checkForUpdates(silent = true): Promise<{ available: boolean; version?: string }> {
  const info = await checkForUpdatesInfo();
  if (!info) return { available: false };
  if (!silent) await info.install();
  return { available: true, version: info.version };
}

export async function getDesktopVersion(): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('app_version');
  } catch {
    return null;
  }
}

/** Redirect ALL external anchor clicks through the OS default browser. */
export function installExternalLinkHandler(): () => void {
  if (!isDesktop() || typeof document === 'undefined') return () => {};
  const handler = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (/^https?:\/\//i.test(href) && !href.includes(window.location.host)) {
      e.preventDefault();
      openExternal(href);
    }
  };
  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}

/**
 * Mark the root element so global CSS can apply desktop-specific reflow:
 * denser paddings, smaller heading sizes, hidden scrollbars, custom
 * title-bar spacing. Never uses CSS `zoom` — that produces empty space
 * at the bottom of pages. All sizing is done via reflow tokens.
 */
export function markDesktopRoot(): void {
  if (!isDesktop() || typeof document === 'undefined') return;
  document.documentElement.classList.add('is-desktop');
}

/** Native window control helpers (no-ops in the browser). */
export async function winMinimize(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  } catch (e) { console.warn('[desktop] minimize failed', e); }
}
export async function winToggleMaximize(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
  } catch (e) { console.warn('[desktop] toggleMaximize failed', e); }
}
export async function winClose(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch (e) { console.warn('[desktop] close failed', e); }
}
export async function winIsMaximized(): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return await getCurrentWindow().isMaximized();
  } catch { return false; }
}
export async function onWinResize(cb: () => void): Promise<() => void> {
  if (!isDesktop()) return () => {};
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const unlisten = await getCurrentWindow().onResized(() => cb());
    return () => { try { unlisten(); } catch { /* */ } };
  } catch { return () => {}; }
}
