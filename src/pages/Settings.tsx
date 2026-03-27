import { TOGGLEABLE_PAGES, usePageVisibility } from '@/contexts/PageVisibilityContext';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, ToggleLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sectionOrder = ['OVERVIEW', 'PLANNING & REVIEW', 'INTELLIGENCE', 'SYSTEM'];

export default function Settings() {
  const { enabledPages, togglePage, enableAll } = usePageVisibility();

  const grouped = sectionOrder.map(section => ({
    section,
    pages: TOGGLEABLE_PAGES.filter(p => p.section === section),
  }));

  const enabledCount = Object.values(enabledPages).filter(Boolean).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Workspace Modules</h1>
            <p className="text-sm text-muted-foreground">
              Choose which pages appear in your sidebar. Disabled pages are hidden but your data is preserved.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={enableAll} className="gap-1.5">
          <ToggleLeft className="h-4 w-4" />
          Enable All
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">{enabledCount} Active</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{TOGGLEABLE_PAGES.length - enabledCount} Hidden</span>
        </div>
      </div>

      {/* Sections */}
      {grouped.map(({ section, pages }) => (
        <div key={section} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section}</h2>
          <div className="grid gap-2">
            {pages.map(page => {
              const enabled = enabledPages[page.path] !== false;
              return (
                <div
                  key={page.path}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                    enabled
                      ? 'border-border bg-card'
                      : 'border-border/50 bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                    <span className={`text-sm font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
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
  );
}
