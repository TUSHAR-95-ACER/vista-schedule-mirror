import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Strategy, ResearchTest, createStrategy } from '@/types/research';
import { loadStrategies, saveStrategies, getSeedStrategies } from '@/lib/researchStorage';
import { computeKPIs, riskMetrics, equityCurve, keyInsights } from '@/lib/researchAnalytics';
import { StrategyDialog } from '@/components/research/StrategyDialog';
import { AIInsightsPanel } from '@/components/shared/AIInsightsPanel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Plus, Upload, BarChart3, Sparkles, Moon, FileText, FlaskConical, Target,
  TrendingUp, Crosshair, Gauge, ShieldCheck, MoreHorizontal, Lightbulb,
  CheckCircle2, ArrowRight, Play, Search, SlidersHorizontal, GitCompare,
  RefreshCw, Boxes, Download, Camera, Shield, Settings, PlayCircle,
  CheckSquare, Star, XCircle, LineChart,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Pencil, Copy, Archive, Trash2 } from 'lucide-react';

// ---------- color helpers ----------
const COLOR_HEX: Record<string, { a: string; b: string }> = {
  blue:    { a: '#3B82F6', b: '#2563EB' },
  emerald: { a: '#10B981', b: '#059669' },
  amber:   { a: '#F59E0B', b: '#D97706' },
  purple:  { a: '#8B5CF6', b: '#7C3AED' },
  rose:    { a: '#EC4899', b: '#DB2777' },
  cyan:    { a: '#06B6D4', b: '#0891B2' },
  orange:  { a: '#F97316', b: '#EA580C' },
  slate:   { a: '#64748B', b: '#475569' },
};
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const GOLD = '#D4AF37';
const BORDER = '#1F1F1F';

function elapsed(from: string): string {
  const ms = Date.now() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3.6e6);
  const d = Math.floor(h / 24);
  if (d > 0) return `${String(d).padStart(2, '0')}d ${String(h % 24).padStart(2, '0')}h`;
  return `${String(h).padStart(2, '0')}h ${String(Math.floor((ms % 3.6e6) / 6e4)).padStart(2, '0')}m`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------- sparkline ----------
function Sparkline({ tests, color }: { tests: ResearchTest[]; color: string }) {
  const pts = equityCurve(tests);
  if (pts.length < 2) return <div className="h-8 w-24" />;
  const w = 96, h = 32, pad = 2;
  const vals = pts.map((p) => p.equity);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + (i / (vals.length - 1)) * (w - pad * 2)).toFixed(1)},${(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

// ---------- small pieces ----------
function KpiCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[10px] border px-3.5 py-3 lg:gap-0 lg:px-0 2xl:gap-3 2xl:px-3.5" style={{ background: '#000000', borderColor: BORDER }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] lg:h-8 lg:w-8 2xl:h-9 2xl:w-9" style={{ background: `${color}1A`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
        <Icon className="h-[17px] w-[17px]" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1 overflow-visible">
        <div className="whitespace-nowrap text-[9.5px] font-semibold uppercase leading-[1.25] tracking-normal text-neutral-500 2xl:truncate 2xl:tracking-[0.08em]">{label}</div>
        <div className="truncate text-[17px] font-bold leading-tight text-white">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[10px] border min-w-0', className)} style={{ background: '#000000', borderColor: BORDER }}>
      {title && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-neutral-400">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

type StatusStep = {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  count: number;
  pct: number;
};

function StatusCard({ status: s }: { status: StatusStep }) {
  return (
    <div className="min-w-0 overflow-visible rounded-[8px] border px-2.5 py-2 lg:px-2 2xl:px-2.5" style={{ borderColor: BORDER, background: '#050505' }}>
      <div className="flex min-w-0 items-start gap-1.5 lg:gap-1 2xl:items-center 2xl:gap-1.5">
        <s.icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />
        <span className="min-w-0 whitespace-normal text-[8.5px] font-bold uppercase leading-[1.25] tracking-wide text-neutral-500 2xl:truncate 2xl:whitespace-nowrap">{s.key}</span>
      </div>
      <div className="mt-1 text-[15px] font-bold text-white">{s.count}</div>
      <div className="text-[9.5px]" style={{ color: s.color }}>{s.pct}%</div>
    </div>
  );
}

export default function ResearchLab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [view, setView] = useState<'active' | 'archived' | 'templates' | 'marketplace'>('active');

  useEffect(() => {
    if (!user) return setStrategies([]);
    setStrategies(loadStrategies(user.id));
  }, [user]);

  const persist = (next: Strategy[]) => {
    setStrategies(next);
    if (user) saveStrategies(user.id, next);
  };

  const active = useMemo(() => strategies.filter((s) => s.status !== 'Archived'), [strategies]);
  const archived = useMemo(() => strategies.filter((s) => s.status === 'Archived'), [strategies]);
  const allTests = useMemo(() => active.flatMap((s) => s.tests), [active]);

  // ---------- top KPIs ----------
  const top = useMemo(() => {
    const kpi = computeKPIs(allTests);
    const rm = riskMetrics(allTests);
    const withTests = active.filter((s) => s.tests.length > 0);
    const avgBias = withTests.length
      ? withTests.reduce((a, s) => a + computeKPIs(s.tests).biasAccuracy, 0) / withTests.length
      : 0;
    const inValidation = active.filter((s) => s.status === 'Promising').length;
    return { kpi, rm, avgBias, inValidation };
  }, [active, allTests]);

  // ---------- testing status overview ----------
  const statusSteps = useMemo(() => {
    const n = active.length || 1;
    const decisive = (s: Strategy) => s.tests.some((t) => t.result === 'Win' || t.result === 'Loss');
    const allDecisive = (s: Strategy) => s.tests.length > 0 && s.tests.every((t) => t.result);
    const buckets = [
      { key: 'Not Started', icon: Shield, color: '#64748B', count: active.filter((s) => s.tests.length === 0).length },
      { key: 'Configured', icon: Settings, color: '#3B82F6', count: active.filter((s) => s.tests.length > 0 && !decisive(s)).length },
      { key: 'Running', icon: PlayCircle, color: '#3B82F6', count: active.filter((s) => s.status === 'Testing' && decisive(s) && !allDecisive(s)).length },
      { key: 'Completed', icon: CheckSquare, color: '#10B981', count: active.filter((s) => s.status === 'Testing' && allDecisive(s)).length },
      { key: 'Analyzing', icon: LineChart, color: '#8B5CF6', count: active.filter((s) => s.status === 'Testing' && s.tests.length >= 30).length },
      { key: 'Validation', icon: ShieldCheck, color: '#F59E0B', count: active.filter((s) => s.status === 'Promising').length },
      { key: 'Approved', icon: Star, color: '#10B981', count: active.filter((s) => s.status === 'Validated').length },
      { key: 'Rejected', icon: XCircle, color: '#EF4444', count: active.filter((s) => s.status === 'Failed').length },
    ];
    return buckets.map((b) => ({ ...b, pct: Math.round((b.count / n) * 100) }));
  }, [active]);

  // ---------- insights ----------
  const insights = useMemo(() => keyInsights(allTests).slice(0, 4), [allTests]);

  // ---------- recent tests ----------
  const recentTests = useMemo(() => {
    const rows = active.flatMap((s) => s.tests.map((t) => ({ s, t })));
    return rows.sort((a, b) => (b.t.date || '').localeCompare(a.t.date || '')).slice(0, 5);
  }, [active]);

  // ---------- validation tracker ----------
  const tracker = useMemo(() => {
    const waiting = active.filter((s) => s.tests.length > 0 && s.tests.length < 30 && s.status === 'Testing').length;
    const collecting = active.filter((s) => s.status === 'Testing' && s.tests.length >= 30).length;
    const ready = active.filter((s) => s.status === 'Promising').length;
    const passed = active.filter((s) => s.status === 'Validated').length;
    const failed = active.filter((s) => s.status === 'Failed').length;
    return { waiting, collecting, ready, passed, failed, inValidation: ready };
  }, [active]);

  // ---------- coach tip data quality ----------
  const quality = useMemo(() => {
    const total = allTests.length || 0;
    const graded = allTests.filter((t) => t.grade).length;
    const dataQ = total ? Math.round((graded / total) * 100) : 0;
    const pairs = new Set(allTests.map((t) => t.pair).filter(Boolean));
    const coverage = Math.min(100, pairs.size * 18);
    const sessions = new Set(allTests.map((t) => t.session).filter(Boolean));
    const conds = new Set(allTests.map((t) => t.marketCondition).filter(Boolean));
    return {
      dataQ,
      coverage,
      sample: total,
      timeframe: `${Math.min(sessions.size, 5)}/5`,
      regime: `${Math.min(conds.size, 3)}/3`,
    };
  }, [allTests]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s: Strategy) => { setEditing(s); setDialogOpen(true); };
  const handleSave = (s: Strategy) => {
    const exists = strategies.some((x) => x.id === s.id);
    persist(exists ? strategies.map((x) => (x.id === s.id ? s : x)) : [s, ...strategies]);
  };
  const handleDuplicate = (s: Strategy) => {
    const copy = { ...s, id: crypto.randomUUID(), name: `${s.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([copy, ...strategies]);
  };
  const handleArchive = (s: Strategy) => {
    persist(strategies.map((x) => (x.id === s.id ? { ...x, status: x.status === 'Archived' ? 'Testing' : 'Archived' } : x)));
  };
  const handleDelete = (s: Strategy) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    persist(strategies.filter((x) => x.id !== s.id));
  };
  const seed = () => {
    persist([...getSeedStrategies(), ...strategies]);
    toast({ title: 'Strategies seeded', description: 'Added 5 example strategies.' });
  };
  const importStrategy = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      try {
        const parsed = JSON.parse(await f.text()) as Strategy;
        const imported = createStrategy({ ...parsed, id: undefined as any });
        persist([{ ...imported, tests: parsed.tests || [] }, ...strategies]);
        toast({ title: 'Strategy imported' });
      } catch {
        toast({ title: 'Import failed', description: 'Invalid JSON', variant: 'destructive' });
      }
    };
    input.click();
  };
  const exportReport = () => {
    const blob = new Blob([JSON.stringify(strategies, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'research-lab-export.json';
    a.click();
    toast({ title: 'Report exported' });
  };

  const shownStrategies = view === 'archived' ? archived : active;

  return (
    <div className="p-4 sm:p-5 space-y-3 min-w-0">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[0.04em] text-white font-heading">
            RESEARCH LAB
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 normal-case tracking-normal">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </h1>
          <p className="text-[12px] text-neutral-500 mt-0.5">Backtest, optimize, and validate your strategies with data-driven insights.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="h-8 w-8 rounded-[7px] border flex items-center justify-center text-neutral-400 hover:text-white" style={{ borderColor: BORDER, background: '#0A0A0A' }}>
            <Moon className="h-3.5 w-3.5" />
          </button>
          <HeaderBtn icon={Sparkles} color="#8B5CF6" label="AI Coach" onClick={() => navigate('/ai-insights')} />
          <HeaderBtn icon={Upload} color="#94A3B8" label="Import" onClick={importStrategy} />
          <HeaderBtn icon={BarChart3} color="#94A3B8" label="Analytics" onClick={() => navigate('/research-lab/analytics')} />
          <Button size="sm" onClick={openNew} className="h-8 text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-[7px]">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Strategy
          </Button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="flex items-center gap-5 border-b" style={{ borderColor: BORDER }}>
        {([
          ['active', `Active (${active.length})`],
          ['archived', `Archived (${archived.length})`],
          ['templates', 'Templates'],
          ['marketplace', 'Marketplace'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={cn('pb-2 text-[12px] font-medium -mb-px border-b-2 transition-colors',
              view === k ? 'text-white border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300')}
          >
            {label}
          </button>
        ))}
      </div>

      {(view === 'templates' || view === 'marketplace') ? (
        <div className="text-center py-16 border border-dashed rounded-lg" style={{ borderColor: BORDER }}>
          <div className="text-4xl mb-3">🧪</div>
          <h3 className="font-heading font-semibold text-lg text-white">Coming soon</h3>
          <p className="text-sm text-neutral-500 mt-1">{view === 'templates' ? 'Strategy templates will appear here.' : 'The strategy marketplace is on the roadmap.'}</p>
        </div>
      ) : shownStrategies.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg" style={{ borderColor: BORDER }}>
          <div className="text-4xl mb-3">🧪</div>
          <h3 className="font-heading font-semibold text-lg text-white">{view === 'active' ? 'No strategies yet' : 'Nothing archived'}</h3>
          <p className="text-sm text-neutral-500 mt-1 mb-4">{view === 'active' ? 'Create your first strategy or seed examples to get started.' : 'Archived strategies will appear here.'}</p>
          {view === 'active' && (
            <div className="flex justify-center gap-2">
              <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="h-4 w-4 mr-1" /> New Strategy</Button>
              <Button variant="outline" onClick={seed}>Seed Examples</Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ===== KPI row ===== */}
          <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:[grid-template-columns:repeat(7,minmax(0,1fr))]">
            <KpiCard icon={FileText} color="#A855F7" label="Total Strategies" value={String(active.length)} />
            <KpiCard icon={FlaskConical} color="#3B82F6" label="Total Tests" value={String(allTests.length)} />
            <KpiCard icon={Target} color="#10B981" label="Win Rate" value={`${top.kpi.winRate.toFixed(0)}%`} />
            <KpiCard icon={TrendingUp} color={GOLD} label="Profit Factor" value={Number.isFinite(top.rm.profitFactor) ? top.rm.profitFactor.toFixed(2) : '∞'} />
            <KpiCard icon={Crosshair} color="#06B6D4" label="Expectancy" value={`${top.rm.expectancy.toFixed(2)}R`} />
            <KpiCard icon={Gauge} color="#F97316" label="Avg Bias Accuracy" value={`${top.avgBias.toFixed(0)}%`} />
            <KpiCard icon={ShieldCheck} color="#8B5CF6" label="In Validation" value={String(top.inValidation)} />
          </div>

          {/* ===== Main split ===== */}
          <div className="grid gap-3 min-w-0 lg:[grid-template-columns:minmax(0,1fr)_300px]">
            {/* ---- left column ---- */}
            <div className="space-y-3 min-w-0">
              {/* Testing status overview */}
              <Panel title="Testing Status Overview">
                <div className="px-3 pb-3">
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:[grid-template-columns:repeat(7,minmax(0,1fr))]">
                    {statusSteps.slice(0, 7).map((s) => <StatusCard key={s.key} status={s} />)}
                  </div>
                  <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:[grid-template-columns:repeat(7,minmax(0,1fr))]">
                    {statusSteps[7] && <StatusCard status={statusSteps[7]} />}
                  </div>
                  {/* progress line */}
                  <div className="mt-3 grid min-w-0 grid-cols-8">
                    {statusSteps.map((s, i) => (
                      <div key={s.key} className="relative flex h-1.5 min-w-0 items-center justify-center">
                        {i > 0 && (
                          <span
                            className="absolute right-1/2 top-[2.5px] h-px w-full"
                            style={{ backgroundColor: s.color, opacity: 0.48 }}
                          />
                        )}
                        <span
                          className="relative z-[1] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: s.color, opacity: 0.7, boxShadow: `0 0 3px ${s.color}45` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-8 text-center text-[8.5px] text-neutral-500">
                    {statusSteps.map((s) => <span key={s.key}>{s.key}</span>)}
                  </div>
                </div>
              </Panel>

              {/* Strategy rows */}
              {shownStrategies.map((s) => (
                <StrategyRow
                  key={s.id}
                  strategy={s}
                  onOpen={() => navigate(`/research-lab/${s.id}`)}
                  onResults={() => navigate(`/research-lab/${s.id}`)}
                  onEdit={() => openEdit(s)}
                  onDuplicate={() => handleDuplicate(s)}
                  onArchive={() => handleArchive(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}

              {/* Coach tip */}
              <div className="rounded-[10px] border px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ borderColor: BORDER, background: '#000000' }}>
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                  <Lightbulb className="h-3.5 w-3.5" /> Coach Tip
                </span>
                <span className="text-[11.5px] text-neutral-300 flex-1 min-w-[220px]">
                  Run at least 30–50 trades in backtests for reliable results. Validate in forward market conditions before promoting.
                </span>
                <div className="flex items-center gap-4 flex-wrap">
                  <QualityStat label="Data Quality" value={`${quality.dataQ}%`} note={quality.dataQ >= 80 ? 'High' : 'Low'} good={quality.dataQ >= 80} />
                  <QualityStat label="Market Coverage" value={`${quality.coverage}%`} note="Good" good />
                  <QualityStat label="Sample Size" value={String(quality.sample)} note="Trades" good={quality.sample >= 30} neutral />
                  <QualityStat label="Timeframe Coverage" value={quality.timeframe} note="Good" good />
                  <QualityStat label="Regime Coverage" value={quality.regime} note="Good" good />
                </div>
              </div>
            </div>

            {/* ---- right sidebar ---- */}
            <div className="space-y-3 min-w-0">
              {/* Insights */}
              <Panel title={<span className="flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" style={{ color: GOLD }} /> Insights</span> as any}>
                <div className="px-4 pb-3 space-y-2">
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-neutral-300">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0" style={{ color: ins.tone === 'negative' ? RED : ins.tone === 'warning' ? AMBER : GREEN }} />
                      <span className="leading-snug">{ins.title} — {ins.detail}</span>
                    </div>
                  ))}
                  <button onClick={() => navigate('/research-lab/analytics')} className="mt-1 w-full rounded-[7px] border py-2 text-[11px] font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2" style={{ borderColor: BORDER, background: '#0A0A0A' }}>
                    View Full Insights <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </Panel>

              {/* Recent tests */}
              <Panel title="Recent Tests" action={<button onClick={() => navigate('/research-lab/analytics')} className="text-[10px] text-blue-400 hover:text-blue-300">View All</button>}>
                <div className="px-4 pb-3 space-y-2">
                  {recentTests.length === 0 && <div className="text-[11px] text-neutral-500">No tests logged yet.</div>}
                  {recentTests.map(({ s, t }) => {
                    const label = t.result === 'Win' ? 'Completed' : t.result === 'Loss' ? 'Completed' : t.result ? 'Testing' : 'Configured';
                    const color = label === 'Completed' ? GREEN : label === 'Testing' ? '#3B82F6' : AMBER;
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-neutral-300 truncate">{s.name}{t.pair ? ` — ${t.pair}` : ''}{t.session ? ` (${t.session})` : ''}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold" style={{ color }}>{label}</span>
                          <span className="text-neutral-500">{shortDate(t.date)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* Validation tracker */}
              <Panel title="Validation Tracker" action={<button onClick={() => navigate('/research-lab/analytics')} className="text-[10px] text-blue-400 hover:text-blue-300">View All</button>}>
                <div className="px-4 pb-3 flex items-center gap-4">
                  <TrackerDonut count={tracker.inValidation} />
                  <div className="space-y-1.5 flex-1 text-[10.5px]">
                    <TrackerRow color="#64748B" label="Waiting for more data" value={tracker.waiting} />
                    <TrackerRow color="#3B82F6" label="Collecting live trades" value={tracker.collecting} />
                    <TrackerRow color={AMBER} label="Ready for review" value={tracker.ready} />
                    <TrackerRow color={GREEN} label="Passed" value={tracker.passed} />
                    <TrackerRow color={RED} label="Failed" value={tracker.failed} />
                  </div>
                </div>
              </Panel>

              {/* Quick actions */}
              <Panel title="Quick Actions">
                <div className="px-3 pb-3 grid grid-cols-4 gap-2">
                  <QuickAction icon={Play} color="#8B5CF6" label="New Backtest" onClick={openNew} />
                  <QuickAction icon={Search} color="#06B6D4" label="Strategy Scan" onClick={() => navigate('/research-lab/analytics')} />
                  <QuickAction icon={SlidersHorizontal} color="#8B5CF6" label="Parameter Optimizer" onClick={() => navigate('/research-lab/analytics')} />
                  <QuickAction icon={GitCompare} color="#3B82F6" label="Compare Strategies" onClick={() => navigate('/research-lab/analytics')} />
                  <QuickAction icon={RefreshCw} color="#64748B" label="Walk Forward" onClick={() => navigate('/research-lab/analytics')} />
                  <QuickAction icon={Boxes} color="#64748B" label="Monte Carlo" onClick={() => navigate('/research-lab/analytics')} />
                  <QuickAction icon={Download} color="#3B82F6" label="Export Report" onClick={exportReport} />
                  <QuickAction icon={Camera} color="#8B5CF6" label="Save Snapshot" onClick={() => toast({ title: 'Snapshot saved' })} />
                </div>
                <div className="px-3 pb-3">
                  <button onClick={() => navigate('/research-lab/analytics')} className="w-full rounded-[7px] py-2.5 text-[12px] font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                    View Action Plan <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      <AIInsightsPanel
        page="Research Lab"
        payload={{ total_strategies: active.length, archived: archived.length, strategies }}
        className="border-[#262626] bg-black"
      />

      <StrategyDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={handleSave} />
    </div>
  );
}

// ---------- header button ----------
function HeaderBtn({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-8 px-3 rounded-[7px] border flex items-center gap-1.5 text-[12px] font-medium text-neutral-300 hover:text-white" style={{ borderColor: BORDER, background: '#0A0A0A' }}>
      <Icon className="h-3.5 w-3.5" style={{ color }} /> {label}
    </button>
  );
}

// ---------- strategy row ----------
function StrategyRow({ strategy: s, onOpen, onResults, onEdit, onDuplicate, onArchive, onDelete }: {
  strategy: Strategy; onOpen: () => void; onResults: () => void;
  onEdit: () => void; onDuplicate: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const kpi = computeKPIs(s.tests);
  const rm = riskMetrics(s.tests);
  const c = COLOR_HEX[s.color] || COLOR_HEX.blue;
  const progress = Math.min(100, Math.round((s.tests.length / 30) * 100));
  const stage = s.status === 'Validated' ? 'Approved' : s.status === 'Promising' ? 'Validation' : s.status === 'Failed' ? 'Rejected' : 'Testing';
  const stageColor = stage === 'Validation' ? AMBER : stage === 'Approved' ? GREEN : stage === 'Rejected' ? RED : '#3B82F6';
  const isValidated = s.status === 'Validated';

  const stat = (label: string, value: string, color?: string) => (
    <div className="min-w-0">
      <div className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-neutral-500">{label}</div>
      <div className="text-[13px] font-bold truncate" style={{ color: color || '#E5E5E5' }}>{value}</div>
    </div>
  );

  return (
    <div className="rounded-[10px] border p-3.5 min-w-0" style={{ background: '#000000', borderColor: isValidated ? `${GOLD}55` : BORDER, boxShadow: isValidated ? `0 0 24px ${GOLD}14` : undefined }}>
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <div className="h-10 w-10 rounded-[9px] flex items-center justify-center text-lg shrink-0" style={{ background: `${c.a}1A`, boxShadow: `inset 0 0 0 1px ${c.a}40` }}>
          {s.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white truncate">{s.name}</span>
            {s.status !== 'Archived' && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: GREEN, background: `${GREEN}14`, boxShadow: `inset 0 0 0 1px ${GREEN}33` }}>Active</span>
            )}
          </div>
          <div className="text-[10.5px] text-neutral-500 truncate">{s.type}</div>
        </div>
        <div className="flex items-center gap-5 ml-auto flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: stageColor }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor }} /> {stage}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5">Started <span className="text-neutral-300">{fmtDate(s.createdAt)}</span></div>
          </div>
          <div>
            <div className="text-[9px] text-neutral-500">Time</div>
            <div className="text-[11px] font-semibold text-neutral-200">{elapsed(s.createdAt)}</div>
          </div>
          <div className="w-24">
            <div className="flex justify-between text-[9px] text-neutral-500"><span>Progress</span><span style={{ color: c.a }}>{progress}%</span></div>
            <div className="h-1 rounded-full mt-1" style={{ background: '#1A1A1A' }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${c.b}, ${c.a})`, boxShadow: `0 0 8px ${c.a}66` }} />
            </div>
          </div>
          <Sparkline tests={s.tests} color={c.a} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-[6px] flex items-center justify-center text-neutral-500 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" />Rename / Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}><Archive className="h-4 w-4 mr-2" />{s.status === 'Archived' ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex items-center gap-5 flex-wrap" style={{ borderColor: BORDER }}>
        {stat('Tests', String(s.tests.length))}
        {stat('Win Rate', `${kpi.winRate.toFixed(0)}%`, kpi.winRate >= 50 ? GREEN : kpi.winRate > 0 ? RED : '#E5E5E5')}
        {stat('Profit Factor', Number.isFinite(rm.profitFactor) && rm.profitFactor > 0 ? rm.profitFactor.toFixed(2) : '—', rm.profitFactor >= 1.5 ? GREEN : undefined)}
        {stat('Expectancy', `${rm.expectancy.toFixed(2)}R`, rm.expectancy > 0 ? GREEN : rm.expectancy < 0 ? RED : undefined)}
        {stat('Max Drawdown', `${rm.maxDrawdown.toFixed(2)}R`, rm.maxDrawdown < 0 ? RED : undefined)}
        {stat('Bias Acc.', `${kpi.biasAccuracy.toFixed(0)}%`, kpi.biasAccuracy >= 60 ? GREEN : undefined)}
        {stat('Validation', String(kpi.validationScore), GOLD)}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onResults} className="h-7 px-3 rounded-[6px] border text-[11px] font-semibold" style={{ borderColor: `${c.a}55`, color: c.a, background: `${c.a}0D` }}>View Results</button>
          <button onClick={onOpen} className="h-7 px-3 rounded-[6px] text-[11px] font-semibold flex items-center gap-1" style={{ color: c.a }}>
            Open <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- validation tracker ----------
function TrackerDonut({ count }: { count: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg width={84} height={84} className="-rotate-90">
        <circle cx={42} cy={42} r={r} fill="none" stroke="#1A1A1A" strokeWidth={9} />
        <circle cx={42} cy={42} r={r} fill="none" stroke={GREEN} strokeWidth={9} strokeDasharray={`${c * 0.62} ${c}`} strokeLinecap="round" />
        <circle cx={42} cy={42} r={r} fill="none" stroke={AMBER} strokeWidth={9} strokeDasharray={`${c * 0.3} ${c}`} strokeDashoffset={-c * 0.66} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold text-white leading-none">{count}</span>
        <span className="text-[7.5px] text-neutral-500 mt-0.5">In Validation</span>
      </div>
    </div>
  );
}
function TrackerRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full border shrink-0" style={{ borderColor: color }} />
      <span className="text-neutral-400 flex-1">{label}</span>
      <span className="text-neutral-200 font-semibold">{value}</span>
    </div>
  );
}

// ---------- quick action ----------
function QuickAction({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-[8px] border py-2.5 px-1 flex flex-col items-center gap-1.5 hover:bg-white/[0.03] transition-colors" style={{ borderColor: BORDER, background: '#050505' }}>
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-[8px] text-neutral-400 leading-tight text-center">{label}</span>
    </button>
  );
}

// ---------- coach quality stat ----------
function QualityStat({ label, value, note, good, neutral }: { label: string; value: string; note: string; good?: boolean; neutral?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[8.5px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-[13px] font-bold text-white">
        {value} <span className="text-[9px] font-semibold" style={{ color: neutral ? '#94A3B8' : good ? GREEN : RED }}>{note}</span>
      </div>
    </div>
  );
}
