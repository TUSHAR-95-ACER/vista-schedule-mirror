import { useState } from 'react';
import { TOGGLEABLE_PAGES, usePageVisibility } from '@/contexts/PageVisibilityContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Settings as SettingsIcon,
  ToggleLeft,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'modules', label: 'Workspace Modules', icon: LayoutGrid },
] as const;

type SectionId = typeof settingsSections[number]['id'];

const moduleSectionOrder = ['OVERVIEW', 'PLANNING & REVIEW', 'INTELLIGENCE', 'SYSTEM'];

function WorkspaceModulesPanel() {
  const { enabledPages, togglePage, enableAll } = usePageVisibility();

  const grouped = moduleSectionOrder.map(section => ({
    section,
    pages: TOGGLEABLE_PAGES.filter(p => p.section === section),
  }));

  const enabledCount = Object.values(enabledPages).filter(Boolean).length;
  const totalCount = TOGGLEABLE_PAGES.length;

  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">Workspace Modules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Toggle pages on or off. Disabled pages are hidden from the sidebar but your data stays safe.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={enableAll} className="gap-1.5 shrink-0">
          <ToggleLeft className="h-4 w-4" />
          Enable All
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-xs font-medium text-foreground">{enabledCount} Active</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{totalCount - enabledCount} Hidden</span>
        </div>
      </div>

      {/* Module Groups */}
      <div className="space-y-5">
        {grouped.map(({ section, pages }) => (
          <div key={section} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{section}</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {pages.map(page => {
                const enabled = enabledPages[page.path] !== false;
                return (
                  <div
                    key={page.path}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 transition-colors",
                      !enabled && "bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2 w-2 rounded-full transition-colors", enabled ? 'bg-success' : 'bg-muted-foreground/30')} />
                      <span className={cn("text-sm font-medium transition-colors", enabled ? 'text-foreground' : 'text-muted-foreground')}>
                        {page.label}
                      </span>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => togglePage(page.path)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionId>('modules');

  return (
    <div className="p-6 h-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your trading workspace</p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100%-5rem)]">
        {/* Settings Sidebar */}
        <div className="w-52 shrink-0">
          <div className="space-y-1">
            {settingsSections.map(section => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <section.icon className="h-4 w-4" />
                    <span>{section.label}</span>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'modules' && <WorkspaceModulesPanel />}
        </div>
      </div>
    </div>
  );
}
