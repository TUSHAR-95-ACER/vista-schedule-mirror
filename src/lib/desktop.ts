/**
 * Desktop-only helpers. Every function safely no-ops in the browser so the
 * same web bundle powers both the Lovable web app and the Tauri desktop shell.
 *
 * We access Tauri via `window.__TAURI_INTERNALS__` presence detection and
 * dynamic imports so the web bundle never fails to load the plugin JS files.
 */

export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
};

type AiProvider = 'chatgpt' | 'gemini' | 'claude' | 'perplexity';

export async function openAiWorkspace(provider: AiProvider): Promise<void> {
  if (!isDesktop()) {
    const urls: Record<AiProvider, string> = {
      chatgpt: 'https://chat.openai.com/',
      gemini: 'https://gemini.google.com/app',
      claude: 'https://claude.ai/new',
      perplexity: 'https://www.perplexity.ai/',
    };
    window.open(urls[provider], '_blank', 'noopener,noreferrer');
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_ai_workspace', { provider });
}

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

export async function checkForUpdates(silent = true): Promise<{ available: boolean; version?: string }> {
  if (!isDesktop()) return { available: false };
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return { available: false };
    if (!silent) {
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    }
    return { available: true, version: update.version };
  } catch {
    return { available: false };
  }
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
