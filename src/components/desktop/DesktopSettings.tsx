import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Download, RefreshCw } from 'lucide-react';
import { checkForUpdates, getDesktopVersion, isDesktop } from '@/lib/desktop';
import { toast } from 'sonner';

export function DesktopSettingsPanel() {
  const desktop = isDesktop();
  const [version, setVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getDesktopVersion().then(setVersion);
  }, []);

  const runUpdate = async () => {
    setChecking(true);
    try {
      const r = await checkForUpdates(false);
      if (!r.available) toast('You are on the latest version.');
    } catch (e) {
      toast.error('Update check failed', { description: String(e) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Desktop App</h2>

      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-heading font-bold">
              {desktop ? 'Desktop shell active' : 'Running in browser'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {desktop
                ? `Native window · v${version ?? '…'} · window state, single-instance, system tray, and native menus enabled.`
                : 'Install the TG Master Journal desktop app to unlock native features like AI Workspace windows, system tray, and offline resilience.'}
            </p>
          </div>
        </div>

        {desktop && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
            <Button size="sm" variant="outline" onClick={runUpdate} disabled={checking} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              Check for updates
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Reload UI
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5 text-[11px] leading-relaxed text-muted-foreground">
        <p className="mb-1 text-xs font-medium text-foreground">How updates work</p>
        <p>
          The desktop shell loads the latest deployed Lovable web build every time
          you launch it. UI updates appear automatically — you only need to install
          a new desktop version when native functionality changes.
        </p>
      </div>
    </div>
  );
}
