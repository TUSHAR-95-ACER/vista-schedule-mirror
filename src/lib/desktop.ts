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
  } catch {
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
 * Apply a persistent zoom level to the webview. Web platforms honour CSS zoom,
 * so this works reliably inside WebView2 (Windows) and WKWebView (macOS).
 */
export function applyDesktopZoom(level = 0.85): void {
  if (!isDesktop() || typeof document === 'undefined') return;
  // @ts-expect-error non-standard but supported in Chromium/WebView2/WKWebView
  document.documentElement.style.zoom = String(level);
}

/**
 * Mark the root element so global CSS can hide the browser scrollbar and
 * apply native-window styling without affecting the web build.
 */
export function markDesktopRoot(): void {
  if (!isDesktop() || typeof document === 'undefined') return;
  document.documentElement.classList.add('is-desktop');
}
