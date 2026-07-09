import { useEffect, useState } from 'react';
import {
  installExternalLinkHandler,
  isDesktop,
  checkForUpdatesInfo,
  markDesktopRoot,
  type UpdateInfo,
} from '@/lib/desktop';
import { UpdateBanner } from './UpdateBanner';

/**
 * Runs once at app boot. In the browser this is a full no-op.
 * In the desktop shell it:
 *   - marks the root element so desktop-only CSS activates
 *   - routes external anchor clicks through the OS browser
 *   - silently checks for updates on boot and shows an in-app notification
 *
 * The native OS title bar is used (decorations: true in tauri.conf.json),
 * and on Windows it is forced into Dark Mode via DWM in main.rs so it
 * matches the app's dark theme. No custom/fake title bar is rendered.
 */
export function DesktopBootstrap() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    markDesktopRoot();
    const cleanupLinks = installExternalLinkHandler();

    let cancelled = false;
    const probe = async () => {
      const info = await checkForUpdatesInfo();
      if (!cancelled && info) setUpdate(info);
    };
    probe();
    const retry = window.setTimeout(() => { if (!update) probe(); }, 30_000);
    const hourly = window.setInterval(probe, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      window.clearInterval(hourly);
      cleanupLinks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return update ? <UpdateBanner update={update} onDismiss={() => setUpdate(null)} /> : null;
}

