import { useEffect, useState } from 'react';
import {
  installExternalLinkHandler,
  isDesktop,
  checkForUpdatesInfo,
  applyDesktopZoom,
  markDesktopRoot,
  type UpdateInfo,
} from '@/lib/desktop';
import { UpdateBanner } from './UpdateBanner';

/**
 * Runs once at app boot. In the browser this is a full no-op.
 * In the desktop shell it:
 *   - marks the root element so desktop-only CSS activates
 *   - forces the default zoom to 85% for a denser native layout
 *   - routes external anchor clicks through the OS browser
 *   - silently checks for updates and shows an in-app notification
 */
export function DesktopBootstrap() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;

    markDesktopRoot();
    applyDesktopZoom(0.85);

    const cleanupLinks = installExternalLinkHandler();

    // Silent update probe — surfaces a persistent in-app banner if newer.
    // Retry once after 30s to survive transient network issues at cold start.
    let cancelled = false;
    const probe = async () => {
      const info = await checkForUpdatesInfo();
      if (!cancelled && info) setUpdate(info);
    };
    probe();
    const retry = window.setTimeout(() => { if (!update) probe(); }, 30_000);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      cleanupLinks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return update ? <UpdateBanner update={update} onDismiss={() => setUpdate(null)} /> : null;
}
