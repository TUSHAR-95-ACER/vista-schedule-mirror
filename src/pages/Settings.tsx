import { useState } from 'react';
import { TOGGLEABLE_PAGES, usePageVisibility } from '@/contexts/PageVisibilityContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings as SettingsIcon,
  ToggleLeft,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ChevronRight,
  Target,
  BarChart3,
  Brain,
  Globe,
  Palette,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const settingsSections = [
  { id: 'modules', label: 'Workspace Modules', icon: LayoutGrid },
  { id: 'trading', label: 'Trading Preferences', icon: Target },
  { id: 'journal', label: 'Journal Behavior', icon: BarChart3 },
  { id: 'ai', label: 'AI Settings', icon: Brain },
  { id: 'market', label: 'Market Settings', icon: Globe },
  { id: 'ui', label: 'UI Preferences', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type SectionId = typeof settingsSections[number]['id'];

const moduleSectionOrder = ['OVERVIEW', 'PLANNING & REVIEW', 'INTELLIGENCE', 'SYSTEM'];

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-sm font-heading font-bold text-foreground">{title}</h3>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">Workspace Modules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Toggle pages on or off. Disabled pages are hidden from the sidebar.</p>
        </div>
        <Button variant="outline" size="sm" onClick={enableAll} className="gap-1.5 shrink-0">
          <ToggleLeft className="h-4 w-4" /> Enable All
        </Button>
      </div>
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
      <div className="space-y-5">
        {grouped.map(({ section, pages }) => (
          <div key={section} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{section}</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {pages.map(page => {
                const enabled = enabledPages[page.path] !== false;
                return (
                  <div key={page.path} className={cn("flex items-center justify-between px-4 py-3 transition-colors", !enabled && "bg-muted/20")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2 w-2 rounded-full transition-colors", enabled ? 'bg-success' : 'bg-muted-foreground/30')} />
                      <span className={cn("text-sm font-medium transition-colors", enabled ? 'text-foreground' : 'text-muted-foreground')}>{page.label}</span>
                    </div>
                    <Switch checked={enabled} onCheckedChange={() => togglePage(page.path)} />
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

function TradingPreferencesPanel() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">Trading Preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your default trading parameters</p>
      </div>
      <SettingCard title="Risk Management" description="Default risk and reward settings for new trades">
        <SettingRow label="Default Risk %" description="Applied to each new trade">
          <Input type="number" defaultValue="1" step="0.5" min="0.1" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Default Risk:Reward" description="Target RR ratio">
          <Input type="number" defaultValue="2" step="0.5" min="0.5" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
      </SettingCard>
      <SettingCard title="Session & Pairs" description="Your primary trading focus">
        <SettingRow label="Default Session">
          <Select defaultValue="New York Kill Zone">
            <SelectTrigger className="h-8 w-44 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Preferred Pairs" description="Comma-separated">
          <Input defaultValue="EURUSD, GBPUSD, XAUUSD" className="h-8 w-56 text-xs rounded-lg" />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function JournalBehaviorPanel() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">Journal Behavior</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize how your journal works</p>
      </div>
      <SettingCard title="Trade Logging" description="Control trade entry defaults">
        <SettingRow label="Default Trade Size" description="Pre-filled lot size">
          <Input type="number" defaultValue="0.1" step="0.01" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Auto-save Plans" description="Save plans automatically as you type">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Require Grade" description="Force grade selection on every trade">
          <Switch defaultChecked />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function AISettingsPanel() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">AI Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your AI trading coach</p>
      </div>
      <SettingCard title="AI Coach" description="Personalize AI-powered trading analysis">
        <SettingRow label="AI Coach" description="Enable AI-powered trade analysis and coaching">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Analysis Depth">
          <Select defaultValue="advanced">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Response Style">
          <Select defaultValue="direct">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct & Actionable</SelectItem>
              <SelectItem value="detailed">Detailed & Educational</SelectItem>
              <SelectItem value="motivational">Motivational</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function MarketSettingsPanel() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">Market Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure market data and news preferences</p>
      </div>
      <SettingCard title="Timezone & Calendar" description="Economic calendar display settings">
        <SettingRow label="Default Timezone">
          <Select defaultValue="UTC">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['UTC', 'EST', 'GMT', 'CET', 'JST', 'AEST'].map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="News Filter" description="Which currencies to track">
          <Select defaultValue="usd">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD Only</SelectItem>
              <SelectItem value="major">Major Currencies</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Impact Filter" description="Minimum event importance">
          <Select defaultValue="high">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High Only</SelectItem>
              <SelectItem value="medium">Medium & High</SelectItem>
              <SelectItem value="all">All Events</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function UIPreferencesPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">UI Preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your workspace appearance</p>
      </div>
      <SettingCard title="Appearance" description="Theme and layout settings">
        <SettingRow label="Theme" description="Switch between light and dark mode">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <button onClick={() => setTheme('light')} className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
              <Sun className="h-3.5 w-3.5" /> Light
            </button>
            <button onClick={() => setTheme('dark')} className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>
        </SettingRow>
        <SettingRow label="Layout Density">
          <Select defaultValue="comfortable">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Chart Theme">
          <Select defaultValue="default">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="monochrome">Monochrome</SelectItem>
              <SelectItem value="vivid">Vivid</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Control alerts and reminders</p>
      </div>
      <SettingCard title="Alert Preferences" description="Choose which alerts to receive">
        <SettingRow label="High-Impact News Alerts" description="Show alerts for major economic events">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Event Countdown" description="Alert before events start">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Daily Plan Reminder" description="Remind to fill daily plan each morning">
          <Switch />
        </SettingRow>
        <SettingRow label="Weekly Review Reminder" description="Remind to review at end of week">
          <Switch />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionId>('modules');

  const renderPanel = () => {
    switch (activeSection) {
      case 'modules': return <WorkspaceModulesPanel />;
      case 'trading': return <TradingPreferencesPanel />;
      case 'journal': return <JournalBehaviorPanel />;
      case 'ai': return <AISettingsPanel />;
      case 'market': return <MarketSettingsPanel />;
      case 'ui': return <UIPreferencesPanel />;
      case 'notifications': return <NotificationsPanel />;
      default: return <WorkspaceModulesPanel />;
    }
  };

  return (
    <div className="p-6 h-full">
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
        <div className="w-56 shrink-0">
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
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
