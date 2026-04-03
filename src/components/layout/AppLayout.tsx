import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TradingViewTicker } from '@/components/news/TradingViewTicker';
import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';

function NextEventStrip() {
  const { calendarEvents } = useMacroNewsContext();
  
  // Find next upcoming high-impact event
  const now = new Date();
  const upcoming = calendarEvents
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const next = upcoming[0];
  if (!next) return null;

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 flex items-center gap-2">
      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
      <span className="text-[10px] font-bold text-destructive uppercase tracking-wider shrink-0">HIGH IMPACT</span>
      <span className="text-xs text-foreground font-medium">{next.currency}</span>
      <span className="text-xs text-foreground">{next.title}</span>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {format(new Date(next.date), 'HH:mm')}
      </div>
      {next.actual && (
        <>
          <span className="text-xs text-primary font-bold">Actual: {next.actual}</span>
        </>
      )}
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NextEventStrip />
        <TradingViewTicker />
        <main className="flex-1 overflow-y-auto font-body [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
