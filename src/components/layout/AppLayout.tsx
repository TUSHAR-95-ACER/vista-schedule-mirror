import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MarketTicker } from '@/components/news/MarketTicker';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AICoachProvider, useAICoach } from '@/contexts/AICoachContext';
import { AICoachDrawer } from '@/components/ai/AICoachDrawer';


const PATH_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/trades': 'Trades',
  '/accounts': 'Accounts',
  '/notebook': 'Notebook',
  '/macro-intelligence': 'Macro Intelligence',
  '/weekly-plan': 'Weekly Plans',
  '/daily-plan': 'Daily Plans',
  '/weekly-review': 'Weekly Review',
  '/psychology': 'Psychology',
  '/mistakes': 'Mistakes',
  '/setup-playbook': 'Setup Playbook',
  '/analytics': 'Analytics',
  '/bias-analytics': 'Bias Analytics',
  '/behavior-patterns': 'Behavior Patterns',
  '/trade-quality': 'Trade Quality',
  '/ai-insights': 'AI Insights',
  '/research-lab': 'Research Lab',
  '/calendar': 'Calendar',
  '/trading-rules': 'Trading Rules',
  '/control-center': 'Control Center',
  '/system-analytics': 'System Analytics',
  '/settings': 'Settings',
};

function PageContextRegistrar() {
  const { pathname } = useLocation();
  const { setPage } = useAICoach();
  useEffect(() => {
    const label = PATH_LABELS[pathname] || `Page: ${pathname}`;
    setPage({ label, detail: `The trader is currently on the "${label}" page (route ${pathname}). Focus your reply on this page's purpose unless they ask something broader.` });
  }, [pathname, setPage]);
  return null;
}

function HeaderUtilityColumn() {
  const { openDrawer } = useAICoach();
  return (
    <div className="absolute top-12 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
      <button
        onClick={openDrawer}
        title="Open AI Coach"
        className="pointer-events-auto h-8 px-3 rounded-full border border-primary/40 bg-card/95 backdrop-blur text-foreground hover:bg-primary/10 hover:border-primary/60 transition-colors flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-sm"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>AI Coach</span>
      </button>
      <div className="pointer-events-auto rounded-full border border-border/50 bg-card/95 backdrop-blur shadow-sm">
        <ThemeToggle />
      </div>
    </div>
  );
}

function ShellInner() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MarketTicker />
        <HeaderUtilityColumn />
        <main className="flex-1 overflow-y-auto font-body [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase">
          <Outlet />
        </main>
      </div>
      <AICoachDrawer />
      <PageContextRegistrar />
    </div>
  );
}


export function AppLayout() {
  return (
    <AICoachProvider>
      <ShellInner />
    </AICoachProvider>
  );
}
