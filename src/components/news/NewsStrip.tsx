import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { AlertTriangle } from 'lucide-react';

export function NewsStrip() {
  const { calendarEvents, news, loading } = useMacroNewsContext();

  // Only show high-impact news in strip
  const highImpactNews = news.filter(n => n.impact === 'high');

  const headlines = [
    ...calendarEvents.slice(0, 2).map(e => `📅 ${e.title} (${e.currency}) — Expected: ${e.forecast} | Previous: ${e.previous}${e.actual ? ` | Actual: ${e.actual}` : ''}`),
    ...highImpactNews.slice(0, 2).map(n => `🚨 ${n.title}`),
  ];

  if (headlines.length === 0 && !loading) return null;

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider shrink-0">Macro</span>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap">
            {headlines.map((h, i) => (
              <span key={i} className="text-xs text-foreground mx-6">{h}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
