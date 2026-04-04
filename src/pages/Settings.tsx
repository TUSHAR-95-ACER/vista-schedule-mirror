import { useState } from 'react';
import { TOGGLEABLE_PAGES, usePageVisibility } from '@/contexts/PageVisibilityContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  ToggleLeft,
  CheckCircle2,
  XCircle,
  Target,
  BarChart3,
  Brain,
  Globe,
  Palette,
  Bell,
  Sun,
  Moon,
  Shield,
  Database,
  Sliders,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useTrading } from '@/contexts/TradingContext';

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 hover:border-border transition-colors">
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
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/10 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold">Workspace Modules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Toggle pages on/off. Hidden pages won't appear in sidebar.</p>
        </div>
        <Button variant="outline" size="sm" onClick={enableAll} className="gap-1.5">
          <ToggleLeft className="h-4 w-4" /> Enable All
        </Button>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-xs font-medium">{enabledCount} Active</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{totalCount - enabledCount} Hidden</span>
        </div>
      </div>
      {grouped.map(({ section, pages }) => (
        <div key={section} className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{section}</h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
            {pages.map(page => {
              const enabled = enabledPages[page.path] !== false;
              return (
                <div key={page.path} className={cn("flex items-center justify-between px-4 py-3 transition-colors", !enabled && "bg-muted/20")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", enabled ? 'bg-success' : 'bg-muted-foreground/30')} />
                    <span className={cn("text-sm font-medium", enabled ? 'text-foreground' : 'text-muted-foreground')}>{page.label}</span>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => togglePage(page.path)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TradingPreferencesPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Trading Preferences</h2>
      <SettingCard title="Risk Management" description="Default risk parameters for new trades">
        <SettingRow label="Default Risk %" description="Applied to each new trade">
          <Input type="number" defaultValue="1" step="0.5" min="0.1" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Default Risk:Reward" description="Target RR ratio">
          <Input type="number" defaultValue="2" step="0.5" min="0.5" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Max Daily Trades" description="Limit trades per day">
          <Input type="number" defaultValue="3" min="1" max="20" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Max Daily Loss" description="Stop trading after hitting this loss">
          <Input type="number" defaultValue="3" step="0.5" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
      </SettingCard>
      <SettingCard title="Session & Pairs" description="Primary trading focus">
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
        <SettingRow label="Default Market">
          <Select defaultValue="Forex">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Forex', 'Crypto', 'Commodities', 'Indices', 'Stocks', 'Futures'].map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function JournalBehaviorPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Journal Behavior</h2>
      <SettingCard title="Trade Logging" description="Control trade entry defaults and behaviors">
        <SettingRow label="Default Trade Size" description="Pre-filled lot size">
          <Input type="number" defaultValue="0.1" step="0.01" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Auto-save Plans" description="Save plans automatically as you type">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Require Grade" description="Force grade selection on every trade">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Require Psychology" description="Force emotion/focus/discipline entry">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Show Entry Gate" description="Show checklist confirmation before logging trades">
          <Switch defaultChecked />
        </SettingRow>
      </SettingCard>
      <SettingCard title="Plan Defaults" description="Default values for daily and weekly plans">
        <SettingRow label="Default Max Trades" description="Pre-filled max trades per day">
          <Input type="number" defaultValue="3" min="1" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Default Risk Limit" description="Pre-filled risk limit text">
          <Input defaultValue="1% per trade" className="h-8 w-40 text-xs rounded-lg" />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function AISettingsPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">AI Settings</h2>
      <SettingCard title="AI Coach" description="Personalize AI-powered trading analysis">
        <SettingRow label="AI Coach" description="Enable AI-powered trade analysis">
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
            <SelectTrigger className="h-8 w-44 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct & Actionable</SelectItem>
              <SelectItem value="detailed">Detailed & Educational</SelectItem>
              <SelectItem value="motivational">Motivational</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Auto-generate Insights" description="AI reviews trades automatically after logging">
          <Switch />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function MarketSettingsPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Market & Data</h2>
      <SettingCard title="Timezone & Calendar" description="Economic calendar and market data settings">
        <SettingRow label="Default Timezone">
          <Select defaultValue="UTC">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['UTC', 'EST', 'GMT', 'CET', 'IST', 'JST', 'AEST'].map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="News Filter" description="Which currencies to track">
          <Select defaultValue="usd">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD Only</SelectItem>
              <SelectItem value="major">Major Currencies</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Impact Filter" description="Minimum event importance">
          <Select defaultValue="high">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High Only</SelectItem>
              <SelectItem value="medium">Medium & High</SelectItem>
              <SelectItem value="all">All Events</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
      <SettingCard title="TradingView Integration" description="Live market ticker settings">
        <SettingRow label="Show Ticker" description="Display TradingView ticker tape at top">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Ticker Symbols" description="Comma-separated symbols">
          <Input defaultValue="EURUSD, GBPUSD, XAUUSD, US30, NAS100" className="h-8 w-56 text-xs rounded-lg" />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function UIPreferencesPanel() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">UI Preferences</h2>
      <SettingCard title="Appearance" description="Theme and visual settings">
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
        <SettingRow label="Chart Theme" description="Color scheme for charts">
          <Select defaultValue="default">
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="monochrome">Monochrome</SelectItem>
              <SelectItem value="vivid">Vivid</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Sidebar Collapsed" description="Start with sidebar collapsed">
          <Switch />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Notifications</h2>
      <SettingCard title="Alert Preferences" description="Control reminders and alerts">
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
        <SettingRow label="Trade Limit Warning" description="Alert when approaching max daily trades">
          <Switch defaultChecked />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function AccountPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Account & Profile</h2>
      <SettingCard title="Profile" description="Your account information">
        <SettingRow label="Display Name">
          <Input defaultValue="" placeholder="Your name" className="h-8 w-48 text-xs rounded-lg" />
        </SettingRow>
        <SettingRow label="Trading Style">
          <Select defaultValue="scalper">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scalper">Scalper</SelectItem>
              <SelectItem value="day">Day Trader</SelectItem>
              <SelectItem value="swing">Swing Trader</SelectItem>
              <SelectItem value="position">Position Trader</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Experience Level">
          <Select defaultValue="intermediate">
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function DataPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Data Management</h2>
      <SettingCard title="Import & Export" description="Manage your trading data">
        <SettingRow label="Export Trades" description="Download all trades as CSV">
          <Button variant="outline" size="sm" className="text-xs">Export CSV</Button>
        </SettingRow>
        <SettingRow label="Export Plans" description="Download all plans as JSON">
          <Button variant="outline" size="sm" className="text-xs">Export JSON</Button>
        </SettingRow>
        <SettingRow label="Import Trades" description="Import trades from CSV file">
          <Button variant="outline" size="sm" className="text-xs">Import</Button>
        </SettingRow>
      </SettingCard>
      <SettingCard title="Reset" description="Danger zone — these actions cannot be undone">
        <SettingRow label="Clear All Trades" description="Permanently delete all trade records">
          <Button variant="destructive" size="sm" className="text-xs">Clear Trades</Button>
        </SettingRow>
        <SettingRow label="Reset All Settings" description="Restore all settings to defaults">
          <Button variant="destructive" size="sm" className="text-xs">Reset</Button>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function RiskManagementPanel() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-heading font-bold">Risk Rules</h2>
      <SettingCard title="Trading Rules" description="Rules enforced during trade entry">
        <SettingRow label="Max Concurrent Trades" description="Maximum open positions at once">
          <Input type="number" defaultValue="2" min="1" max="10" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Max Lot Size" description="Maximum lot size per trade">
          <Input type="number" defaultValue="1.0" step="0.1" className="h-8 w-20 text-xs font-mono rounded-lg" />
        </SettingRow>
        <SettingRow label="Enforce Daily Loss Limit" description="Block trade entry after daily loss limit hit">
          <Switch />
        </SettingRow>
        <SettingRow label="Enforce Trade Count Limit" description="Block trade entry after max trades reached">
          <Switch defaultChecked />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

const tabs = [
  { id: 'modules', label: 'Modules', icon: Sliders },
  { id: 'trading', label: 'Trading', icon: Target },
  { id: 'journal', label: 'Journal', icon: BarChart3 },
  { id: 'risk', label: 'Risk Rules', icon: Shield },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'market', label: 'Market', icon: Globe },
  { id: 'ui', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'account', label: 'Profile', icon: User },
  { id: 'data', label: 'Data', icon: Database },
] as const;

export default function Settings() {
  const [activeTab, setActiveTab] = useState('modules');

  const renderPanel = () => {
    switch (activeTab) {
      case 'modules': return <WorkspaceModulesPanel />;
      case 'trading': return <TradingPreferencesPanel />;
      case 'journal': return <JournalBehaviorPanel />;
      case 'risk': return <RiskManagementPanel />;
      case 'ai': return <AISettingsPanel />;
      case 'market': return <MarketSettingsPanel />;
      case 'ui': return <UIPreferencesPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'account': return <AccountPanel />;
      case 'data': return <DataPanel />;
      default: return <WorkspaceModulesPanel />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your trading workspace</p>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/50 min-w-max">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Panel */}
      <div className="min-h-[400px]">
        {renderPanel()}
      </div>
    </div>
  );
}
