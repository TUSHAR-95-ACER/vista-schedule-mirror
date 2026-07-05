import { useEffect, useState } from 'react';
import {
  installExternalLinkHandler,
  isDesktop,
  checkForUpdatesInfo,
  markDesktopRoot,
  type UpdateInfo,
} from '@/lib/desktop';
import { UpdateBanner } from './UpdateBanner';
import { DesktopTitleBar } from './DesktopTitleBar';

/**
 * Runs once at app boot. In the browser this is a full no-op.
 * In the desktop shell it:
 *   - marks the root element so desktop-only CSS activates (compact reflow,
 *     hidden scrollbars, title-bar spacing)
 *   - mounts a custom dark title bar (frameless window)
 *   - routes external anchor clicks through the OS browser
 *   - silently checks for updates on boot and shows an in-app notification
 */
export function DesktopBootstrap() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    setDesktop(true);
    markDesktopRoot();
    const cleanupLinks = installExternalLinkHandler();

    // Silent update probe on boot — surfaces a persistent in-app banner if newer.
    // One quick retry after 30s to survive transient network issues at cold start,
    // then hourly re-checks while the app is running.
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

  return (
    <>
      {desktop && <DesktopTitleBar />}
      {update && <UpdateBanner update={update} onDismiss={() => setUpdate(null)} />}
    </>
  );
}
