import { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { UpdateInfo } from '@/lib/desktop';

interface Props {
  update: UpdateInfo;
  onDismiss: () => void;
}

/**
 * Small in-app notification anchored bottom-right that surfaces a new
 * desktop version. Never restarts the app without an explicit user click.
 */
export function UpdateBanner({ update, onDismiss }: Props) {
  const [installing, setInstalling] = useState(false);

  const runUpdate = async () => {
    setInstalling(true);
    try {
      await update.install();
      // If the OS relaunch call doesn't fire (e.g. signing disabled), tell the user.
      toast('Update ready — restart to finish installing.');
    } catch (e) {
      toast.error('Update failed', {
        description:
          'Automatic updates are not yet enabled for this build. Please download the latest installer from the release page.',
      });
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-primary/40 bg-card/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-heading font-bold leading-tight">
              A new version of TG Master Journal is available.
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              v{update.version} is ready to install.
            </p>
          </div>
          <button
            aria-label="Dismiss"
            onClick={onDismiss}
            disabled={installing}
            className="text-muted-foreground hover:text-foreground transition-colors -mr-1 -mt-1 p-1 rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onDismiss} disabled={installing}>
            Later
          </Button>
          <Button size="sm" onClick={runUpdate} disabled={installing} className="gap-1.5">
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {installing ? 'Installing…' : 'Update Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
