import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto font-body [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase">
        <Outlet />
      </main>
    </div>
  );
}
