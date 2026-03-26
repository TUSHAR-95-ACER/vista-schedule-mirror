import { useState, useMemo } from 'react';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolEntry {
  id: string; name: string; category: string; description: string;
  status: 'Testing' | 'Validated' | 'Rejected';
  dailyChecks: { date: string; worked: boolean; note: string }[];
  bestSession: string; bestCondition: string;
}

const TOOL_KEY = 'ef_tool_testing';

function loadTools(): ToolEntry[] {
  try { return JSON.parse(localStorage.getItem(TOOL_KEY) || '[]'); } catch { return []; }
}

function saveTools(tools: ToolEntry[]) {
  localStorage.setItem(TOOL_KEY, JSON.stringify(tools));
}

export default function ToolPanel() {
  const [tools, setTools] = useState<ToolEntry[]>(loadTools);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Validated' | 'Testing' | 'Rejected'>('all');
  const today = new Date().toISOString().split('T')[0];

  const save = (updated: ToolEntry[]) => { setTools(updated); saveTools(updated); };

  const markToday = (toolId: string, worked: boolean) => {
    save(tools.map(t => {
      if (t.id !== toolId) return t;
      const checks = [...t.dailyChecks];
      const idx = checks.findIndex(c => c.date === today);
      if (idx >= 0) checks[idx] = { ...checks[idx], worked };
      else checks.push({ date: today, worked, note: '' });
      return { ...t, dailyChecks: checks };
    }));
  };

  const getMetrics = (tool: ToolEntry) => {
    const total = tool.dailyChecks.length;
    const worked = tool.dailyChecks.filter(c => c.worked).length;
    const rate = total > 0 ? Math.round((worked / total) * 100) : 0;
    return { total, worked, rate };
  };

  const filtered = useMemo(() => {
    return tools
      .filter(t => filter === 'all' || t.status === filter)
      .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  }, [tools, filter, search]);

  const stats = useMemo(() => {
    const validated = tools.filter(t => t.status === 'Validated').length;
    const testing = tools.filter(t => t.status === 'Testing').length;
    const pending = tools.filter(t => !t.dailyChecks.find(c => c.date === today)).length;
    const rates = tools.filter(t => t.dailyChecks.length > 0).map(t => getMetrics(t).rate);
    const avgAcc = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
    return { validated, testing, pending, avgAcc };
  }, [tools, today]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Trading Tool Panel" subtitle="Quick access to all tools">
        <ThemeToggle />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Validated" value={stats.validated} icon={CheckCircle} trend="up" />
        <MetricCard label="Testing" value={stats.testing} icon={Wrench} />
        <MetricCard label="Pending Today" value={stats.pending} subtitle="Not yet marked" />
        <MetricCard label="Avg Accuracy" value={`${stats.avgAcc}%`} trend={stats.avgAcc >= 60 ? 'up' : 'down'} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tools..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="h-8 text-xs w-36"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tools</SelectItem>
            <SelectItem value="Validated">Validated</SelectItem>
            <SelectItem value="Testing">Testing</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(tool => {
          const m = getMetrics(tool);
          const todayCheck = tool.dailyChecks.find(c => c.date === today);

          return (
            <div key={tool.id} className={cn(
              'bg-card border rounded-xl p-4 transition-all hover:shadow-md',
              tool.status === 'Validated' ? 'border-success/30' :
              tool.status === 'Rejected' ? 'border-destructive/30' : 'border-border',
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wrench className={cn('h-4 w-4',
                    tool.status === 'Validated' ? 'text-success' :
                    tool.status === 'Rejected' ? 'text-destructive' : 'text-primary'
                  )} />
                  <div>
                    <h4 className="text-sm font-semibold">{tool.name}</h4>
                    <span className="text-[10px] text-muted-foreground">{tool.category}</span>
                  </div>
                </div>
                <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold',
                  tool.status === 'Validated' ? 'bg-success/10 text-success' :
                  tool.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}>{tool.status}</span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-muted/30 rounded-lg p-2">
                  <p className={cn('text-lg font-bold', m.rate >= 60 ? 'text-success' : m.rate >= 40 ? 'text-foreground' : 'text-destructive')}>{m.rate}%</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Accuracy</p>
                </div>
                <div className="text-center bg-muted/30 rounded-lg p-2">
                  <p className="text-lg font-bold">{m.total}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Days</p>
                </div>
                <div className="text-center bg-muted/30 rounded-lg p-2">
                  <p className="text-sm font-medium truncate">{tool.bestSession || '-'}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Best Session</p>
                </div>
              </div>

              {/* Today's Action */}
              <div className="border-t border-border/50 pt-3">
                {todayCheck ? (
                  <div className={cn('text-xs font-medium text-center py-1.5 rounded-lg',
                    todayCheck.worked ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  )}>
                    {todayCheck.worked ? '✅ Worked Today' : '❌ Did Not Work'}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10" onClick={() => markToday(tool.id, true)}>
                      <CheckCircle className="h-3 w-3" /> Worked
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => markToday(tool.id, false)}>
                      <XCircle className="h-3 w-3" /> Failed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No tools found. Add tools in the Research Lab.
        </div>
      )}
    </div>
  );
}
