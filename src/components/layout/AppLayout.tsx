import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MarketTicker } from '@/components/news/MarketTicker';

export function AppLayout() {
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
