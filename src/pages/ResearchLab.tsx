import { useEffect, useMemo, useState } from 'react';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FlaskConical, CheckCircle, XCircle, Clock, Wrench, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { loadUserStorage, saveUserStorage } from '@/lib/userStorage';

// ─── STRATEGY TESTING ───
interface Research {
  id: string;
  name: string;
  market: string;
  date: string;
  conditions: string;
  rules: string;
  outcome: 'Worked' | 'Failed' | '';
  status: 'Testing' | 'Approved' | 'Rejected';
  notes: string;
  winRate?: number;
  avgRR?: number;
  daysTested?: number;
  consistency?: number;
}

// ─── TOOL TESTING ───
interface DailyCheck {
  date: string;
  worked: boolean;
  note: string;
}

interface ToolEntry {
  id: string;
  name: string;
  category: 'Price Action' | 'Liquidity' | 'Session' | 'Behavior';
  description: string;
  status: 'Testing' | 'Validated' | 'Rejected';
  dailyChecks: DailyCheck[];
  bestSession: string;
  bestCondition: string;
}

const STRATEGY_KEY = 'ef_research_lab';
const TOOL_KEY = 'ef_tool_testing';

// ─── TOOL TESTING TAB ───
function ToolTestingTab() {
  const { user } = useAuth();
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Price Action' as ToolEntry['category'], description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: 'Price Action' as ToolEntry['category'], description: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkNote, setCheckNote] = useState('');

  useEffect(() => {
    if (!user) {
      setTools([]);
      return;
    }

    setTools(loadUserStorage<ToolEntry[]>(TOOL_KEY, user.id, []));
  }, [user]);

  const save = (updated: ToolEntry[]) => {
    setTools(updated);
    if (user) saveUserStorage(TOOL_KEY, user.id, updated);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const tool: ToolEntry = { id: crypto.randomUUID(), ...form, status: 'Testing', dailyChecks: [], bestSession: '', bestCondition: '' };
    save([tool, ...tools]);
    setForm({ name: '', category: 'Price Action', description: '' });
    setShowForm(false);
  };

  const handleEdit = (id: string) => {
    save(tools.map(t => t.id === id ? { ...t, name: editForm.name, category: editForm.category, description: editForm.description } : t));
    setEditingId(null);
  };

  const toggleDailyCheck = (toolId: string, worked: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    save(tools.map(t => {
      if (t.id !== toolId) return t;
      const existing = t.dailyChecks.findIndex(c => c.date === today);
      const checks = [...t.dailyChecks];
      if (existing >= 0) checks[existing] = { ...checks[existing], worked, note: checkNote };
      else checks.push({ date: today, worked, note: checkNote });
      return { ...t, dailyChecks: checks };
    }));
    setCheckNote('');
  };

  const getMetrics = (tool: ToolEntry) => {
    const total = tool.dailyChecks.length;
    const worked = tool.dailyChecks.filter(c => c.worked).length;
    const rate = total > 0 ? Math.round((worked / total) * 100) : 0;
    return { total, worked, rate };
  };

  const stats = useMemo(() => {
    const validated = tools.filter(t => t.status === 'Validated').length;
    const testing = tools.filter(t => t.status === 'Testing').length;
    const best = tools.filter(t => t.dailyChecks.length > 0).sort((a, b) => {
      const ra = getMetrics(a).rate, rb = getMetrics(b).rate;
      return rb - ra;
    });
    const worst = [...best].reverse();
    return {
      total: tools.length, validated, testing,
      bestTool: best[0]?.name || '-', bestRate: best[0] ? getMetrics(best[0]).rate : 0,
      worstTool: worst[0]?.name || '-', worstRate: worst[0] ? getMetrics(worst[0]).rate : 0,
    };
  }, [tools]);

  const insights = useMemo(() => {
    const msgs: string[] = [];
    tools.forEach(t => {
      const m = getMetrics(t);
      if (m.total >= 5 && m.rate >= 70) msgs.push(`${t.name} works ${m.rate}% of the time — highly reliable`);
      if (m.total >= 5 && m.rate < 40) msgs.push(`${t.name} only works ${m.rate}% — consider removing`);
      if (t.bestSession) msgs.push(`${t.name} works best in ${t.bestSession} session`);
      if (t.bestCondition) msgs.push(`${t.name} performs best in ${t.bestCondition} conditions`);
    });
    return msgs.slice(0, 4);
  }, [tools]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="TOTAL TOOLS" value={stats.total} />
        <MetricCard label="VALIDATED" value={stats.validated} trend="up" />
        <MetricCard label="MOST RELIABLE" value={stats.bestTool} subtitle={`${stats.bestRate}% accuracy`} trend="up" />
        <MetricCard label="LEAST RELIABLE" value={stats.worstTool} subtitle={`${stats.worstRate}% accuracy`} trend="down" />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">TOOL INSIGHTS</h3>
          {insights.map((msg, i) => (
            <p key={i} className="text-xs text-muted-foreground">• {msg}</p>
          ))}
        </div>
      )}

      {/* Tool Performance Summary */}
      {tools.filter(t => t.dailyChecks.length > 0).length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tool Performance Summary</span>
          </div>
          <div className="px-4">
            <div className="grid grid-cols-4 text-[10px] text-muted-foreground uppercase font-semibold py-2 border-b border-border/50">
              <span>Tool</span>
              <span className="text-center">Days Tested</span>
              <span className="text-center">Worked</span>
              <span className="text-center">Accuracy</span>
            </div>
            {tools.filter(t => t.dailyChecks.length > 0).map(tool => {
              const m = getMetrics(tool);
              return (
                <div key={tool.id} className="grid grid-cols-4 py-2 border-b border-border/20 last:border-0 text-sm">
                  <span className="font-medium">{tool.name}</span>
                  <span className="text-center text-muted-foreground">{m.total}</span>
                  <span className="text-center text-success">{m.worked}</span>
                  <span className={cn('text-center font-semibold',
                    m.rate >= 60 ? 'text-success' : m.rate >= 40 ? 'text-yellow-500' : 'text-destructive'
                  )}>{m.rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Add Tool
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Tool Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as any }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Price Action', 'Liquidity', 'Session', 'Behavior'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-xs min-h-[50px]" /></div>
          <div className="md:col-span-3 flex gap-2">
            <Button onClick={handleAdd} size="sm" className="gap-1"><Plus className="h-3 w-3" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Tool Cards */}
      <div className="space-y-3">
        {tools.map(tool => {
          const m = getMetrics(tool);
          const todayCheck = tool.dailyChecks.find(c => c.date === today);
          const isExpanded = expandedId === tool.id;
          const isEditing = editingId === tool.id;

          return (
            <div key={tool.id} className={cn('bg-card border rounded-lg p-4 group',
              tool.status === 'Validated' ? 'border-success/30' :
              tool.status === 'Rejected' ? 'border-destructive/30' : 'border-border'
            )}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className={cn('h-5 w-5',
                    tool.status === 'Validated' ? 'text-success' :
                    tool.status === 'Rejected' ? 'text-destructive' : 'text-primary'
                  )} />
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-7 text-xs w-40" />
                      <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v as any }))}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Price Action', 'Liquidity', 'Session', 'Behavior'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleEdit(tool.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-semibold">{tool.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{tool.category}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                          tool.status === 'Validated' ? 'bg-success/10 text-success' :
                          tool.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                        )}>{tool.status}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {tool.status === 'Testing' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => save(tools.map(t => t.id === tool.id ? { ...t, status: 'Validated' as const } : t))} title="Validate">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => save(tools.map(t => t.id === tool.id ? { ...t, status: 'Rejected' as const } : t))} title="Reject">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {tool.status !== 'Testing' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => save(tools.map(t => t.id === tool.id ? { ...t, status: 'Testing' as const } : t))} title="Back to Testing">
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(tool.id); setEditForm({ name: tool.name, category: tool.category, description: tool.description }); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => save(tools.filter(t => t.id !== tool.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : tool.id)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-xs"><span className="text-muted-foreground">Days Tested:</span> <span className="font-medium">{m.total}</span></div>
                <div className="text-xs"><span className="text-muted-foreground">Days Worked:</span> <span className="font-medium text-success">{m.worked}</span></div>
                <div className="text-xs"><span className="text-muted-foreground">Success Rate:</span> <span className={cn('font-medium', m.rate >= 60 ? 'text-success' : m.rate >= 40 ? 'text-foreground' : 'text-destructive')}>{m.rate}%</span></div>
                {tool.bestSession && <div className="text-xs"><span className="text-muted-foreground">Best Session:</span> <span className="font-medium">{tool.bestSession}</span></div>}
                {tool.bestCondition && <div className="text-xs"><span className="text-muted-foreground">Best Condition:</span> <span className="font-medium">{tool.bestCondition}</span></div>}
              </div>

              {tool.description && <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">{tool.description}</p>}

              {/* Today's Check */}
              <div className="mt-3 border-t border-border/50 pt-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">TODAY:</span>
                  {todayCheck ? (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded', todayCheck.worked ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                      {todayCheck.worked ? '✅ Worked' : '❌ Did not work'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input placeholder="Note (optional)" value={expandedId === tool.id ? checkNote : ''} onChange={e => { setExpandedId(tool.id); setCheckNote(e.target.value); }} className="h-7 text-xs w-40" />
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-success border-success/30" onClick={() => toggleDailyCheck(tool.id, true)}>
                        <CheckCircle className="h-3 w-3" /> Worked
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={() => toggleDailyCheck(tool.id, false)}>
                        <XCircle className="h-3 w-3" /> Failed
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded: Daily History */}
              {isExpanded && (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">DAILY LOG</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {[...tool.dailyChecks].reverse().slice(0, 30).map(check => (
                      <div key={check.date} className={cn('w-7 h-7 rounded flex items-center justify-center text-[9px] font-medium cursor-default',
                        check.worked ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                      )} title={`${check.date}: ${check.worked ? 'Worked' : 'Failed'}${check.note ? ` — ${check.note}` : ''}`}>
                        {new Date(check.date).getDate()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STRATEGY TESTING TAB ───
function StrategyTestingTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Research[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Research>>({ name: '', market: '', date: new Date().toISOString().split('T')[0], conditions: '', rules: '', outcome: '', status: 'Testing', notes: '' });

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    setItems(loadUserStorage<Research[]>(STRATEGY_KEY, user.id, []));
  }, [user]);

  const save = (updated: Research[]) => {
    setItems(updated);
    if (user) saveUserStorage(STRATEGY_KEY, user.id, updated);
  };

  const handleAdd = () => {
    if (!form.name) return;
    const item: Research = { id: crypto.randomUUID(), ...form as any };
    save([item, ...items]);
    setForm({ name: '', market: '', date: new Date().toISOString().split('T')[0], conditions: '', rules: '', outcome: '', status: 'Testing', notes: '' });
    setShowForm(false);
  };

  const stats = useMemo(() => {
    const approved = items.filter(i => i.status === 'Approved').length;
    const testing = items.filter(i => i.status === 'Testing').length;
    const rejected = items.filter(i => i.status === 'Rejected').length;
    const best = items.filter(i => i.winRate).sort((a, b) => (b.winRate || 0) - (a.winRate || 0))[0];
    return { total: items.length, approved, testing, rejected, best: best?.name || '-', bestWR: best?.winRate || 0 };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="TOTAL STRATEGIES" value={stats.total} />
        <MetricCard label="TESTING" value={stats.testing} />
        <MetricCard label="APPROVED" value={stats.approved} trend="up" />
        <MetricCard label="REJECTED" value={stats.rejected} trend="down" />
        <MetricCard label="BEST STRATEGY" value={stats.best} subtitle={`${stats.bestWR}% WR`} trend="up" />
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1 text-xs" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3" /> Add Strategy</Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label className="text-xs">Strategy Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Market</Label><Input value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Conditions</Label><Input value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} className="h-8 text-xs" /></div>
          <div className="md:col-span-2"><Label className="text-xs">Rules</Label><Textarea value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} className="text-xs min-h-[60px]" /></div>
          <div className="md:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs min-h-[60px]" /></div>
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={handleAdd} size="sm" className="gap-1"><Plus className="h-3 w-3" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className={cn('bg-card border rounded-lg p-4 group',
            item.status === 'Approved' ? 'border-success/30' :
            item.status === 'Rejected' ? 'border-destructive/30' : 'border-border'
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className={cn('h-5 w-5',
                  item.status === 'Approved' ? 'text-success' :
                  item.status === 'Rejected' ? 'text-destructive' : 'text-primary'
                )} />
                <div>
                  <h4 className="text-sm font-semibold">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{item.market}</span>
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                      item.status === 'Approved' ? 'bg-success/10 text-success' :
                      item.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                    )}>{item.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {item.status === 'Testing' && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => save(items.map(i => i.id === item.id ? { ...i, status: 'Approved' as const } : i))}><CheckCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => save(items.map(i => i.id === item.id ? { ...i, status: 'Rejected' as const } : i))}><XCircle className="h-4 w-4" /></Button>
                  </>
                )}
                {item.status !== 'Testing' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => save(items.map(i => i.id === item.id ? { ...i, status: 'Testing' as const } : i))}><Clock className="h-4 w-4" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => save(items.filter(i => i.id !== item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {item.winRate !== undefined && <div className="text-xs"><span className="text-muted-foreground">Win Rate:</span> <span className="font-medium">{item.winRate}%</span></div>}
              {item.avgRR !== undefined && <div className="text-xs"><span className="text-muted-foreground">Avg RR:</span> <span className="font-medium">{item.avgRR}</span></div>}
              {item.daysTested !== undefined && <div className="text-xs"><span className="text-muted-foreground">Days Tested:</span> <span className="font-medium">{item.daysTested}</span></div>}
              {item.consistency !== undefined && <div className="text-xs"><span className="text-muted-foreground">Consistency:</span> <span className="font-medium">{item.consistency}%</span></div>}
            </div>
            {item.rules && <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">{item.rules}</p>}
            {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───
export default function ResearchLab() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Research Lab" subtitle="Test tools and strategies before real trading">
        <ThemeToggle />
      </PageHeader>

      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tools" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> Tool Testing</TabsTrigger>
          <TabsTrigger value="strategies" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Strategy Testing</TabsTrigger>
        </TabsList>
        <TabsContent value="tools"><ToolTestingTab /></TabsContent>
        <TabsContent value="strategies"><StrategyTestingTab /></TabsContent>
      </Tabs>
    </div>
  );
}
