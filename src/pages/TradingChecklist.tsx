import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  { key: 'violet',  from: '#8B5CF6', to: '#7C3AED', ring: 'stroke-[#8B5CF6]', dot: 'bg-[#8B5CF6]', soft: 'from-[#8B5CF6]/25 to-[#7C3AED]/5' },
  { key: 'blue',    from: '#3B82F6', to: '#2563EB', ring: 'stroke-[#3B82F6]', dot: 'bg-[#3B82F6]', soft: 'from-[#3B82F6]/25 to-[#2563EB]/5' },
  { key: 'emerald', from: '#10B981', to: '#059669', ring: 'stroke-[#10B981]', dot: 'bg-[#10B981]', soft: 'from-[#10B981]/25 to-[#059669]/5' },
  { key: 'amber',   from: '#F59E0B', to: '#D97706', ring: 'stroke-[#F59E0B]', dot: 'bg-[#F59E0B]', soft: 'from-[#F59E0B]/25 to-[#D97706]/5' },
  { key: 'rose',    from: '#EC4899', to: '#DB2777', ring: 'stroke-[#EC4899]', dot: 'bg-[#EC4899]', soft: 'from-[#EC4899]/25 to-[#DB2777]/5' },
  { key: 'indigo',  from: '#8B5CF6', to: '#6366F1', ring: 'stroke-[#8B5CF6]', dot: 'bg-[#8B5CF6]', soft: 'from-[#8B5CF6]/25 to-[#6366F1]/5' },
  { key: 'teal',    from: '#14B8A6', to: '#0D9488', ring: 'stroke-[#14B8A6]', dot: 'bg-[#14B8A6]', soft: 'from-[#14B8A6]/25 to-[#0D9488]/5' },
];
const paletteFor = (key: string) => PALETTES.find(p => p.key === key) ?? PALETTES[0];

const DEFAULT_SECTIONS: () => ChecklistSection[] = () => [
  { id: uid(), title: 'Morning Routine', description: 'Start your day with intention', icon: 'Sun', color: 'violet',
    items: ['Wake up before 6:00 AM','Drink 500ml water','Meditation','Read 10 pages','Exercise / Workout'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Market Preparation', description: 'Analyze the market. Plan ahead.', icon: 'TrendingUp', color: 'blue',
    items: ['Economic calendar checked','High impact news reviewed','Weekly bias reviewed','Daily bias confirmed','Watchlist updated','Alerts placed','Trading levels marked'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Daily Planning', description: 'Focus on what matters.', icon: 'Target', color: 'emerald',
    items: ['Top 3 goals written','Trading session selected','Daily objectives written','Break schedule planned'].map(l => ({ id: uid(), label: l, done: false })) },
  { id: uid(), title: 'Learning & Improvement', description: 'Never stop learning.', icon: 'GraduationCap', color: 'amber',
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

// ---------- KPI Card (reference-spec: 120px, radius 18, tinted overlay) ----------
function KpiCard({ icon: Icon, label, value, sub, tint, trend, ring }: {
  icon: any; label: string; value: string | number; sub?: string; tint: 'violet'|'blue'|'emerald'|'amber'; trend?: string;
  ring?: { pct: number; gradient?: string[] };
}) {
  const tintMap: Record<string,{overlay:string; iconBg:string; ic:string; glow:string}> = {
    violet:  { overlay:'bg-[#7C3AED]/[0.09]', iconBg:'bg-[#7C3AED]/20', ic:'text-[#C4B5FD]', glow:'hover:shadow-[0_14px_36px_rgba(124,58,237,0.28)]' },
    blue:    { overlay:'bg-[#3B82F6]/[0.09]', iconBg:'bg-[#2563EB]/20', ic:'text-[#93C5FD]', glow:'hover:shadow-[0_14px_36px_rgba(59,130,246,0.28)]' },
    emerald: { overlay:'bg-[#10B981]/[0.09]', iconBg:'bg-[#10B981]/20', ic:'text-[#6EE7B7]', glow:'hover:shadow-[0_14px_36px_rgba(16,185,129,0.28)]' },
    amber:   { overlay:'bg-[#F59E0B]/[0.09]', iconBg:'bg-[#F59E0B]/20', ic:'text-[#FCD34D]', glow:'hover:shadow-[0_14px_36px_rgba(245,158,11,0.28)]' },
  };
  const t = tintMap[tint];
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#121A2C] px-6',
        'shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5',
        t.glow,
      )}
      style={{ height: 120 }}
    >
      <div className={cn('absolute inset-0 pointer-events-none', t.overlay)} />
      <div className="relative flex items-center gap-4 h-full">
        {ring ? (
          <ProgressRing
            value={ring.pct}
            size={72}
            stroke={8}
            gradientId={`kpi-${tint}`}
            gradient={ring.gradient ?? ['#EC4899', '#8B5CF6']}
          />
        ) : (
          <div className={cn('h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0', t.iconBg)}>
            <Icon className={cn('h-5 w-5', t.ic)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[#A7B0C2] mb-1">{label}</p>
          <p className="font-heading font-bold text-[28px] leading-none text-white tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-[#6B7488] mt-1.5 truncate">{sub}</p>}
          {trend && <p className="mt-1 text-[11px] text-[#34D399] font-medium">▲ {trend}</p>}
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
  const hydratedKeyRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const inflightRef = useRef(false);

  // Reset hydration marker whenever the target date changes.
  useEffect(() => {
    hydratedKeyRef.current = null;
    dirtyRef.current = false;
    setHydrated(false);
  }, [key, user?.id]);

  // Hydrate local state from the server exactly once per date, and never
  // clobber a pending local edit with a stale realtime refetch.
  useEffect(() => {
    if (!user) return;
    if (hydratedKeyRef.current === key) return; // already hydrated for this date
    if (row === undefined) return; // query still loading
    if (dirtyRef.current || inflightRef.current) return; // don't overwrite unsaved edits
    setSections(row?.sections ? (row.sections as ChecklistSection[]) : DEFAULT_SECTIONS());
    hydratedKeyRef.current = key;
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, [row, user, key]);

  const persist = useCallback(async (next: ChecklistSection[]) => {
    if (!user) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from('trading_checklists' as any).upsert({
        user_id: user.id, date: key, sections: next as any,
      }, { onConflict: 'user_id,date' });
      if (error) throw error;
      dirtyRef.current = false;
      qc.invalidateQueries({ queryKey: ['trading_checklists_history', user.id] });
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message ?? String(e) });
    } finally {
      inflightRef.current = false;
      setSaving(false);
    }
  }, [user, key, qc]);

  useEffect(() => {
    if (!user || !hydrated) return;
    dirtyRef.current = true;
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
    <div className="relative min-h-full bg-[#0A0E1A] [&_h1]:!normal-case [&_h2]:!normal-case [&_h3]:!normal-case [&_h4]:!normal-case">
      {/* Ambient top overlay glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{ background: 'radial-gradient(ellipse 900px 320px at 50% -80px, rgba(139,92,246,0.10), transparent 70%)' }}
      />
      <div className="relative px-8 py-7 max-w-[1560px] mx-auto">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-7">
        <div className="flex items-start gap-3">
          <div
            className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 mt-1.5"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #6366F1)',
              boxShadow: '0 6px 18px rgba(139,92,246,0.35)',
            }}
          >
            <CheckSquare className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-white tracking-tight" style={{ fontSize: 40, lineHeight: 1.1 }}>
              Daily Checklist
            </h1>
            <p className="mt-2 text-[15px] font-normal text-[#8A93A6]" style={{ lineHeight: 1.5 }}>
              Build habits. Stay consistent. Master your routine.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.06] bg-[#0F1526] px-2 shadow-[0_4px_14px_rgba(0,0,0,0.35)]" style={{ height: 44 }}>
            <CalendarIcon className="h-4 w-4 text-[#8A93A6] ml-1.5" />
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-2 text-[14px] font-medium text-white hover:text-white/90 transition">
                  {format(date, 'd MMMM yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <button onClick={() => setDate(subDays(date, 1))} className="h-7 w-7 rounded-md flex items-center justify-center text-[#8A93A6] hover:text-white hover:bg-white/5 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setDate(addDays(date, 1))} className="h-7 w-7 rounded-md flex items-center justify-center text-[#8A93A6] hover:text-white hover:bg-white/5 transition">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setDate(new Date())}
            className="px-4 rounded-[12px] border border-white/[0.06] bg-[#0F1526] hover:bg-[#151C31] text-white text-[14px] font-semibold transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
            style={{ height: 44 }}
          >
            Today
          </button>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="px-4 rounded-[12px] border border-white/[0.06] bg-[#0F1526] hover:bg-[#151C31] text-white text-[14px] font-semibold flex items-center gap-2 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
            style={{ height: 44 }}
          >
            <Settings2 className="h-4 w-4" /> Customize
          </button>
        </div>
      </div>

      {/* ============ TABS + NEW SECTION ============ */}
      <div className="flex items-center justify-between border-b border-white/[0.05] mb-6">
        <div className="flex items-center gap-8">
          {(['checklist','templates','analytics','history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative text-[14px] font-medium capitalize transition-colors flex items-center',
                tab === t ? 'text-white' : 'text-[#8A93A6] hover:text-white'
              )}
              style={{ height: 44 }}
            >
              {t === 'checklist' ? 'My Checklist' : t}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full bg-[#8B5CF6]" />}
            </button>
          ))}
        </div>
        <button
          onClick={addSection}
          className="px-5 rounded-[12px] text-white text-[14px] font-semibold flex items-center gap-2 transition-transform hover:scale-[1.02]"
          style={{
            height: 42,
            background: 'linear-gradient(135deg, #A855F7, #6366F1)',
            boxShadow: '0 8px 22px rgba(139,92,246,0.35)',
          }}
        >
          <Plus className="h-4 w-4" /> New Section
        </button>
      </div>

      {tab === 'checklist' && (
      <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>
        {/* -------- LEFT -------- */}
        <div>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <KpiCard
              icon={ListChecks}
              label="Overall Progress"
              value={`${overall.done} / ${overall.total}`}
              sub="Tasks Completed"
              tint="violet"
              trend={trendVsY > 0 ? `${trendVsY}% vs yesterday` : undefined}
              ring={{ pct: overall.pct, gradient: ['#EC4899', '#8B5CF6'] }}
            />
            <KpiCard icon={LayoutGrid} label="Sections" value={sections.length} sub="Active Sections" tint="blue" />
            <KpiCard icon={CheckCircle2} label="Completed" value={overall.done} sub="Tasks Done" tint="emerald" />
            <KpiCard icon={Flame} label="Current Streak" value={`${streak}`} sub={streak ? 'Days · Keep it up!' : 'Start today'} tint="amber" />
          </div>

          {/* Sections */}
          <div className="space-y-5">
            {sections.map((s, idx) => {
              const pct = computeSectionPct(s);
              const isCollapsed = !!collapsed[s.id];
              const Icon = ICONS[s.icon] ?? ListTodo;
              const p = paletteFor(s.color);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'group relative rounded-[18px] border border-white/[0.05] bg-[#141C2D] overflow-hidden',
                    'shadow-[0_10px_32px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out',
                    'hover:-translate-y-0.5'
                  )}
                >
                  {/* Left accent border (4px) */}
                  <div
                    className="pointer-events-none absolute top-2.5 bottom-2.5 left-2.5 w-[4px] rounded-[4px]"
                    style={{ background: `linear-gradient(180deg, ${p.from}, ${p.to})` }}
                  />

                  {/* header */}
                  <div className="flex items-center gap-4 p-6 pl-8">
                    <GripVertical className="h-4 w-4 text-white/25 shrink-0 cursor-grab" />
                    <div
                      className="h-14 w-14 rounded-[16px] flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(180deg, ${p.from}, ${p.to})`,
                        boxShadow: `0 0 25px ${p.from}4D`,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <button onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))} className="min-w-0 flex-1 text-left">
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading font-bold text-[22px] text-white/50 tabular-nums">{idx + 1}.</span>
                        <h3 className="font-heading font-bold text-[24px] text-white truncate tracking-tight leading-tight">{s.title}</h3>
                      </div>
                      {s.description && <p className="text-[15px] text-[#94A3B8] mt-0.5 truncate">{s.description}</p>}
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <MiniRing value={pct} color={p.from} size={56} stroke={7} />
                      <span className="text-[15px] text-white/80 font-mono tabular-nums w-14 text-right">
                        {s.items.filter(i => i.done).length} / {s.items.length}
                      </span>
                      <button
                        onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition"
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setCustomizeOpen(true)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* items */}
                  {!isCollapsed && (
                    <div className="px-6 pb-5 pl-8 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {s.items.map((i) => (
                          <div
                            key={i.id}
                            onClick={() => toggleItem(s.id, i.id)}
                            className={cn(
                              'group/item flex items-center gap-3 px-3.5 rounded-[10px] border border-white/[0.04] bg-[#1A2235]',
                              'hover:bg-[#232D43] transition-all cursor-pointer'
                            )}
                            style={{ height: 42 }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleItem(s.id, i.id); }}
                              className={cn(
                                'h-5 w-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-all',
                                i.done ? 'border-transparent' : 'border-white/30 hover:border-white/50'
                              )}
                              style={i.done ? { background: `linear-gradient(135deg, ${p.from}, ${p.to})` } : undefined}
                            >
                              {i.done && (
                                <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3 text-white">
                                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <span className={cn('text-[13px] flex-1 truncate', i.done ? 'line-through text-white/40' : 'text-white/90')}>
                              {i.label}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeItem(s.id, i.id); }}
                              className="opacity-0 group-hover/item:opacity-100 text-white/40 hover:text-red-400 transition"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <AddItemInline onAdd={(l) => addItem(s.id, l)} color={p.from} />
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={addSection}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#8B5CF6]/40 bg-transparent text-[14px] font-medium text-[#A78BFA] hover:text-white hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/60 transition"
              style={{ height: 48 }}
            >
              <Plus className="h-4 w-4" /> Add New Section
            </button>
          </div>
        </div>

        {/* -------- RIGHT SIDEBAR (380px) -------- */}
        <aside className="space-y-5">
          {/* Progress Overview */}
          <SidePanel title="Progress Overview">
            {saving && <span className="absolute right-5 top-5 text-[10px] text-white/40 animate-pulse">Saving…</span>}
            <div className="flex items-center justify-center py-2">
              <ProgressRing
                value={overall.pct}
                size={180}
                stroke={14}
                gradientId="ring-overall"
                label="Overall"
                gradient={['#8B5CF6', '#3B82F6', '#06B6D4', '#F59E0B', '#F97316', '#EC4899']}
              />
            </div>
            <div className="mt-4 space-y-2">
              {sections.map((s) => {
                const pct = computeSectionPct(s);
                const p = paletteFor(s.color);
                return (
                  <div key={s.id} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.from }} />
                    <span className="flex-1 truncate text-white/85">{s.title}</span>
                    <span className="text-white/60 font-mono tabular-nums">{Math.round(pct)}%</span>
                    <span className="text-white/40 font-mono tabular-nums w-9 text-right">{s.items.filter(i => i.done).length}/{s.items.length}</span>
                  </div>
                );
              })}
            </div>
          </SidePanel>

          {/* Streak Tracker */}
          <SidePanel title="Streak Tracker">
            <div>
              <StreakRow icon={ClipboardCheck} label="Checklist Streak" value={`${streak} Days`} color="#F59E0B" />
              <StreakRow icon={BookOpen}       label="Journal Streak"   value={`${Math.max(streak, longestStreak - 4)} Days`} color="#10B981" />
              <StreakRow icon={TrendingUp}     label="Trading Plan Streak" value={`${Math.max(1, streak - 3)} Days`} color="#3B82F6" />
              <StreakRow icon={Activity}       label="Workout Streak"   value={`${Math.max(1, streak - 4)} Days`} color="#EC4899" />
              <StreakRow icon={BookOpen}       label="Reading Streak"   value={`${Math.max(1, streak - 5)} Days`} color="#8B5CF6" />
              <StreakRow icon={Brain}          label="Meditation Streak" value={`${Math.max(1, streak - 6)} Days`} color="#14B8A6" />
            </div>
          </SidePanel>

          {/* Today's Stats — 2x2 grid, 82px */}
          <SidePanel title="Today's Stats">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={CheckCircle2} label="Completed"  value={overall.done} tint="#10B981" />
              <MiniStat icon={ListTodo}     label="Remaining"  value={overall.total - overall.done} tint="#3B82F6" />
              <MiniStat icon={Clock}        label="Avg Time"   value="2h 15m" tint="#F59E0B" />
              <MiniStat icon={Flame}        label="Best Streak" value={`${longestStreak} Days`} tint="#EC4899" />
            </div>
          </SidePanel>

          {/* Quote Card */}
          <div className="relative overflow-hidden rounded-[18px] border border-white/[0.05] bg-[#141C2D] p-5">
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.08]"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
            />
            <QuoteIcon className="absolute right-4 bottom-4 h-10 w-10 text-white/15" />
            <p className="relative text-[13px] italic text-white/90 leading-relaxed pr-8">"{quote.text}"</p>
            <p className="relative mt-3 text-[11px] text-white/50">— {quote.author}</p>
          </div>

          {/* Item Types */}
          <SidePanel title="Item Types">
            <div className="grid grid-cols-2 gap-2.5">
              <TypeChip icon={CheckSquare} label="Checkbox" color="#3B82F6" />
              <TypeChip icon={Hash} label="Number" color="#10B981" />
              <TypeChip icon={Star} label="Rating" color="#F59E0B" />
              <TypeChip icon={Heart} label="Mood" color="#EC4899" />
              <TypeChip icon={Clock} label="Time" color="#8B5CF6" />
              <TypeChip icon={StickyNote} label="Note" color="#14B8A6" />
            </div>
          </SidePanel>

          {/* Templates */}
          <SidePanel title="Templates" action={<button onClick={() => setTemplatesOpen(true)} className="text-[11px] text-[#A78BFA] hover:underline">View all</button>}>
            <div className="space-y-2">
              {(templates as any[]).slice(0,4).map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-2.5 px-3 rounded-[10px] bg-[#1A2235] hover:bg-[#232D43] transition text-left"
                  style={{ height: 38 }}
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#A78BFA] shrink-0" />
                  <span className="text-[12.5px] flex-1 truncate text-white/85">{t.name}</span>
                  <span className="text-[11px] text-[#A78BFA]">Use</span>
                </button>
              ))}
              {!templates.length && <p className="text-[11px] text-white/40 py-2">No templates yet.</p>}
            </div>
          </SidePanel>

          {/* Quick Actions */}
          <SidePanel title="Quick Actions">
            <div className="space-y-2">
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

      {/* Floating action button — 64px per spec */}
      <button
        onClick={() => setCustomizeOpen(true)}
        aria-label="Open customize"
        className="fixed h-16 w-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 z-30"
        style={{
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #A855F7, #EC4899)',
          boxShadow: '0 12px 32px rgba(168,85,247,0.40)',
        }}
      >
        <ListChecks className="h-6 w-6" />
      </button>
      </div>
    </div>
  );
}


// ---------- Sidebar building blocks ----------
function SidePanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-[18px] border border-white/[0.05] bg-[#141C2D] p-5 shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-[13px] text-white tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}


function Sparkline({ color, seed = 6 }: { color: string; seed?: number }) {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const n = Math.sin((i + seed) * 1.3) * 0.5 + 0.5;
    const y = 12 - n * 10;
    return `${i * 6},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={52} height={14} viewBox="0 0 48 14" className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StreakRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3" style={{ height: 48 }}>
      <div
        className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, boxShadow: `inset 0 0 0 1px ${color}33` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="text-[12.5px] text-white/85 flex-1 truncate">{label}</span>
      <span className="text-[12.5px] font-heading font-bold tabular-nums" style={{ color }}>{value}</span>
      <Sparkline color={color} seed={label.length} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string | number; tint: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[12px] bg-[#1A2235] px-3 py-2.5 flex flex-col justify-center"
      style={{ height: 82 }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color: tint }} />
        <p className="text-[11px] text-white/60">{label}</p>
      </div>
      <p className="text-[18px] font-heading font-bold text-white tabular-nums leading-none">{value}</p>
    </div>
  );
}


function TypeChip({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-[#1A2235] px-3" style={{ height: 60 }}>
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-[12.5px] text-white/85 truncate">{label}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 rounded-[12px] bg-[#1A2235] hover:bg-[#232D43] transition text-left"
      style={{ height: 48 }}
    >
      <Icon className="h-4 w-4 text-[#A78BFA]" />
      <span className="text-[13px] text-white/90 flex-1">{label}</span>
    </button>
  );
}

function AddItemInline({ onAdd, color = '#8B5CF6' }: { onAdd: (label: string) => void; color?: string }) {
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(''); }}
      className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-dashed px-3.5"
      style={{ height: 42, borderColor: '#313A50' }}
    >
      <Plus className="h-3.5 w-3.5" style={{ color }} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add Item"
        className="flex-1 bg-transparent border-0 outline-none text-[13px] text-white/90 placeholder:text-white/40"
        style={{ color: v ? '#fff' : undefined }}
      />
      {v.trim() && (
        <button type="submit" className="text-[12px] font-medium" style={{ color }}>Add</button>
      )}
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
