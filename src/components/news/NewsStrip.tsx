import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NewsStrip() {
  const { calendarEvents, news, loading } = useMacroNewsContext();

  const headlines = [
    ...calendarEvents.slice(0, 3).map(e => `📅 ${e.title} (${e.currency}) — Expected: ${e.forecast} | Previous: ${e.previous}${e.actual ? ` | Actual: ${e.actual}` : ''}`),
    ...news.slice(0, 3).map(n => `🚨 ${n.title} — ${n.source}`),
  ];

  if (headlines.length === 0 && !loading) return null;

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider shrink-0">Breaking</span>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap">
            {headlines.length > 0 ? headlines.map((h, i) => (
              <span key={i} className="text-xs text-foreground mx-6">{h}</span>
            )) : (
              <span className="text-xs text-muted-foreground">Loading macro news...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
