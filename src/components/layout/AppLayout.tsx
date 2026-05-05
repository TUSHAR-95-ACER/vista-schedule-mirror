import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MarketTicker } from '@/components/news/MarketTicker';

const JOURNAL_ROUTES = [
  '/trades', '/notebook', '/weekly-plan', '/daily-plan', '/weekly-review',
  '/psychology', '/mistakes', '/setup-playbook', '/ai-coach', '/ai-insights',
  '/behavior-patterns', '/trade-quality', '/bias-analytics', '/research-lab',
  '/backtesting-lab',
];

export function AppLayout() {
  const { pathname } = useLocation();
  const isJournal = JOURNAL_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  useEffect(() => {
    if (isJournal) document.body.setAttribute('data-journal', 'true');
    else document.body.removeAttribute('data-journal');
    return () => document.body.removeAttribute('data-journal');
  }, [isJournal]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MarketTicker />
        <main className="flex-1 overflow-y-auto font-body [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
