import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Wallet,
  Brain, Target, FlaskConical, ClipboardList, BarChart3,
  ChevronLeft, ChevronRight, BookOpen, FileText,
  Eye, Gem, Sparkles, Shield, Crosshair, Sliders, Beaker, CheckSquare } from 'lucide-react';
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
      { path: '/daily-checklist', label: 'Checklist', icon: CheckSquare },
      
    ],
  },
  {
    title: 'PLANNING & REVIEW',
    items: [
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
      { path: '/backtesting-lab', label: 'Backtest Lab', icon: FlaskConical },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/trading-rules', label: 'Trading Rules', icon: Shield },
      { path: '/control-center', label: 'Control Center', icon: Sliders },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0">
        <div className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
          <span className="text-foreground font-heading font-bold text-xs">EF</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-heading text-sm font-bold text-foreground leading-tight truncate">EdgeFinder Pro</span>
            <span className="text-[10px] text-foreground leading-tight">Trading Intelligence</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide">
        {sections.map(section => (
          <div key={section.title} className="mb-4">
            {!collapsed && <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground">{section.title}</p>}
            {collapsed ? (
              <div className="flex flex-col items-center gap-1 px-1.5">
                {section.items.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <button key={item.path} onClick={() => navigate(item.path)} title={item.label}
                      className={cn("flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                        active ? "bg-accent text-foreground shadow-sm" : "text-foreground hover:bg-accent hover:text-foreground"
                      )}>
                      <item.icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 px-3">
                {section.items.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <button key={item.path} onClick={() => navigate(item.path)}
                      className={cn(
                        "group flex flex-col items-center justify-center gap-1.5 rounded-lg p-3 aspect-square transition-all duration-200 border",
                        active ? "bg-accent border-border text-foreground shadow-sm" : "bg-background border-border text-foreground hover:bg-accent hover:border-border hover:text-foreground hover:shadow-sm hover:scale-[1.03]"
                      )}>
                      <item.icon className={cn("h-5 w-5 transition-transform duration-200 group-hover:scale-110", active && "text-foreground")} />
                      <span className={cn("text-[10px] leading-tight text-center font-medium truncate w-full", active && "font-semibold")}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-border text-foreground hover:bg-accent transition-colors shrink-0">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
