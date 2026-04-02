import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NewsAlertPopup() {
  const { alerts, markAlertSeen, markAllSeen } = useMacroNewsContext();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {alerts.length > 1 && (
        <Button size="sm" variant="outline" onClick={markAllSeen} className="self-end text-xs">
          Mark all as seen ({alerts.length})
        </Button>
      )}
      {alerts.slice(0, 3).map(alert => (
        <div key={alert.id} className="bg-card border border-destructive/30 rounded-lg shadow-lg p-4 animate-in slide-in-from-right-5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1">Breaking News</p>
              <p className="text-sm font-medium text-foreground line-clamp-2">{alert.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{alert.source}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => markAlertSeen(alert.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => markAlertSeen(alert.id)}>
              <Eye className="h-3 w-3 mr-1" /> Mark as Seen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
