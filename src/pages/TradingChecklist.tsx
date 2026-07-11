import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addDays, subDays, startOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns';
import {
  ChevronDown, ChevronRight, Plus, Trash2, GripVertical, RotateCcw,
  CheckCircle2, Flame, ListChecks, LayoutGrid, Copy, Sparkles, Calendar as CalendarIcon,
  Settings2, ChevronLeft, ChevronRight as ChevronRightIcon, BookOpen, Sun, Search,
  ClipboardCheck, TrendingUp, Activity, Brain, GraduationCap, Wrench, ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ---------- Types ----------
type ChecklistItem = { id: string; label: string; done: boolean };
type ChecklistSection = {
  id: string; title: string; description: string; icon: string;
  color: string; items: ChecklistItem[];
};
type Template = {
  id: string; name: string; description?: string | null; sections: ChecklistSection[];
};

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Default template ----------
const ICONS: Record<string, any> = {
  ClipboardCheck, TrendingUp, Activity, Wrench, BookOpen, Brain, GraduationCap, ListTodo, Sparkles, Sun,
};
const ICON_KEYS = Object.keys(ICONS);

const DEFAULT_SECTIONS: () => ChecklistSection[] = () => [
  { id: uid(), title: 'Pre-Market Preparation', description: 'Set the stage before the bell.', icon: 'Sun', color: 'from-amber-500/25 to-amber-500/5',
    items: ['Economic calendar checked','News reviewed','DXY reviewed','HTF bias marked','Liquidity mapped','Risk planned'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Market Analysis', description: 'Read every timeframe with intent.', icon: 'TrendingUp', color: 'from-emerald-500/25 to-emerald-500/5',
    items: ['Daily bias completed','4H bias completed','1H bias completed','Premium / Discount marked','Key levels identified','Market condition selected'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Trading Session', description: 'Execute the plan, nothing else.', icon: 'Activity', color: 'from-primary/25 to-primary/5',
    items: ['Waited for setup','No FOMO','Entry confirmed','Risk respected','Stop loss placed','Take profit placed'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Trade Management', description: 'Protect capital, manage emotion.', icon: 'Wrench', color: 'from-sky-500/25 to-sky-500/5',
    items: ['Breakeven managed','No emotional exits','Followed plan','No revenge trades','No overtrading'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Post Trade Review', description: 'Learn from every trade.', icon: 'ClipboardCheck', color: 'from-violet-500/25 to-violet-500/5',
    items: ['Journal completed','Screenshots uploaded','Lessons written','Mistakes identified','AI Coach reviewed'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Psychology', description: 'The mental edge.', icon: 'Brain', color: 'from-pink-500/25 to-pink-500/5',
    items: ['Stayed patient','Stayed disciplined','Followed rules','Emotion controlled','Confidence maintained'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Learning', description: 'Compound your knowledge.', icon: 'GraduationCap', color: 'from-teal-500/25 to-teal-500/5',
    items: ['Read notes','Reviewed notebook','Studied setup','Watched educational content'].map(l => ({ id: uid(), label: l, done: false })) },
];

// ---------- Ring ----------
function ProgressRing({ value, size = 96, stroke = 8, gradientId = 'ringGrad', label, sublabel }: {
  value: number; size?: number; stroke?: number; gradientId?: string; label?: string; sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--gold, 45 80% 55%))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeOpacity={0.45} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} style={{ transition: 'stroke-dasharray 500ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold text-foreground" style={{ fontSize: size * 0.22 }}>
          {Math.round(pct)}%
        </span>
        {label && <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</span>}
        {sublabel && <span className="text-[9px] text-muted-foreground/70">{sublabel}</span>}
      </div>
    </div>
  );
}

// ---------- Stat card ----------
function StatCard({ icon: Icon, label, value, sublabel, accent }: {
  icon: any; label: string; value: string | number; sublabel?: string; accent: string;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.4)]'
    )}>
      <div className={cn('absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40', accent)} />
      <div className="relative flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center border border-border/70 bg-background/60')}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="font-heading font-bold text-2xl leading-tight text-foreground">{value}</p>
          {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function computeSectionPct(s: ChecklistSection) {
  if (!s.items.length) return 0;
  return (s.items.filter(i => i.done).length / s.items.length) * 100;
}
function computeOverall(sections: ChecklistSection[]) {
  const total = sections.reduce((a, s) => a + s.items.length, 0);
  const done = sections.reduce((a, s) => a + s.items.filter(i => i.done).length, 0);
  return { total, done, pct: total ? (done / total) * 100 : 0, sectionsDone: sections.filter(s => s.items.length && s.items.every(i => i.done)).length };
}
const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

// ---------- Page ----------
export default function TradingChecklist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = dateKey(date);

  // ---- Load today's checklist ----
  const { data: row } = useQuery({
    queryKey: ['trading_checklists', user?.id, key],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_checklists' as any)
        .select('*').eq('user_id', user!.id).eq('date', key).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // ---- Load all history for streak & week/month stats ----
  const { data: history = [] } = useQuery({
    queryKey: ['trading_checklists_history', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_checklists' as any)
        .select('date, sections').eq('user_id', user!.id)
        .order('date', { ascending: false }).limit(180);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // ---- Templates ----
  const { data: templates = [] } = useQuery({
    queryKey: ['trading_checklist_templates', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_checklist_templates' as any)
        .select('*').eq('user_id', user!.id).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [sections, setSections] = useState<ChecklistSection[]>([]);

  // Hydrate local state from row (or defaults)
  useEffect(() => {
    if (!user) return;
    if (row?.sections) {
      setSections(row.sections as ChecklistSection[]);
    } else {
      setSections(DEFAULT_SECTIONS());
    }
  }, [row, user]);

  // Persist (debounced)
  const persist = useCallback(async (next: ChecklistSection[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('trading_checklists' as any).upsert({
        user_id: user.id, date: key, sections: next as any,
      }, { onConflict: 'user_id,date' });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['trading_checklists_history', user.id] });
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  }, [user, key, qc]);

  useEffect(() => {
    if (!user || !sections.length) return;
    const t = setTimeout(() => persist(sections), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // Realtime — same-day updates
  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail; if (!d) return;
      if (d.table === 'trading_checklists') {
        qc.invalidateQueries({ queryKey: ['trading_checklists', user?.id, key] });
        qc.invalidateQueries({ queryKey: ['trading_checklists_history', user?.id] });
      }
      if (d.table === 'trading_checklist_templates') {
        qc.invalidateQueries({ queryKey: ['trading_checklist_templates', user?.id] });
      }
    };
    window.addEventListener('mj:realtime', handler);
    return () => window.removeEventListener('mj:realtime', handler);
  }, [qc, user, key]);

  // ---- Derived stats ----
  const overall = useMemo(() => computeOverall(sections), [sections]);

  const streak = useMemo(() => {
    // Count consecutive days ending at today where every section fully done
    let d = new Date();
    let count = 0;
    const map = new Map<string, any[]>();
    history.forEach((h) => map.set(h.date, h.sections || []));
    while (true) {
      const k = dateKey(d);
      const secs = map.get(k) as ChecklistSection[] | undefined;
      if (!secs || !secs.length) break;
      const { pct } = computeOverall(secs);
      if (pct < 100) break;
      count++;
      d = subDays(d, 1);
    }
    return count;
  }, [history]);

  const longestStreak = useMemo(() => {
    if (!history.length) return 0;
    const days = new Set(history.filter(h => {
      const { pct } = computeOverall(h.sections || []);
      return pct === 100;
    }).map(h => h.date));
    if (!days.size) return 0;
    const sorted = Array.from(days).sort();
    let best = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = differenceInCalendarDays(new Date(sorted[i]), new Date(sorted[i - 1]));
      if (diff === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    return best;
  }, [history]);

  const weekPct = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const entries = history.filter(h => new Date(h.date) >= start);
    if (!entries.length) return 0;
    const avg = entries.reduce((a, h) => a + computeOverall(h.sections || []).pct, 0) / entries.length;
    return avg;
  }, [history]);

  const monthPct = useMemo(() => {
    const start = startOfMonth(new Date());
    const entries = history.filter(h => new Date(h.date) >= start);
    if (!entries.length) return 0;
    const avg = entries.reduce((a, h) => a + computeOverall(h.sections || []).pct, 0) / entries.length;
    return avg;
  }, [history]);

  const avgCompletion = useMemo(() => {
    if (!history.length) return 0;
    return history.reduce((a, h) => a + computeOverall(h.sections || []).pct, 0) / history.length;
  }, [history]);

  // ---- Mutations on local state ----
  const toggleItem = (sid: string, iid: string) => {
    setSections(prev => prev.map(s => s.id !== sid ? s : {
      ...s, items: s.items.map(i => i.id === iid ? { ...i, done: !i.done } : i),
    }));
  };
  const addItem = (sid: string, label: string) => {
    const l = label.trim(); if (!l) return;
    setSections(prev => prev.map(s => s.id !== sid ? s : { ...s, items: [...s.items, { id: uid(), label: l, done: false }] }));
  };
  const removeItem = (sid: string, iid: string) => {
    setSections(prev => prev.map(s => s.id !== sid ? s : { ...s, items: s.items.filter(i => i.id !== iid) }));
  };
  const renameItem = (sid: string, iid: string, label: string) => {
    setSections(prev => prev.map(s => s.id !== sid ? s : { ...s, items: s.items.map(i => i.id === iid ? { ...i, label } : i) }));
  };
  const addSection = () => {
    setSections(prev => [...prev, { id: uid(), title: 'New Section', description: '', icon: 'ListTodo', color: 'from-primary/25 to-primary/5', items: [] }]);
  };
  const removeSection = (sid: string) => setSections(prev => prev.filter(s => s.id !== sid));
  const renameSection = (sid: string, title: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, title } : s));
  const setSectionDesc = (sid: string, description: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, description } : s));
  const setSectionIcon = (sid: string, icon: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, icon } : s));
  const moveSection = (sid: string, dir: -1 | 1) => {
    setSections(prev => {
      const i = prev.findIndex(s => s.id === sid); if (i < 0) return prev;
      const j = i + dir; if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice(); [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const resetToday = () => setSections(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, done: false })) })));
  const completeAll = () => setSections(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, done: true })) })));
  const collapseAll = () => setCollapsed(Object.fromEntries(sections.map(s => [s.id, true])));
  const expandAll = () => setCollapsed({});

  // Templates
  const applyTemplate = (t: Template) => {
    // Deep-clone so template edits don't propagate; reset all done flags.
    const cloned: ChecklistSection[] = t.sections.map(s => ({
      ...s, id: uid(),
      items: s.items.map(i => ({ id: uid(), label: i.label, done: false })),
    }));
    setSections(cloned);
    toast.success(`Applied "${t.name}"`);
    setTemplatesOpen(false);
  };
  const saveAsTemplate = async (name: string) => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from('trading_checklist_templates' as any).insert({
      user_id: user.id, name: name.trim(), sections: sections as any,
    });
    if (error) return toast.error('Failed to save template', { description: error.message });
    toast.success('Template saved');
    qc.invalidateQueries({ queryKey: ['trading_checklist_templates', user.id] });
  };
  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('trading_checklist_templates' as any).delete().eq('id', id);
    if (error) return toast.error('Failed to delete', { description: error.message });
    qc.invalidateQueries({ queryKey: ['trading_checklist_templates', user!.id] });
  };
  const duplicateTemplate = async (t: any) => {
    if (!user) return;
    const { error } = await supabase.from('trading_checklist_templates' as any).insert({
      user_id: user.id, name: `${t.name} Copy`, sections: t.sections,
    });
    if (error) return toast.error('Failed to duplicate', { description: error.message });
    qc.invalidateQueries({ queryKey: ['trading_checklist_templates', user.id] });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl leading-tight text-foreground uppercase tracking-tight">
              Trading Checklist
            </h1>
            <p className="text-xs text-muted-foreground">Professional trading execution workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(subDays(date, 1))} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setDate(addDays(date, 1))} className="h-8 w-8 p-0">
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="h-8">Today</Button>
          <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)} className="h-8 gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Customize
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
        {/* -------- LEFT -------- */}
        <div className="space-y-5">
          {/* Stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ListChecks} label="Overall Progress" value={`${Math.round(overall.pct)}%`} sublabel={`${overall.done}/${overall.total} tasks`} accent="bg-primary/40" />
            <StatCard icon={LayoutGrid} label="Sections" value={`${overall.sectionsDone}/${sections.length}`} sublabel="Completed today" accent="bg-emerald-500/40" />
            <StatCard icon={CheckCircle2} label="Tasks Done" value={overall.done} sublabel={`of ${overall.total}`} accent="bg-sky-500/40" />
            <StatCard icon={Flame} label="Current Streak" value={streak} sublabel={streak ? 'Keep it up!' : 'Start today'} accent="bg-amber-500/40" />
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {sections.map((s, idx) => {
              const pct = computeSectionPct(s);
              const isCollapsed = !!collapsed[s.id];
              const Icon = ICONS[s.icon] ?? ListTodo;
              return (
                <div key={s.id} className={cn(
                  'group rounded-2xl border border-border/60 bg-card overflow-hidden transition-all',
                  'hover:border-primary/30 hover:shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.5)]'
                )}>
                  {/* header */}
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <div className={cn('h-11 w-11 rounded-xl border border-border/60 bg-gradient-to-br flex items-center justify-center shrink-0', s.color)}>
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{String(idx + 1).padStart(2, '0')}</span>
                        <h3 className="font-heading font-bold text-sm uppercase tracking-tight text-foreground truncate">{s.title}</h3>
                      </div>
                      {s.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ProgressRing value={pct} size={44} stroke={4} gradientId={`ring-${s.id}`} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {s.items.filter(i => i.done).length}/{s.items.length}
                      </span>
                      {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* items */}
                  {!isCollapsed && (
                    <div className="border-t border-border/50 px-4 py-3 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {s.items.map((i) => (
                          <label key={i.id} className={cn(
                            'group/item flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-primary/40 transition-all cursor-pointer',
                            i.done && 'bg-primary/[0.06] border-primary/30'
                          )}>
                            <Checkbox checked={i.done} onCheckedChange={() => toggleItem(s.id, i.id)} />
                            <span className={cn('text-[13px] flex-1 truncate', i.done && 'line-through text-muted-foreground')}>
                              {i.label}
                            </span>
                            <button onClick={(e) => { e.preventDefault(); removeItem(s.id, i.id); }}
                              className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition"
                              aria-label="Remove item">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </label>
                        ))}
                      </div>
                      <AddItemInline onAdd={(l) => addItem(s.id, l)} />
                    </div>
                  )}
                </div>
              );
            })}

            <Button variant="outline" className="w-full h-11 gap-2 border-dashed" onClick={addSection}>
              <Plus className="h-4 w-4" /> Add Section
            </Button>
          </div>
        </div>

        {/* -------- RIGHT SIDEBAR -------- */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm uppercase tracking-tight">Progress Overview</h3>
              {saving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>}
            </div>
            <div className="flex items-center justify-center py-2">
              <ProgressRing value={overall.pct} size={160} stroke={12} gradientId="ring-overall" label="Overall" sublabel={`${overall.done}/${overall.total}`} />
            </div>
            <div className="mt-4 space-y-2">
              {sections.map((s) => {
                const pct = computeSectionPct(s);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-border/60 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--gold,45_80%_55%))] transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="font-heading font-bold text-sm uppercase tracking-tight mb-3">Streaks & Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MiniStat icon={Flame} label="Current" value={`${streak}d`} />
              <MiniStat icon={Sparkles} label="Longest" value={`${longestStreak}d`} />
              <MiniStat icon={CalendarIcon} label="Week" value={`${Math.round(weekPct)}%`} />
              <MiniStat icon={CalendarIcon} label="Month" value={`${Math.round(monthPct)}%`} />
              <MiniStat icon={CheckCircle2} label="Avg" value={`${Math.round(avgCompletion)}%`} />
              <MiniStat icon={ListChecks} label="Remaining" value={overall.total - overall.done} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase tracking-tight mb-1">Quick Actions</h3>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setTemplatesOpen(true)}>
              <BookOpen className="h-3.5 w-3.5" /> Templates
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={completeAll}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete All
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={resetToday}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset Today
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={collapseAll}>
              <ChevronRight className="h-3.5 w-3.5" /> Collapse All
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={expandAll}>
              <ChevronDown className="h-3.5 w-3.5" /> Expand All
            </Button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="font-heading font-bold text-sm uppercase tracking-tight mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {history.slice(0, 6).map((h) => {
                const { pct, done, total } = computeOverall(h.sections || []);
                return (
                  <button key={h.date} onClick={() => setDate(new Date(h.date))}
                    className="w-full flex items-center gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-accent/60 transition">
                    <div className="text-[11px] font-mono w-16 shrink-0 text-muted-foreground">{format(new Date(h.date), 'MMM d')}</div>
                    <div className="h-1.5 flex-1 rounded-full bg-border/60 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right font-mono">{done}/{total}</span>
                  </button>
                );
              })}
              {!history.length && <p className="text-[11px] text-muted-foreground">No history yet.</p>}
            </div>
          </div>
        </aside>
      </div>

      {/* Customize dialog */}
      <CustomizeDialog
        open={customizeOpen} onOpenChange={setCustomizeOpen}
        sections={sections}
        onRenameSection={renameSection}
        onDescSection={setSectionDesc}
        onIconSection={setSectionIcon}
        onRemoveSection={removeSection}
        onMoveSection={moveSection}
        onRenameItem={renameItem}
        onRemoveItem={removeItem}
        onAddItem={addItem}
        onAddSection={addSection}
        onSaveAsTemplate={saveAsTemplate}
      />

      {/* Templates dialog */}
      <TemplatesDialog
        open={templatesOpen} onOpenChange={setTemplatesOpen}
        templates={templates as any}
        onApply={applyTemplate}
        onDelete={deleteTemplate}
        onDuplicate={duplicateTemplate}
        onSaveCurrent={saveAsTemplate}
      />
    </div>
  );
}

// ---------- Sub-components ----------
function AddItemInline({ onAdd }: { onAdd: (label: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(''); }}
      className="mt-3 flex items-center gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Add a checklist item…" className="h-8 text-xs" />
      <Button type="submit" size="sm" variant="outline" className="h-8 gap-1.5" disabled={!v.trim()}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </form>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-heading font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

function CustomizeDialog(props: {
  open: boolean; onOpenChange: (b: boolean) => void;
  sections: ChecklistSection[];
  onRenameSection: (id: string, v: string) => void;
  onDescSection: (id: string, v: string) => void;
  onIconSection: (id: string, v: string) => void;
  onRemoveSection: (id: string) => void;
  onMoveSection: (id: string, dir: -1 | 1) => void;
  onRenameItem: (sid: string, iid: string, v: string) => void;
  onRemoveItem: (sid: string, iid: string) => void;
  onAddItem: (sid: string, v: string) => void;
  onAddSection: () => void;
  onSaveAsTemplate: (name: string) => void;
}) {
  const [tplName, setTplName] = useState('');
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Customize Checklist</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {props.sections.map((s, idx) => {
              const Icon = ICONS[s.icon] ?? ListTodo;
              return (
                <div key={s.id} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <Input value={s.title} onChange={(e) => props.onRenameSection(s.id, e.target.value)}
                          className="h-8 font-heading font-bold" />
                      </div>
                      <Textarea value={s.description} onChange={(e) => props.onDescSection(s.id, e.target.value)}
                        placeholder="Section description…" className="min-h-[52px] text-xs" />
                      <div className="flex flex-wrap gap-1">
                        {ICON_KEYS.map(k => {
                          const I = ICONS[k];
                          const active = k === s.icon;
                          return (
                            <button key={k} onClick={() => props.onIconSection(s.id, k)}
                              className={cn('h-7 w-7 rounded-md border flex items-center justify-center transition',
                                active ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground')}>
                              <I className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {s.items.map(i => (
                          <div key={i.id} className="flex items-center gap-2">
                            <Input value={i.label} onChange={(e) => props.onRenameItem(s.id, i.id, e.target.value)} className="h-8 text-xs" />
                            <Button size="sm" variant="ghost" onClick={() => props.onRemoveItem(s.id, i.id)} className="h-8 w-8 p-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <AddItemInline onAdd={(l) => props.onAddItem(s.id, l)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => props.onMoveSection(s.id, -1)} disabled={idx === 0}>
                        <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => props.onMoveSection(s.id, 1)} disabled={idx === props.sections.length - 1}>
                        <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => props.onRemoveSection(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={props.onAddSection}>
              <Plus className="h-4 w-4" /> Add Section
            </Button>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t border-border/50 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Save as template…" className="h-8 flex-1" />
            <Button size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() => { props.onSaveAsTemplate(tplName); setTplName(''); }}
              disabled={!tplName.trim()}>
              <Sparkles className="h-3.5 w-3.5" /> Save Template
            </Button>
          </div>
          <Button size="sm" onClick={() => props.onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesDialog({ open, onOpenChange, templates, onApply, onDelete, onDuplicate, onSaveCurrent }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  templates: any[];
  onApply: (t: Template) => void; onDelete: (id: string) => void;
  onDuplicate: (t: any) => void; onSaveCurrent: (name: string) => void;
}) {
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const filtered = templates.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Templates</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="h-8 pl-8 text-xs" />
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.map(t => (
            <div key={t.id} className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-sm truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(t.sections?.length ?? 0)} sections · {(t.sections ?? []).reduce((a: number, s: any) => a + (s.items?.length ?? 0), 0)} items
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onApply(t)}>Apply</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDuplicate(t)}><Copy className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {!filtered.length && <p className="text-xs text-muted-foreground py-6 text-center">No templates yet. Save your current checklist as a template below.</p>}
        </div>
        <DialogFooter className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 w-full">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name…" className="h-8 flex-1 text-xs" />
            <Button size="sm" className="h-8 gap-1.5" disabled={!name.trim()} onClick={() => { onSaveCurrent(name); setName(''); }}>
              <Plus className="h-3.5 w-3.5" /> Save Current
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
