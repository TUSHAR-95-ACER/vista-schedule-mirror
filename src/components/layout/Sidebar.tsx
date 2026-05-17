import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageVisibility } from '@/contexts/PageVisibilityContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, ArrowLeftRight, Wallet,
  Brain, Target, FlaskConical, ClipboardList, BarChart3,
  Pin, PinOff, BookOpen, FileText,
  Eye, Gem, Sparkles, Shield, Crosshair, Sliders, Beaker, LogOut, Settings, Activity, MessageCircle, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { path: string; label: string; icon: any; }
interface NavSection { title: string; items: NavItem[]; }

const sections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/trades', label: 'Trades', icon: ArrowLeftRight },
      { path: '/accounts', label: 'Accounts', icon: Wallet },
      { path: '/notebook', label: 'Notebook', icon: BookOpen },
    ],
  },
  {
    title: 'PLANNING & REVIEW',
    items: [
      { path: '/macro-intelligence', label: 'Macro Intelligence', icon: Compass },
      { path: '/weekly-plan', label: 'Weekly Plan', icon: ClipboardList },
      { path: '/daily-plan', label: 'Daily Plan', icon: FileText },
      { path: '/weekly-review', label: 'Weekly Review', icon: FileText },
      { path: '/psychology', label: 'Psychology', icon: Brain },
      { path: '/mistakes', label: 'Mistakes', icon: Target },
      { path: '/setup-playbook', label: 'Setup Playbook', icon: FlaskConical },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/bias-analytics', label: 'Bias Analytics', icon: Crosshair },
      { path: '/behavior-patterns', label: 'Behavior', icon: Eye },
      { path: '/trade-quality', label: 'Trade Quality', icon: Gem },
      { path: '/ai-insights', label: 'AI Insights', icon: Sparkles },
      { path: '/research-lab', label: 'Research Lab', icon: Beaker },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/trading-rules', label: 'Trading Rules', icon: Shield },
      { path: '/control-center', label: 'Control Center', icon: Sliders },
      { path: '/system-analytics', label: 'System Analytics', icon: Activity },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const SLIM = 64;   // px collapsed width (footprint)
const WIDE = 240;  // px expanded width (overlay)

export function Sidebar() {
  const [pinned, setPinned] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-pinned') === '1'; } catch { return false; }
  });
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isPageEnabled } = usePageVisibility();
  const [profileName, setProfileName] = useState<string>('');

  const expanded = pinned || hover;

  useEffect(() => {
    if (!user) { setProfileName(''); return; }
    let cancelled = false;
    const metaName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name;
    if (metaName) setProfileName(metaName);
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const name = (data as any)?.full_name || metaName || '';
      if (name) setProfileName(name);
    });
    return () => { cancelled = true; };
  }, [user]);

  const togglePin = () => {
    setPinned(p => {
      const next = !p;
      try { localStorage.setItem('sidebar-pinned', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const displayName = profileName || 'Trader Workspace';

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => item.path === '/settings' || isPageEnabled(item.path)),
  })).filter(section => section.items.length > 0);

  return (
    // Outer reserves only slim width so main content stays wide.
    <div
      style={{ width: SLIM }}
      className="relative shrink-0 h-screen"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <aside
        style={{ width: expanded ? WIDE : SLIM }}
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-[width] duration-200 ease-out overflow-hidden",
          expanded && !pinned && "shadow-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 h-14 border-b border-border shrink-0">
          <div className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
            <span className="text-foreground font-heading font-bold text-xs">MJ</span>
          </div>
          {expanded && (
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <span className="font-heading text-[14px] font-bold text-foreground leading-tight truncate tracking-tight">Master Journal</span>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight truncate">{displayName}</span>
            </div>
          )}
          {expanded && (
            <button
              onClick={togglePin}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {filteredSections.map(section => (
            <div key={section.title} className="mb-3">
              {expanded ? (
                <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</p>
              ) : (
                <div className="mx-3 mb-1 h-px bg-border/60" />
              )}
              <div className="flex flex-col gap-0.5 px-2">
                {section.items.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      title={!expanded ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 h-9 rounded-md transition-colors text-sm",
                        expanded ? "px-2.5 justify-start" : "px-0 justify-center",
                        active
                          ? "bg-accent text-foreground font-semibold"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {expanded && (
                        <span className="truncate text-[12px] leading-none">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border shrink-0">
          <button
            onClick={signOut}
            title="Logout"
            className={cn(
              "flex items-center gap-2 w-full h-10 text-xs text-destructive hover:bg-destructive/10 transition-colors",
              expanded ? "px-3 justify-start" : "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </div>
  );
}
