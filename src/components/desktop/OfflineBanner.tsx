import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Global offline detector: shows a persistent banner while offline and
 * a "connection restored" toast when the network returns.
 */
export function OfflineBanner() {
  const { online, wasOffline } = useOnlineStatus();
  const restoredShown = useRef(false);

  useEffect(() => {
    if (online && wasOffline && !restoredShown.current) {
      restoredShown.current = true;
      toast.success('Connection restored', { description: 'You are back online.' });
    }
    if (!online) restoredShown.current = false;
  }, [online, wasOffline]);

  if (online) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive shadow-lg backdrop-blur">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline — changes will sync when reconnected.</span>
    </div>
  );
}
