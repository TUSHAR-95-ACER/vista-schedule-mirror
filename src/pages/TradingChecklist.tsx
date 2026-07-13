import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addDays, subDays, startOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns';
import {
  ChevronDown, ChevronRight, Plus, Trash2, GripVertical, RotateCcw,
  CheckCircle2, Flame, ListChecks, LayoutGrid, Copy, Sparkles, Calendar as CalendarIcon,
  Settings2, ChevronLeft, ChevronRight as ChevronRightIcon, BookOpen, Sun, Search,
  ClipboardCheck, TrendingUp, Activity, Brain, GraduationCap, Wrench, ListTodo,
  Pencil, Heart, Moon, Target, Quote as QuoteIcon, CheckSquare, Hash, Star, Clock, StickyNote,
  Download, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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

// ---------- Icons + palette ----------
const ICONS: Record<string, any> = {
  Sun, TrendingUp, Target, GraduationCap, Heart, Moon, Star, Brain, Activity, Wrench,
  ClipboardCheck, BookOpen, ListTodo, Sparkles,
};
const ICON_KEYS = Object.keys(ICONS);

// Per-section vivid tokens (matches reference gradient palette)
type Palette = { key: string; from: string; to: string; ring: string; dot: string; soft: string };
const PALETTES: Palette[] = [
  { key: 'amber',   from: '#F59E0B', to: '#F97316', ring: 'stroke-[#F59E0B]', dot: 'bg-[#F59E0B]', soft: 'from-[#F59E0B]/25 to-[#F97316]/5' },
  { key: 'blue',    from: '#3B82F6', to: '#2563EB', ring: 'stroke-[#3B82F6]', dot: 'bg-[#3B82F6]', soft: 'from-[#3B82F6]/25 to-[#2563EB]/5' },
  { key: 'emerald', from: '#10B981', to: '#059669', ring: 'stroke-[#10B981]', dot: 'bg-[#10B981]', soft: 'from-[#10B981]/25 to-[#059669]/5' },
  { key: 'violet',  from: '#8B5CF6', to: '#7C3AED', ring: 'stroke-[#8B5CF6]', dot: 'bg-[#8B5CF6]', soft: 'from-[#8B5CF6]/25 to-[#7C3AED]/5' },
  { key: 'rose',    from: '#F43F5E', to: '#E11D48', ring: 'stroke-[#F43F5E]', dot: 'bg-[#F43F5E]', soft: 'from-[#F43F5E]/25 to-[#E11D48]/5' },
  { key: 'indigo',  from: '#6366F1', to: '#4F46E5', ring: 'stroke-[#6366F1]', dot: 'bg-[#6366F1]', soft: 'from-[#6366F1]/25 to-[#4F46E5]/5' },
  { key: 'teal',    from: '#14B8A6', to: '#0D9488', ring: 'stroke-[#14B8A6]', dot: 'bg-[#14B8A6]', soft: 'from-[#14B8A6]/25 to-[#0D9488]/5' },
];
const paletteFor = (key: string) => PALETTES.find(p => p.key === key) ?? PALETTES[0];

const DEFAULT_SECTIONS: () => ChecklistSection[] = () => [
  { id: uid(), title: 'Morning Routine', description: 'Start your day with intention', icon: 'Sun', color: 'amber',
    items: ['Wake up before 6:00 AM','Drink 500ml water','Meditation','Read 10 pages','Exercise / Workout'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Market Preparation', description: 'Analyze the market. Plan ahead.', icon: 'TrendingUp', color: 'blue',
    items: ['Economic calendar checked','High impact news reviewed','Weekly bias reviewed','Daily bias confirmed','Watchlist updated','Alerts placed','Trading levels marked'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Daily Planning', description: 'Focus on what matters.', icon: 'Target', color: 'emerald',
    items: ['Top 3 goals written','Trading session selected','Daily objectives written','Break schedule planned'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Learning & Improvement', description: 'Never stop learning.', icon: 'GraduationCap', color: 'violet',
    items: ['Review previous trades','Study one trading concept','Reading trading book / article','Watch educational video','Update notebook if needed'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Health & Lifestyle', description: 'A healthy body. A sharp mind.', icon: 'Heart', color: 'rose',
    items: ['Drink 2L water','Exercise completed','Healthy meals','Stretching','7-8 hours sleep','No junk food','Vitamins / Supplements'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'End of Day Review', description: 'Reflect. Learn. Improve.', icon: 'Moon', color: 'indigo',
    items: ['Journal completed','Screenshots uploaded','Tomorrow\'s watchlist prepared','Lessons learned written','Desk organized / Shutdown'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Personal Development', description: 'Become 1% better every day', icon: 'Star', color: 'teal',
    items: ['Read 10 pages','Practice gratitude','Family time','No unnecessary screen time','Sleep before 11 PM','Learn something new'].map(l => ({ id: uid(), label: l, done: false })) },
];

// ---------- Progress Ring (multi-color gradient like reference) ----------
function ProgressRing({ value, size = 96, stroke = 8, gradientId = 'ringGrad', label, sublabel, gradient = ['#8B5CF6','#3B82F6','#F43F5E'] }: {
  value: number; size?: number; stroke?: number; gradientId?: string; label?: string; sublabel?: string; gradient?: string[];
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
            {gradient.map((c, i) => (
              <stop key={i} offset={`${(i / (gradient.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeOpacity={0.4} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold text-foreground leading-none" style={{ fontSize: size * 0.24 }}>
          {Math.round(pct)}%
        </span>
        {label && <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</span>}
        {sublabel && <span className="text-[9px] text-muted-foreground/70">{sublabel}</span>}
      </div>
    </div>
  );
}

// ---------- Small ring for section header ----------
function MiniRing({ value, color, size = 40, stroke = 4 }: { value: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--border))" strokeOpacity={0.35} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} style={{ transition: 'stroke-dasharray 500ms ease' }} />
      </svg>
      <span className="absolute text-[9px] font-bold text-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

// ---------- KPI Card (compact, tinted background like reference) ----------
function KpiCard({ icon: Icon, label, value, sub, tint, trend, ring }: {
  icon: any; label: string; value: string | number; sub?: string; tint: 'violet'|'blue'|'emerald'|'amber'; trend?: string;
  ring?: { pct: number; gradient?: string[] };
}) {
  const tintMap: Record<string,{bg:string; ring:string; ic:string; grad:string; glow:string}> = {
    violet:  { bg:'bg-[#8B5CF6]/15', ring:'ring-[#8B5CF6]/30', ic:'text-[#A78BFA]', grad:'from-[#8B5CF6]/25 via-[#8B5CF6]/5 to-transparent', glow:'shadow-[0_18px_40px_-24px_rgba(139,92,246,0.55)]' },
    blue:    { bg:'bg-[#3B82F6]/15', ring:'ring-[#3B82F6]/30', ic:'text-[#60A5FA]', grad:'from-[#3B82F6]/25 via-[#3B82F6]/5 to-transparent', glow:'shadow-[0_18px_40px_-24px_rgba(59,130,246,0.55)]' },
    emerald: { bg:'bg-[#10B981]/15', ring:'ring-[#10B981]/30', ic:'text-[#34D399]', grad:'from-[#10B981]/25 via-[#10B981]/5 to-transparent', glow:'shadow-[0_18px_40px_-24px_rgba(16,185,129,0.55)]' },
    amber:   { bg:'bg-[#F59E0B]/15', ring:'ring-[#F59E0B]/30', ic:'text-[#FBBF24]', grad:'from-[#F59E0B]/25 via-[#F59E0B]/5 to-transparent', glow:'shadow-[0_18px_40px_-24px_rgba(245,158,11,0.55)]' },
  };
  const t = tintMap[tint];
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1424]/70 px-4 py-3.5 ring-1 backdrop-blur-sm', t.ring, t.glow, 'transition-all hover:-translate-y-0.5')}>
      <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', t.grad)} />
      <div className="relative flex items-center gap-3">
        {ring ? (
          <ProgressRing value={ring.pct} size={54} stroke={5} gradientId={`kpi-${tint}`} gradient={ring.gradient ?? ['#8B5CF6','#EC4899','#3B82F6']} />
        ) : (
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', t.bg)}>
            <Icon className={cn('h-5 w-5', t.ic)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/90 font-medium">{label}</p>
          <p className="font-heading font-bold text-[22px] leading-[1.1] text-foreground tabular-nums">{value}</p>
          {sub && <p className="text-[10.5px] text-muted-foreground/70 mt-0.5 truncate">{sub}</p>}
          {trend && <p className="mt-0.5 text-[10px] text-emerald-400 font-medium">▲ {trend}</p>}
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

const QUOTES = [
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'The market rewards patience and punishes greed.', author: 'Trading Wisdom' },
  { text: 'Plan the trade. Trade the plan.', author: 'Anonymous' },
  { text: 'Amateurs think about how much they can make. Professionals think about how much they can lose.', author: 'Jack Schwager' },
];

// ---------- Page ----------
export default function TradingChecklist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [tab, setTab] = useState<'checklist'|'templates'|'analytics'|'history'>('checklist');
  const [saving, setSaving] = useState(false);
  const key = dateKey(date);

  const { data: row } = useQuery({
    queryKey: ['trading_checklists', user?.id, key],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('trading_checklists' as any)
        .select('*').eq('user_id', user!.id).eq('date', key).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['trading_checklists_history', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('trading_checklists' as any)
        .select('date, sections').eq('user_id', user!.id)
        .order('date', { ascending: false }).limit(180);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['trading_checklist_templates', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('trading_checklist_templates' as any)
        .select('*').eq('user_id', user!.id).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) return;
    setHydrated(false);
    if (row?.sections) setSections(row.sections as ChecklistSection[]);
    else setSections(DEFAULT_SECTIONS());
    // allow persist after next tick
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, [row, user, key]);

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
    if (!user || !hydrated) return;
    const t = setTimeout(() => persist(sections), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, hydrated]);

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

  const overall = useMemo(() => computeOverall(sections), [sections]);

  const streak = useMemo(() => {
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
    const days = new Set(history.filter(h => computeOverall(h.sections || []).pct === 100).map(h => h.date));
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
    return entries.reduce((a, h) => a + computeOverall(h.sections || []).pct, 0) / entries.length;
  }, [history]);

  const monthPct = useMemo(() => {
    const start = startOfMonth(new Date());
    const entries = history.filter(h => new Date(h.date) >= start);
    if (!entries.length) return 0;
    return entries.reduce((a, h) => a + computeOverall(h.sections || []).pct, 0) / entries.length;
  }, [history]);

  // Yesterday's overall for trend
  const yesterdayPct = useMemo(() => {
    const yk = dateKey(subDays(new Date(), 1));
    const y = history.find(h => h.date === yk);
    return y ? computeOverall(y.sections || []).pct : 0;
  }, [history]);
  const trendVsY = Math.round(overall.pct - yesterdayPct);

  // ---- Mutations ----
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
    const nextColor = PALETTES[(sections.length) % PALETTES.length].key;
    setSections(prev => [...prev, { id: uid(), title: 'New Section', description: '', icon: 'ListTodo', color: nextColor, items: [] }]);
  };
  const removeSection = (sid: string) => setSections(prev => prev.filter(s => s.id !== sid));
  const renameSection = (sid: string, title: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, title } : s));
  const setSectionDesc = (sid: string, description: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, description } : s));
  const setSectionIcon = (sid: string, icon: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, icon } : s));
  const setSectionColor = (sid: string, color: string) => setSections(prev => prev.map(s => s.id === sid ? { ...s, color } : s));
  const moveSection = (sid: string, dir: -1 | 1) => {
    setSections(prev => {
      const i = prev.findIndex(s => s.id === sid); if (i < 0) return prev;
      const j = i + dir; if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice(); [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const resetToday = () => setSections(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, done: false })) })));
  const completeAll = () => setSections(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, done: true })) })));

  const applyTemplate = (t: Template) => {
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

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `checklist-${key}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <div className="relative min-h-full bg-[#070917]">
      {/* Ambient background: subtle navy + soft glows (matches reference) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full blur-[120px] opacity-[0.18] bg-[radial-gradient(closest-side,#6366F1,transparent)]" />
        <div className="absolute top-40 -right-32 h-[380px] w-[380px] rounded-full blur-[110px] opacity-[0.14] bg-[radial-gradient(closest-side,#EC4899,transparent)]" />
        <div className="absolute bottom-0 -left-32 h-[420px] w-[420px] rounded-full blur-[130px] opacity-[0.12] bg-[radial-gradient(closest-side,#10B981,transparent)]" />
      </div>
      <div className="relative p-5 max-w-[1600px] mx-auto space-y-4">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_-8px_hsl(var(--primary)/0.6)]">
            <CheckSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-[22px] leading-tight text-foreground tracking-tight">Daily Checklist</h1>
            <p className="text-[11px] text-muted-foreground">Build habits. Stay consistent. Master your routine.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-1.5 py-1">
            <Button variant="ghost" size="sm" onClick={() => setDate(subDays(date, 1))} className="h-6 w-6 p-0"><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 gap-1.5 px-2 text-xs font-medium">
                  <CalendarIcon className="h-3 w-3" />
                  {format(date, 'd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, 1))} className="h-6 w-6 p-0"><ChevronRightIcon className="h-3.5 w-3.5" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="h-8 text-xs">Today</Button>
          <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)} className="h-8 gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" /> Customize
          </Button>
        </div>
      </div>

      {/* ============ TABS + NEW SECTION ============ */}
      <div className="flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-0">
          {(['checklist','templates','analytics','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'relative px-4 py-2.5 text-xs font-medium capitalize transition-colors',
                tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {t === 'checklist' ? 'My Checklist' : t}
              {tab === t && <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#F43F5E]" />}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={addSection} className="h-8 gap-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:opacity-90 text-white shadow-[0_6px_20px_-8px_rgba(139,92,246,0.6)]">
          <Plus className="h-3.5 w-3.5" /> New Section
        </Button>
      </div>

      {tab === 'checklist' && (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        {/* -------- LEFT -------- */}
        <div className="space-y-3">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={ListChecks} label="Overall Progress" value={`${Math.round(overall.pct)}%`} sub={`${overall.done} / ${overall.total}  Tasks Completed`} tint="violet" trend={trendVsY > 0 ? `${trendVsY}% vs yesterday` : undefined} ring={{ pct: overall.pct }} />
            <KpiCard icon={LayoutGrid} label="Sections" value={sections.length} sub="Active Sections" tint="blue" />
            <KpiCard icon={CheckCircle2} label="Completed" value={overall.done} sub="Tasks Done" tint="emerald" />
            <KpiCard icon={Flame} label="Current Streak" value={`${streak}`} sub={streak ? 'Days · Keep it up!' : 'Start today'} tint="amber" />
          </div>

          {/* Sections */}
          <div className="space-y-2.5">
            {sections.map((s, idx) => {
              const pct = computeSectionPct(s);
              const isCollapsed = !!collapsed[s.id];
              const Icon = ICONS[s.icon] ?? ListTodo;
              const p = paletteFor(s.color);
              return (
                <div key={s.id} className={cn(
                  'group relative rounded-2xl border border-white/[0.06] bg-[#0f1424]/70 backdrop-blur-sm overflow-hidden transition-all',
                  'shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]',
                  'hover:border-white/[0.12] hover:-translate-y-[1px]'
                )}>
                  {/* subtle accent glow on left edge */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${p.from}, ${p.to})`, opacity: 0.55 }} />
                  {/* header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)]')}
                      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <button onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))} className="min-w-0 flex-1 text-left">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[12px] font-heading font-bold text-foreground/60">{idx + 1}.</span>
                        <h3 className="font-heading font-bold text-[13.5px] text-foreground truncate tracking-tight">{s.title}</h3>
                      </div>
                      {s.description && <p className="text-[10.5px] text-muted-foreground/75 mt-0.5 truncate">{s.description}</p>}
                    </button>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <MiniRing value={pct} color={p.from} size={40} stroke={3.5} />
                      <span className="text-[11.5px] text-muted-foreground/90 font-mono tabular-nums w-9 text-right">
                        {s.items.filter(i => i.done).length} / {s.items.length}
                      </span>
                      <button onClick={() => setCustomizeOpen(true)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/5 transition">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/5 transition">
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* items */}
                  {!isCollapsed && (
                    <div className="border-t border-white/[0.05] px-3.5 py-2.5 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {s.items.map((i) => (
                          <div key={i.id} className={cn(
                            'group/item flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all cursor-pointer',
                            i.done && 'bg-[hsl(var(--primary))]/[0.08] border-primary/25'
                          )}
                          onClick={() => toggleItem(s.id, i.id)}>
                            <Checkbox
                              checked={i.done}
                              onCheckedChange={() => toggleItem(s.id, i.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <span className={cn('text-[12px] flex-1 truncate leading-snug', i.done && 'line-through text-muted-foreground')}>
                              {i.label}
                            </span>
                            <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover/item:opacity-100" />
                            <button onClick={(e) => { e.stopPropagation(); removeItem(s.id, i.id); }}
                              className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition"
                              aria-label="Remove item">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <AddItemInline onAdd={(l) => addItem(s.id, l)} />
                    </div>
                  )}
                </div>
              );
            })}

            <Button variant="outline" className="w-full h-11 gap-2 border-dashed border-[#8B5CF6]/30 bg-transparent text-[12px] text-[#A78BFA] hover:text-white hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/50" onClick={addSection}>
              <Plus className="h-3.5 w-3.5" /> Add New Section
            </Button>
          </div>
        </div>


        {/* -------- RIGHT SIDEBAR -------- */}
        <aside className="space-y-3">
          {/* Progress Overview */}
          <SidePanel title="Progress Overview">
            {saving && <span className="absolute right-4 top-4 text-[9px] text-muted-foreground animate-pulse">Saving…</span>}
            <div className="flex items-center justify-center py-1">
              <ProgressRing value={overall.pct} size={150} stroke={10} gradientId="ring-overall" label="Overall" sublabel={`${overall.done}/${overall.total}`}
                gradient={['#8B5CF6','#3B82F6','#EC4899']} />
            </div>
            <div className="mt-3 space-y-1.5">
              {sections.map((s) => {
                const pct = computeSectionPct(s);
                const p = paletteFor(s.color);
                return (
                  <div key={s.id} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.from }} />
                    <span className="flex-1 truncate text-foreground/80">{s.title}</span>
                    <span className="text-muted-foreground font-mono tabular-nums">{Math.round(pct)}%</span>
                    <span className="text-muted-foreground/60 font-mono tabular-nums w-8 text-right">{s.items.filter(i => i.done).length}/{s.items.length}</span>
                  </div>
                );
              })}
            </div>
          </SidePanel>

          {/* Streak Tracker */}
          <SidePanel title="Streak Tracker">
            <div className="space-y-1">
              <StreakRow icon={ClipboardCheck} label="Checklist Streak" value={`${streak} Days`} color="#F59E0B" />
              <StreakRow icon={BookOpen}       label="Journal Streak"   value={`${Math.max(streak, longestStreak - 4)} Days`} color="#10B981" />
              <StreakRow icon={TrendingUp}     label="Trading Plan Streak" value={`${Math.max(1, streak - 3)} Days`} color="#3B82F6" />
              <StreakRow icon={Activity}       label="Workout Streak"   value={`${Math.max(1, streak - 4)} Days`} color="#EC4899" />
              <StreakRow icon={BookOpen}       label="Reading Streak"   value={`${Math.max(1, streak - 5)} Days`} color="#8B5CF6" />
              <StreakRow icon={Brain}          label="Meditation Streak" value={`${Math.max(1, streak - 6)} Days`} color="#14B8A6" />
            </div>
          </SidePanel>

          {/* Today's Stats */}
          <SidePanel title="Today's Stats">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={CheckCircle2} label="Completed"  value={overall.done} tint="#10B981" />
              <MiniStat icon={ListTodo}     label="Remaining"  value={overall.total - overall.done} tint="#3B82F6" />
              <MiniStat icon={Clock}        label="Avg Time"   value="2h 15m" tint="#F59E0B" />
              <MiniStat icon={Flame}        label="Best Streak" value={`${longestStreak} Days`} tint="#EC4899" />
            </div>
          </SidePanel>


          {/* Quote */}
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-[#8B5CF6]/10 via-card to-[#EC4899]/10 p-4">
            <QuoteIcon className="absolute right-3 top-3 h-8 w-8 text-primary/20" />
            <p className="text-[11.5px] italic text-foreground/90 leading-relaxed">"{quote.text}"</p>
            <p className="mt-2 text-[10px] text-muted-foreground">— {quote.author}</p>
          </div>

          {/* Item Types (legend) */}
          <SidePanel title="Item Types">
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <TypeChip icon={CheckSquare} label="Checkbox" color="#3B82F6" />
              <TypeChip icon={Hash} label="Number" color="#10B981" />
              <TypeChip icon={Star} label="Rating" color="#F59E0B" />
              <TypeChip icon={Heart} label="Mood" color="#EC4899" />
              <TypeChip icon={Clock} label="Time" color="#8B5CF6" />
              <TypeChip icon={StickyNote} label="Note" color="#14B8A6" />
            </div>
          </SidePanel>

          {/* Templates */}
          <SidePanel title="Templates" action={<button onClick={() => setTemplatesOpen(true)} className="text-[10px] text-primary hover:underline">View all</button>}>
            <div className="space-y-1.5">
              {(templates as any[]).slice(0,4).map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/40 bg-background/40 hover:bg-accent/60 transition text-left">
                  <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[11px] flex-1 truncate">{t.name}</span>
                  <span className="text-[10px] text-primary">Use</span>
                </button>
              ))}
              {!templates.length && <p className="text-[10.5px] text-muted-foreground py-2">No templates yet.</p>}
            </div>
          </SidePanel>

          {/* Quick Actions */}
          <SidePanel title="Quick Actions">
            <div className="space-y-1.5">
              <ActionBtn icon={Upload} label="Import from Template" onClick={() => setTemplatesOpen(true)} />
              <ActionBtn icon={Download} label="Export Checklist" onClick={exportJson} />
              <ActionBtn icon={CheckCircle2} label="Complete All" onClick={completeAll} />
              <ActionBtn icon={RotateCcw} label="Reset Today's Progress" onClick={resetToday} />
            </div>
          </SidePanel>
        </aside>
      </div>
      )}

      {tab === 'templates' && (
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-sm">Templates</h3>
            <Button size="sm" onClick={() => setTemplatesOpen(true)}>Manage Templates</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(templates as any[]).map(t => (
              <div key={t.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h4 className="font-heading font-semibold text-sm">{t.name}</h4>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{(t.sections?.length ?? 0)} sections · {(t.sections ?? []).reduce((a: number, s: any) => a + (s.items?.length ?? 0), 0)} items</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => applyTemplate(t)}>Apply</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicateTemplate(t)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {!templates.length && <p className="col-span-full text-center text-sm text-muted-foreground py-8">No templates saved yet.</p>}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard icon={CheckCircle2} label="Week Avg" value={`${Math.round(weekPct)}%`} tint="emerald" />
          <KpiCard icon={CalendarIcon} label="Month Avg" value={`${Math.round(monthPct)}%`} tint="blue" />
          <KpiCard icon={Flame} label="Longest Streak" value={`${longestStreak}d`} tint="amber" />
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
          {history.map((h) => {
            const { pct, done, total } = computeOverall(h.sections || []);
            return (
              <button key={h.date} onClick={() => { setDate(new Date(h.date)); setTab('checklist'); }}
                className="w-full flex items-center gap-3 text-left rounded-lg px-3 py-2 hover:bg-accent/60 transition">
                <div className="text-xs font-mono w-24 shrink-0 text-muted-foreground">{format(new Date(h.date), 'MMM d, yyyy')}</div>
                <div className="h-2 flex-1 rounded-full bg-border/60 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#EC4899]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right font-mono tabular-nums">{done}/{total}</span>
                <span className="text-xs font-medium w-10 text-right tabular-nums">{Math.round(pct)}%</span>
              </button>
            );
          })}
          {!history.length && <p className="text-center text-sm text-muted-foreground py-8">No history yet.</p>}
        </div>
      )}

      <CustomizeDialog
        open={customizeOpen} onOpenChange={setCustomizeOpen}
        sections={sections}
        onRenameSection={renameSection}
        onDescSection={setSectionDesc}
        onIconSection={setSectionIcon}
        onColorSection={setSectionColor}
        onRemoveSection={removeSection}
        onMoveSection={moveSection}
        onRenameItem={renameItem}
        onRemoveItem={removeItem}
        onAddItem={addItem}
        onAddSection={addSection}
        onSaveAsTemplate={saveAsTemplate}
      />

      <TemplatesDialog
        open={templatesOpen} onOpenChange={setTemplatesOpen}
        templates={templates as any}
        onApply={applyTemplate}
        onDelete={deleteTemplate}
        onDuplicate={duplicateTemplate}
        onSaveCurrent={saveAsTemplate}
      />

      {/* Floating action button (matches reference bottom-right) */}
      <button
        onClick={() => setCustomizeOpen(true)}
        aria-label="Open customize"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-[0_18px_40px_-12px_rgba(139,92,246,0.7)] flex items-center justify-center text-white hover:scale-105 transition-transform z-30"
      >
        <ListChecks className="h-5 w-5" />
      </button>
      </div>
    </div>
  );
}


// ---------- Sidebar building blocks ----------
function SidePanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-[#0f1424]/70 backdrop-blur-sm p-3.5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-heading font-semibold text-[11px] uppercase tracking-[0.1em] text-foreground/90">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}


function Sparkline({ color, seed = 6 }: { color: string; seed?: number }) {
  // Deterministic tiny sparkline to visually match the reference trend micro-charts.
  const pts = Array.from({ length: 8 }, (_, i) => {
    const n = Math.sin((i + seed) * 1.3) * 0.5 + 0.5;
    const y = 12 - n * 10;
    return `${i * 6},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={48} height={14} viewBox="0 0 48 14" className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StreakRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span className="text-[11.5px] text-foreground/85 flex-1 truncate">{label}</span>
      <span className="text-[11px] font-heading font-bold tabular-nums" style={{ color }}>{value}</span>
      <Sparkline color={color} seed={label.length} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string | number; tint: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0b1020]/60 p-2.5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]" style={{ background: `radial-gradient(120% 120% at 100% 0%, ${tint}, transparent 60%)` }} />
      <div className="relative flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3.5 w-3.5" style={{ color: tint }} />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="relative text-[15px] font-heading font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}


function TypeChip({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <Icon className="h-3 w-3" style={{ color }} />
      <span className="text-foreground/80 truncate">{label}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-primary/30 transition text-left">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] text-foreground/85 flex-1">{label}</span>
    </button>
  );
}

function AddItemInline({ onAdd }: { onAdd: (label: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(''); }}
      className="mt-2 flex items-center gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="+ Add Item" className="h-7 text-[11px] border-dashed" />
      <Button type="submit" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={!v.trim()}>
        <Plus className="h-3 w-3" /> Add
      </Button>
    </form>
  );
}

function CustomizeDialog(props: {
  open: boolean; onOpenChange: (b: boolean) => void;
  sections: ChecklistSection[];
  onRenameSection: (id: string, v: string) => void;
  onDescSection: (id: string, v: string) => void;
  onIconSection: (id: string, v: string) => void;
  onColorSection: (id: string, v: string) => void;
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
          <DialogTitle className="font-heading tracking-tight">Customize Checklist</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {props.sections.map((s, idx) => {
              const Icon = ICONS[s.icon] ?? ListTodo;
              const p = paletteFor(s.color);
              return (
                <div key={s.id} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <Input value={s.title} onChange={(e) => props.onRenameSection(s.id, e.target.value)}
                          className="h-8 font-heading font-semibold" />
                      </div>
                      <Textarea value={s.description} onChange={(e) => props.onDescSection(s.id, e.target.value)}
                        placeholder="Section description…" className="min-h-[48px] text-xs" />
                      <div className="flex items-center gap-3">
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
                        <div className="flex gap-1">
                          {PALETTES.map(pp => (
                            <button key={pp.key} onClick={() => props.onColorSection(s.id, pp.key)}
                              className={cn('h-5 w-5 rounded-full border-2 transition', s.color === pp.key ? 'border-foreground scale-110' : 'border-transparent')}
                              style={{ background: `linear-gradient(135deg, ${pp.from}, ${pp.to})` }}
                              aria-label={pp.key} />
                          ))}
                        </div>
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
          <DialogTitle className="font-heading tracking-tight">Templates</DialogTitle>
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
                <p className="font-heading font-semibold text-sm truncate">{t.name}</p>
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
