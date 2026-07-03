import { useEffect } from 'react';
import { installExternalLinkHandler, isDesktop, checkForUpdates } from '@/lib/desktop';
import { toast } from 'sonner';

/**
 * Runs once at app boot. In the browser this is a full no-op.
 * In the desktop shell it:
 *   - routes external anchor clicks through the OS browser
 *   - polls the updater endpoint (silent) once per launch
 *   - listens for the native menu → open-ai event
 */
export function DesktopBootstrap() {
  useEffect(() => {
    if (!isDesktop()) return;

    const cleanupLinks = installExternalLinkHandler();
    let unlistenMenu: (() => void) | null = null;

    (async () => {
      // Silent updater probe — notify only if an update is available.
      const result = await checkForUpdates(true);
      if (result.available && result.version) {
        toast('Update available', {
          description: `TG Master Journal ${result.version} is ready. Open Settings → Desktop to install.`,
        });
      }

      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenMenu = await listen<string>('menu:open-ai', (event) => {
          const provider = event.payload;
          import('@/lib/desktop').then((m) =>
            m.openAiWorkspace(provider as 'chatgpt' | 'gemini' | 'claude' | 'perplexity')
          );
        });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cleanupLinks();
      if (unlistenMenu) unlistenMenu();
    };
  }, []);

  return null;
}
