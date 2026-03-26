import { useState, useMemo } from 'react';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle, AlertTriangle, Clock, Plus, Pencil, Trash2, X, Save, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── CHECKLIST STORAGE ───
const CHECKLIST_KEY = 'ef_daily_checklist';
const CUSTOM_ITEMS_KEY = 'ef_checklist_items';

interface ChecklistDay {
  date: string;
  items: Record<string, boolean>;
  score: number;
}

interface ChecklistItem {
  id: string;
  label: string;
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: 'pre_analysis', label: 'Pre-analysis done' },
  { id: 'key_levels', label: 'Key levels marked' },
  { id: 'news_checked', label: 'News checked' },
  { id: 'mind_calm', label: 'Mind calm & focused' },
  { id: 'following_system', label: 'Following system' },
  { id: 'risk_defined', label: 'Risk defined' },
  { id: 'no_emotional', label: 'No emotional trading' },
];

function loadItems(): ChecklistItem[] {
  try {
    const stored = localStorage.getItem(CUSTOM_ITEMS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_ITEMS;
  } catch { return DEFAULT_ITEMS; }
}

function saveItems(items: ChecklistItem[]) {
  localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
}

function loadHistory(): ChecklistDay[] {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '[]'); } catch { return []; }
}

function saveHistory(h: ChecklistDay[]) {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(h));
}

// ─── TOOL HELPERS ───
interface ToolEntry {
  id: string; name: string; category: string; description: string;
  status: string; dailyChecks: { date: string; worked: boolean; note: string }[];
  bestSession: string; bestCondition: string;
}

function loadTools(): ToolEntry[] {
  try { return JSON.parse(localStorage.getItem('ef_tool_testing') || '[]'); } catch { return []; }
}

function saveTools(tools: ToolEntry[]) {
  localStorage.setItem('ef_tool_testing', JSON.stringify(tools));
}

// ─── EXPORTS ───
export function getDailyChecklistScore(): { score: number; completed: boolean; date: string } {
  const today = new Date().toISOString().split('T')[0];
  const history = loadHistory();
  const todayEntry = history.find(h => h.date === today);
  return { score: todayEntry?.score || 0, completed: !!todayEntry && todayEntry.score > 0, date: today };
}

export function isChecklistPassed(): boolean {
  return getDailyChecklistScore().score >= 60;
}

export default function DailyChecklist() {
  const today = new Date().toISOString().split('T')[0];

  // Checklist items (customizable)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(loadItems);
  const [history, setHistory] = useState<ChecklistDay[]>(loadHistory);
  const todayEntry = useMemo(() => history.find(h => h.date === today), [history, today]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => todayEntry?.items || {});

  // CRUD state
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Tools
  const [tools, setTools] = useState<ToolEntry[]>(loadTools);

  // ─── CHECKLIST LOGIC ───
  const score = useMemo(() => {
    const total = checklistItems.length;
    const done = checklistItems.filter(i => checked[i.id]).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [checked, checklistItems]);

  const status = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';

  const persistChecklist = (updatedChecked: Record<string, boolean>) => {
    const done = checklistItems.filter(i => updatedChecked[i.id]).length;
    const newScore = checklistItems.length > 0 ? Math.round((done / checklistItems.length) * 100) : 0;
    const newHistory = history.filter(h => h.date !== today);
    newHistory.push({ date: today, items: updatedChecked, score: newScore });
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const toggle = (id: string) => {
    const updated = { ...checked, [id]: !checked[id] };
    setChecked(updated);
    persistChecklist(updated);
  };

  // ─── CRUD ───
  const addItem = () => {
    if (!newLabel.trim()) return;
    const id = `custom_${Date.now()}`;
    const updated = [...checklistItems, { id, label: newLabel.trim() }];
    setChecklistItems(updated);
    saveItems(updated);
    setNewLabel('');
    setIsAdding(false);
  };

  const deleteItem = (id: string) => {
    const updated = checklistItems.filter(i => i.id !== id);
    setChecklistItems(updated);
    saveItems(updated);
    const newChecked = { ...checked };
    delete newChecked[id];
    setChecked(newChecked);
    persistChecklist(newChecked);
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const saveEdit = () => {
    if (!editLabel.trim() || !editingId) return;
    const updated = checklistItems.map(i => i.id === editingId ? { ...i, label: editLabel.trim() } : i);
    setChecklistItems(updated);
    saveItems(updated);
    setEditingId(null);
    setEditLabel('');
  };

  // ─── TOOL ACTIONS ───
  const markTool = (toolId: string, worked: boolean) => {
    const updated = tools.map(t => {
      if (t.id !== toolId) return t;
      const checks = [...t.dailyChecks];
      const idx = checks.findIndex(c => c.date === today);
      if (idx >= 0) checks[idx] = { ...checks[idx], worked };
      else checks.push({ date: today, worked, note: '' });
      return { ...t, dailyChecks: checks };
    });
    setTools(updated);
    saveTools(updated);
  };

  const getToolStatus = (tool: ToolEntry) => {
    const todayCheck = tool.dailyChecks.find(c => c.date === today);
    if (!todayCheck) return 'pending';
    return todayCheck.worked ? 'worked' : 'failed';
  };

  const getToolStats = (tool: ToolEntry) => {
    const total = tool.dailyChecks.length;
    const worked = tool.dailyChecks.filter(c => c.worked).length;
    const rate = total > 0 ? Math.round((worked / total) * 100) : 0;
    return { total, worked, rate };
  };

  const activeTools = tools.filter(t => t.status === 'Testing' || t.status === 'Validated');

  // ─── HISTORY STATS ───
  const stats = useMemo(() => {
    const last30 = history.filter(h => {
      const diff = (new Date().getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });
    const completed = last30.filter(h => h.score >= 60).length;
    const skipped = last30.filter(h => h.score < 60).length;
    const avgScore = last30.length > 0 ? Math.round(last30.reduce((s, h) => s + h.score, 0) / last30.length) : 0;
    return { completed, skipped, avgScore, total: last30.length };
  }, [history]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Daily Checklist" subtitle="Complete before trading">
        <ThemeToggle />
      </PageHeader>

      {/* ─── SCORE CARD ─── */}
      <div className={cn(
        'rounded-xl border-2 p-6 mb-6 text-center transition-all',
        status === 'green' && 'border-success/40 bg-success/5',
        status === 'yellow' && 'border-yellow-500/40 bg-yellow-500/5',
        status === 'red' && 'border-destructive/40 bg-destructive/5',
      )}>
        <div className="flex items-center justify-center gap-3 mb-2">
          {status === 'green' && <CheckCircle className="h-8 w-8 text-success" />}
          {status === 'yellow' && <AlertTriangle className="h-8 w-8 text-yellow-500" />}
          {status === 'red' && <Shield className="h-8 w-8 text-destructive" />}
          <span className={cn(
            'text-5xl font-bold',
            status === 'green' && 'text-success',
            status === 'yellow' && 'text-yellow-500',
            status === 'red' && 'text-destructive',
          )}>{score}%</span>
        </div>
        <p className={cn(
          'text-sm font-semibold uppercase tracking-wider',
          status === 'green' && 'text-success',
          status === 'yellow' && 'text-yellow-500',
          status === 'red' && 'text-destructive',
        )}>
          {status === 'green' ? 'READY TO TRADE' : status === 'yellow' ? 'TRADE WITH CAUTION' : 'DO NOT TRADE'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {checklistItems.filter(i => checked[i.id]).length} / {checklistItems.length} items completed
        </p>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Days Completed" value={stats.completed} icon={CheckCircle} trend="up" />
        <MetricCard label="Days Skipped" value={stats.skipped} icon={Clock} trend={stats.skipped > 3 ? 'down' : 'neutral'} />
        <MetricCard label="Avg Score" value={`${stats.avgScore}%`} icon={Shield} trend={stats.avgScore >= 70 ? 'up' : 'down'} />
      </div>

      {/* ─── TWO COLUMN LAYOUT: Checklist + Tools ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: CHECKLIST */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              DISCIPLINE CHECKLIST
            </h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsAdding(true)}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>

          <div className="space-y-2">
            {checklistItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 group py-1.5">
                <Checkbox
                  checked={!!checked[item.id]}
                  onCheckedChange={() => toggle(item.id)}
                  className="h-5 w-5"
                />
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="h-7 text-sm flex-1"
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={saveEdit}>
                      <Save className="h-3 w-3 text-success" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={cn(
                      'text-sm flex-1 transition-all cursor-pointer',
                      checked[item.id] ? 'text-muted-foreground line-through' : 'text-foreground'
                    )} onClick={() => toggle(item.id)}>
                      {item.label}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(item)}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {isAdding && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <Input
                  placeholder="New checklist item..."
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <Button size="sm" className="h-8 text-xs gap-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setIsAdding(false); setNewLabel(''); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: TOOL QUICK ACTIONS */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              TOOLS QUICK ACTION
            </h3>
          </div>

          {activeTools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTools.map(tool => {
                const s = getToolStatus(tool);
                const toolStats = getToolStats(tool);
                return (
                  <div key={tool.id} className={cn(
                    'border rounded-lg p-3 transition-all',
                    s === 'worked' && 'border-success/40 bg-success/5',
                    s === 'failed' && 'border-destructive/40 bg-destructive/5',
                    s === 'pending' && 'border-border bg-muted/20',
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold">{tool.name}</p>
                        <p className="text-[10px] text-muted-foreground">{toolStats.total}d tested · {toolStats.rate}% accuracy</p>
                      </div>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded',
                        tool.status === 'Validated' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                      )}>{tool.status}</span>
                    </div>

                    {s === 'pending' ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 text-success border-success/30 hover:bg-success/10" onClick={() => markTool(tool.id, true)}>
                          <CheckCircle className="h-3 w-3" /> Worked
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => markTool(tool.id, false)}>
                          <X className="h-3 w-3" /> Failed
                        </Button>
                      </div>
                    ) : (
                      <div className={cn('text-xs font-medium text-center py-1 rounded',
                        s === 'worked' ? 'text-success' : 'text-destructive'
                      )}>
                        {s === 'worked' ? '✔ Worked Today' : '✖ Did Not Work'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground/60">
              <Wrench className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active tools yet.</p>
              <p className="text-xs mt-1">Add tools in the Research Lab to track them here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── INSIGHT ─── */}
      {stats.total >= 3 && (
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">CHECKLIST INSIGHTS</h3>
          {stats.avgScore >= 70 && <p className="text-xs text-muted-foreground">• Average score {stats.avgScore}% — strong discipline</p>}
          {stats.avgScore < 70 && stats.avgScore > 0 && <p className="text-xs text-muted-foreground">• Average score {stats.avgScore}% — aim for 80%+ before trading</p>}
          {stats.skipped > stats.completed && <p className="text-xs text-muted-foreground">• You skip more days than you complete — build the habit</p>}
          {stats.completed > stats.skipped && <p className="text-xs text-muted-foreground">• Good consistency — {stats.completed} completed vs {stats.skipped} skipped</p>}
        </div>
      )}
    </div>
  );
}
