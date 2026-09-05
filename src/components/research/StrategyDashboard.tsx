import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Strategy, ResearchTest } from '@/types/research';
import {
  computeKPIs, winRateByKey, conditionStats, tradeQuality, equityCurve, riskMetrics,
  returnDistribution, executionQuality, keyInsights, validationProgress, nextSteps, edgeSummary,
} from '@/lib/researchAnalytics';
import {
  ArrowLeft, Plus, Pencil, Save, Download, Archive, Star, X, Trash2,
  TrendingUp, TrendingDown, Target, Percent, Activity, Gauge, Layers, CheckCircle2,
  AlertTriangle, Info, Lightbulb,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  strategy: Strategy;
  onUpdate: (s: Strategy) => void;
  onEdit: () => void;
  onArchive: () => void;
  onNewTest: () => void;
  onPromote: () => void;
}

const CARD = 'rounded-[9px] border border-[#262626] bg-black/80';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const PURPLE = '#8B5CF6';
const BLUE = '#3B82F6';
const GRADE_COLORS: Record<string, string> = { A: GREEN, B: BLUE, C: AMBER, Ungraded: '#404040' };

const RANGES = [
  { key: '30d', label: 'Last 30 Days', days: 30 },
  { key: '90d', label: 'Last 90 Days', days: 90 },
  { key: '180d', label: 'Last 6 Months', days: 180 },
  { key: '365d', label: 'Last 12 Months', days: 365 },
  { key: 'all', label: 'All Time', days: 0 },
];

const TABS = ['Overview', 'Performance', 'Breakdown', 'Validation', 'Tests'] as const;
type Tab = typeof TABS[number];

const tooltipStyle = {
  background: '#0A0A0A',
  border: '1px solid #262626',
  borderRadius: 7,
  fontSize: 11,
  color: '#E5E5E5',
} as const;

export function StrategyDashboard({ strategy, onUpdate, onEdit, onArchive, onNewTest, onPromote }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPair, setNewPair] = useState('');
  const [range, setRange] = useState('all');
  const [tab, setTab] = useState<Tab>('Overview');

  const tests: ResearchTest[] = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    if (!r || !r.days) return strategy.tests;
    const cutoff = new Date(Date.now() - r.days * 864e5).toISOString().slice(0, 10);
    return strategy.tests.filter((t) => (t.date || '') >= cutoff);
  }, [strategy.tests, range]);

  const kpi = useMemo(() => computeKPIs(tests), [tests]);
  const metrics = useMemo(() => riskMetrics(tests), [tests]);
  const curve = useMemo(() => equityCurve(tests), [tests]);
  const dist = useMemo(() => returnDistribution(tests), [tests]);
  const quality = useMemo(() => tradeQuality(tests), [tests]);
  const exec = useMemo(() => executionQuality(tests), [tests]);
  const sessionData = useMemo(() => winRateByKey(tests, (t) => t.session || ''), [tests]);
  const pairData = useMemo(() => winRateByKey(tests, (t) => t.pair || ''), [tests]);
  const condData = useMemo(() => conditionStats(tests), [tests]);
  const insights = useMemo(() => keyInsights(tests), [tests]);
  const checks = useMemo(() => validationProgress(tests), [tests]);
  const steps = useMemo(() => nextSteps(tests), [tests]);
  const edge = useMemo(() => edgeSummary(tests), [tests]);

  const addPair = () => {
    const p = newPair.trim().toUpperCase();
    if (!p || strategy.pairs.includes(p)) return;
    onUpdate({ ...strategy, pairs: [...strategy.pairs, p] });
    setNewPair('');
  };
  const removePair = (p: string) => onUpdate({ ...strategy, pairs: strategy.pairs.filter((x) => x !== p) });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(strategy, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategy.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveTemplate = () => {
    onUpdate({ ...strategy, templateName: strategy.name });
    toast({ title: 'Template saved', description: 'Field structure stored for reuse.' });
  };

  const deleteTest = (id: string) => onUpdate({ ...strategy, tests: strategy.tests.filter((t) => t.id !== id) });

  const showPerf = tab === 'Overview' || tab === 'Performance';
  const showBreak = tab === 'Overview' || tab === 'Breakdown';
  const showValid = tab === 'Overview' || tab === 'Validation';
  const showTests = tab === 'Overview' || tab === 'Tests';

  return (
    <div className="space-y-3">
      {/* ---------- Header ---------- */}
      <div className={cn(CARD, 'p-3')}>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-[#8A8A8A]" onClick={() => navigate('/research-lab')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All Strategies
          </Button>
          <span className="text-[11px] text-[#525252]">/</span>
          <span className="text-[11px] text-[#8A8A8A]">Strategy Testing</span>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-[9px] border border-[#262626] bg-[#0E0E0E] flex items-center justify-center text-xl">
              {strategy.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-[19px] font-bold leading-tight truncate">{strategy.name}</h1>
                <span
                  className="shrink-0 rounded-[5px] px-1.5 py-[2px] text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    color: edge.score >= 75 ? GREEN : edge.score >= 55 ? BLUE : edge.score >= 35 ? AMBER : RED,
                    background: `${edge.score >= 75 ? GREEN : edge.score >= 55 ? BLUE : edge.score >= 35 ? AMBER : RED}18`,
                  }}
                >
                  {edge.verdict}
                </span>
              </div>
              <p className="text-[11px] text-[#737373] truncate">
                {strategy.type} · {strategy.status} · {strategy.description || 'No description'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-7 w-[136px] rounded-[7px] border-[#262626] bg-[#0E0E0E] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.key} value={r.key} className="text-[11px]">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 rounded-[7px] px-2.5 text-[11px]" onClick={onNewTest}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Test
            </Button>
            <ToolBtn icon={Pencil} label="Edit" onClick={onEdit} />
            <ToolBtn icon={Save} label="Save Template" onClick={saveTemplate} />
            <ToolBtn icon={Download} label="Export" onClick={exportData} />
            <ToolBtn icon={Archive} label="Archive" onClick={onArchive} />
            <Button
              size="sm"
              onClick={onPromote}
              className="h-7 rounded-[7px] px-2.5 text-[11px] font-semibold text-black hover:opacity-90"
              style={{ background: GREEN }}
            >
              <Star className="h-3.5 w-3.5 mr-1" /> Promote to Playbook
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- KPI cards ---------- */}
      <div className="grid min-w-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Kpi icon={Layers} label="Total Tests" value={kpi.totalTests} sub={`${kpi.wins}W · ${kpi.losses}L · ${kpi.scratches}S`} />
        <Kpi icon={Percent} label="Win Rate" value={`${kpi.winRate.toFixed(1)}%`} tone={kpi.winRate >= 50 ? 'pos' : 'neg'} sub="Decisive tests" />
        <Kpi icon={TrendingUp} label="Net R" value={`${metrics.netR > 0 ? '+' : ''}${metrics.netR}R`} tone={metrics.netR >= 0 ? 'pos' : 'neg'} sub={`Best ${metrics.bestTrade}R`} />
        <Kpi icon={Target} label="Expectancy" value={`${metrics.expectancy > 0 ? '+' : ''}${metrics.expectancy}R`} tone={metrics.expectancy >= 0 ? 'pos' : 'neg'} sub="Per test" />
        <Kpi icon={Activity} label="Profit Factor" value={Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'} tone={metrics.profitFactor >= 1.5 ? 'pos' : 'warn'} sub={`Avg win ${metrics.avgWin}R`} />
        <Kpi icon={TrendingDown} label="Max Drawdown" value={`${metrics.maxDrawdown}R`} tone="neg" sub={`${metrics.maxLossStreak} loss streak`} />
        <Kpi icon={Gauge} label="Avg RR" value={kpi.avgRR ? kpi.avgRR.toFixed(2) : '—'} sub={`Sharpe ${metrics.sharpe}`} />
        <Kpi icon={Info} label="Bias Accuracy" value={`${kpi.biasAccuracy.toFixed(0)}%`} tone={kpi.biasAccuracy >= 60 ? 'pos' : 'warn'} sub="Predicted vs actual" />
        <Kpi icon={CheckCircle2} label="Best Session" value={kpi.bestSession} sub={`Best pair ${kpi.bestPair}`} />
        <Kpi icon={Star} label="Validation Score" value={`${kpi.validationScore}/100`} tone={kpi.validationScore >= 60 ? 'pos' : 'warn'} sub={`A-grade ${kpi.aGradePct.toFixed(0)}%`} />
      </div>

      {/* ---------- Tabs ---------- */}
      <div className={cn(CARD, 'flex flex-wrap items-center gap-1 p-1')}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-[7px] px-3 py-1.5 text-[11.5px] font-medium transition-colors',
              tab === t ? 'text-white' : 'text-[#8A8A8A] hover:text-white hover:bg-white/[0.04]',
            )}
            style={tab === t ? { background: `${PURPLE}22`, color: '#C4B5FD', boxShadow: `inset 0 0 0 1px ${PURPLE}55` } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------- Performance charts ---------- */}
      {showPerf && (
        <>
          <div className="grid min-w-0 grid-cols-1 lg:[grid-template-columns:minmax(0,62fr)_minmax(0,38fr)] gap-2">
            <Panel title="Equity Curve" hint={`${curve.length} closed tests · cumulative R`}>
              <ResponsiveContainer width="100%" height={216}>
                <AreaChart data={curve} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}R`, 'Equity']} labelFormatter={(l) => `Test #${l}`} />
                  <Area type="monotone" dataKey="equity" stroke={GREEN} strokeWidth={1.6} fill="url(#eqFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Drawdown Analysis" hint={`Max ${metrics.maxDrawdown}R below peak`}>
              <ResponsiveContainer width="100%" height={216}>
                <AreaChart data={curve} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0} />
                      <stop offset="100%" stopColor={RED} stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}R`, 'Drawdown']} labelFormatter={(l) => `Test #${l}`} />
                  <Area type="monotone" dataKey="drawdown" stroke={RED} strokeWidth={1.4} fill="url(#ddFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid min-w-0 grid-cols-1 lg:[grid-template-columns:minmax(0,34fr)_minmax(0,30fr)_minmax(0,36fr)] gap-2">
            <Panel title="Return Distribution" hint="R multiples per bucket">
              <ResponsiveContainer width="100%" height={196}>
                <BarChart data={dist} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="key" stroke="#525252" fontSize={9} tickLine={false} axisLine={{ stroke: '#262626' }} interval={0} />
                  <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 0, 0, 0]}>
                    {dist.map((d, i) => <Cell key={i} fill={d.positive ? GREEN : RED} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Risk Metrics" hint="Derived from closed tests">
              <div className="grid grid-cols-2 gap-x-3 gap-y-[7px] pt-1">
                <Metric label="Avg Win" value={`${metrics.avgWin}R`} tone="pos" />
                <Metric label="Avg Loss" value={`${metrics.avgLoss}R`} tone="neg" />
                <Metric label="Best Trade" value={`${metrics.bestTrade}R`} tone="pos" />
                <Metric label="Worst Trade" value={`${metrics.worstTrade}R`} tone="neg" />
                <Metric label="Win Streak" value={`${metrics.maxWinStreak}`} tone="pos" />
                <Metric label="Loss Streak" value={`${metrics.maxLossStreak}`} tone="neg" />
                <Metric label="Sharpe (R)" value={`${metrics.sharpe}`} tone={metrics.sharpe >= 0.3 ? 'pos' : 'warn'} />
                <Metric label="Max DD" value={`${metrics.maxDrawdown}R`} tone="neg" />
              </div>
            </Panel>

            <Panel title="Trade Quality" hint="Process grade distribution">
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="55%" height={186}>
                  <PieChart>
                    <Pie data={quality} dataKey="count" nameKey="key" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                      {quality.map((q, i) => <Cell key={i} fill={GRADE_COLORS[q.key] ?? PURPLE} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {quality.length === 0 && <p className="text-[11px] text-[#737373]">No graded tests yet.</p>}
                  {quality.map((q) => (
                    <div key={q.key} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-[#A3A3A3] truncate">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: GRADE_COLORS[q.key] ?? PURPLE }} />
                        {q.key === 'Ungraded' ? 'Ungraded' : `Grade ${q.key}`}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-white">{q.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Execution Quality" hint="Process compliance across logged tests">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 pt-0.5">
              {exec.map((m) => (
                <div key={m.key} className="min-w-0">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#A3A3A3] truncate">{m.key}</span>
                    <span className="font-semibold tabular-nums" style={{ color: m.pct >= 70 ? GREEN : m.pct >= 40 ? AMBER : RED }}>{m.pct}%</span>
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-[#171717] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.pct >= 70 ? GREEN : m.pct >= 40 ? AMBER : RED }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ---------- Breakdown tables ---------- */}
      {showBreak && (
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-2">
          <Panel title="Win Rate by Session" hint="Decisive tests only">
            <RateTable rows={sessionData} accent={PURPLE} />
          </Panel>
          <Panel title="Win Rate by Pair" hint="Decisive tests only">
            <RateTable rows={pairData} accent={BLUE} />
          </Panel>
          <Panel title="Win Rate by Market Condition" hint="Trending · Volatile · Sideways">
            <RateTable rows={condData.map((c) => ({ key: c.key, wins: c.wins, losses: c.losses, total: c.total, winRate: c.winRate }))} accent={GREEN} />
          </Panel>
        </div>
      )}

      {/* ---------- Insights / Edge / Validation ---------- */}
      {showValid && (
        <>
          <div className="grid min-w-0 grid-cols-1 lg:[grid-template-columns:minmax(0,64fr)_minmax(0,36fr)] gap-2">
            <Panel title="Key Insights" hint="Auto-derived from your test log">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {insights.map((ins, i) => {
                  const color = ins.tone === 'positive' ? GREEN : ins.tone === 'negative' ? RED : ins.tone === 'warning' ? AMBER : PURPLE;
                  const Icon = ins.tone === 'positive' ? TrendingUp : ins.tone === 'negative' ? TrendingDown : ins.tone === 'warning' ? AlertTriangle : Info;
                  return (
                    <div key={i} className="rounded-[7px] border border-[#262626] bg-[#0A0A0A] p-2 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="mt-[1px] h-5 w-5 shrink-0 rounded-[5px] flex items-center justify-center" style={{ background: `${color}1A` }}>
                          <Icon className="h-3 w-3" style={{ color }} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-semibold text-white truncate">{ins.title}</p>
                          <p className="text-[10.5px] leading-snug text-[#8A8A8A]">{ins.detail}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Edge Summary" hint="Composite validation verdict">
              <div className="flex items-center gap-3 pt-0.5">
                <div className="relative h-[92px] w-[92px] shrink-0">
                  <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#171717" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                      stroke={edge.score >= 75 ? GREEN : edge.score >= 55 ? BLUE : edge.score >= 35 ? AMBER : RED}
                      strokeDasharray={`${(edge.score / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-heading text-[20px] font-bold leading-none tabular-nums">{edge.score}</span>
                    <span className="text-[8.5px] uppercase tracking-[0.14em] text-[#737373] mt-0.5">Score</span>
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[13px] font-semibold text-white">{edge.verdict}</p>
                  <Metric label="Sample" value={`${kpi.totalTests} tests`} />
                  <Metric label="Win Rate" value={`${kpi.winRate.toFixed(1)}%`} tone={kpi.winRate >= 50 ? 'pos' : 'neg'} />
                  <Metric label="Net R" value={`${metrics.netR}R`} tone={metrics.netR >= 0 ? 'pos' : 'neg'} />
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid min-w-0 grid-cols-1 lg:[grid-template-columns:minmax(0,58fr)_minmax(0,42fr)] gap-2">
            <Panel title="Validation Progress" hint="Gates required before promotion">
              <div className="space-y-1.5 pt-0.5">
                {checks.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 truncate text-[#A3A3A3]">
                        <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: c.done ? GREEN : '#404040' }} />
                        {c.label}
                      </span>
                      <span className="tabular-nums font-semibold" style={{ color: c.done ? GREEN : AMBER }}>{c.target}</span>
                    </div>
                    <div className="h-[5px] w-full rounded-full bg-[#171717] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.progress}%`, background: c.done ? GREEN : AMBER }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Next Steps" hint="Highest-impact actions">
              <ol className="space-y-1.5 pt-0.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[1px] h-4 w-4 shrink-0 rounded-[4px] flex items-center justify-center text-[9.5px] font-bold" style={{ background: `${PURPLE}1F`, color: '#C4B5FD' }}>{i + 1}</span>
                    <span className="text-[11px] leading-snug text-[#A3A3A3]">{s}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </>
      )}

      {/* ---------- Pairs + Tests table ---------- */}
      {showTests && (
        <>
          <Panel title="Tracked Pairs" hint={`${strategy.pairs.length} instruments`}>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {strategy.pairs.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-[6px] border border-[#262626] bg-[#0A0A0A] px-2 py-[3px] text-[11px] text-[#D4D4D4]">
                  {p}
                  <button onClick={() => removePair(p)} className="text-[#525252] hover:text-[#EF4444]"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {!strategy.pairs.length && <p className="text-[11px] text-[#737373]">No pairs yet.</p>}
              <div className="flex gap-1.5 ml-1">
                <Input
                  value={newPair}
                  onChange={(e) => setNewPair(e.target.value)}
                  placeholder="Add pair"
                  onKeyDown={(e) => e.key === 'Enter' && addPair()}
                  className="h-7 w-[110px] rounded-[6px] border-[#262626] bg-[#0A0A0A] text-[11px]"
                />
                <Button size="sm" className="h-7 w-7 rounded-[6px] p-0" onClick={addPair}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Panel>

          <div className={cn(CARD, 'overflow-hidden')}>
            <div className="flex items-center justify-between border-b border-[#262626] px-3 py-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[#D4D4D4]">Tests ({tests.length})</h3>
                <p className="text-[10px] text-[#737373]">Click a row to open the full test record</p>
              </div>
              <Button size="sm" className="h-7 rounded-[7px] px-2.5 text-[11px]" onClick={onNewTest}><Plus className="h-3.5 w-3.5 mr-1" /> New Test</Button>
            </div>
            {!tests.length ? (
              <p className="py-8 text-center text-[11.5px] text-[#737373]">No tests in this range. Create a test to start validating.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[11.5px]">
                  <thead>
                    <tr className="border-b border-[#262626] text-[10px] uppercase tracking-[0.08em] text-[#737373]">
                      <Th className="pl-3">Date</Th><Th>Pair</Th><Th>Session</Th><Th>Condition</Th>
                      <Th>Bias</Th><Th>Result</Th><Th className="text-right">RR</Th><Th>Grade</Th><Th>Emotion</Th><Th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {tests.slice().sort((a, b) => b.date.localeCompare(a.date)).map((t) => {
                      const r = parseFloat(t.rAchieved);
                      const win = t.result === 'Win';
                      const loss = t.result === 'Loss';
                      return (
                        <tr
                          key={t.id}
                          onClick={() => navigate(`/research-lab/${strategy.id}/test/${t.id}`)}
                          className="border-b border-[#171717] cursor-pointer transition-colors hover:bg-white/[0.03]"
                        >
                          <Td className="pl-3 text-[#8A8A8A] tabular-nums">{t.date}</Td>
                          <Td className="font-medium text-white">{t.pair || '—'}</Td>
                          <Td className="text-[#A3A3A3]">{t.session || '—'}</Td>
                          <Td className="text-[#A3A3A3]">{t.marketCondition || '—'}</Td>
                          <Td className="text-[#A3A3A3]">
                            {t.predictedBias
                              ? <span style={{ color: t.predictedBias === t.actualBias ? GREEN : t.actualBias ? RED : '#A3A3A3' }}>{t.predictedBias}</span>
                              : '—'}
                          </Td>
                          <Td>
                            <span
                              className="rounded-[5px] px-1.5 py-[2px] text-[10px] font-semibold"
                              style={{
                                color: win ? GREEN : loss ? RED : '#A3A3A3',
                                background: `${win ? GREEN : loss ? RED : '#737373'}1A`,
                              }}
                            >
                              {t.result || 'Open'}
                            </span>
                          </Td>
                          <Td className="text-right tabular-nums font-semibold" style={{ color: Number.isNaN(r) ? '#737373' : r >= 0 ? GREEN : RED }}>
                            {Number.isNaN(r) ? '—' : `${r > 0 ? '+' : ''}${r}R`}
                          </Td>
                          <Td>
                            {t.grade
                              ? <span className="rounded-[5px] px-1.5 py-[2px] text-[10px] font-semibold" style={{ color: GRADE_COLORS[t.grade], background: `${GRADE_COLORS[t.grade]}1A` }}>{t.grade}</span>
                              : <span className="text-[#525252]">—</span>}
                          </Td>
                          <Td className="text-[#A3A3A3]">{t.emotionalState || '—'}</Td>
                          <Td className="pr-2 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTest(t.id); }}
                              className="text-[#525252] hover:text-[#EF4444]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- Coach footer ---------- */}
      <div className={cn(CARD, 'flex items-center gap-2 px-3 py-2')}>
        <span className="h-5 w-5 shrink-0 rounded-[5px] flex items-center justify-center" style={{ background: `${AMBER}1A` }}>
          <Lightbulb className="h-3 w-3" style={{ color: AMBER }} />
        </span>
        <p className="min-w-0 truncate text-[11px] text-[#A3A3A3]">
          <span className="font-semibold text-white">Coach:</span> {steps[0]}
        </p>
      </div>
    </div>
  );
}

/* ---------------- primitives ---------------- */

function ToolBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 rounded-[7px] border-[#262626] bg-[#0E0E0E] px-2.5 text-[11px] text-[#D4D4D4] hover:bg-white/[0.05]"
    >
      <Icon className="h-3.5 w-3.5 mr-1" /> {label}
    </Button>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: {
  icon: any; label: string; value: string | number; sub?: string; tone?: 'pos' | 'neg' | 'warn';
}) {
  const color = tone === 'pos' ? GREEN : tone === 'neg' ? RED : tone === 'warn' ? AMBER : '#E5E5E5';
  const str = String(value);
  const fs = str.length > 10 ? 15 : str.length > 7 ? 17 : 20;
  return (
    <div className={cn(CARD, 'min-w-0 px-2.5 py-2')}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: tone ? color : '#737373' }} />
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.07em] text-[#737373]">{label}</p>
      </div>
      <p className="truncate font-heading font-bold leading-none tabular-nums" style={{ fontSize: fs, color }}>{value}</p>
      {sub && <p className="mt-1 truncate text-[10px] text-[#525252]">{sub}</p>}
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={cn(CARD, 'min-w-0 p-3')}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[12px] font-semibold uppercase tracking-[0.09em] text-[#D4D4D4]">{title}</h3>
        {hint && <span className="shrink-0 truncate text-[10px] text-[#737373]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' | 'warn' }) {
  const color = tone === 'pos' ? GREEN : tone === 'neg' ? RED : tone === 'warn' ? AMBER : '#E5E5E5';
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="truncate text-[11px] text-[#8A8A8A]">{label}</span>
      <span className="shrink-0 text-[11.5px] font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function RateTable({ rows, accent }: { rows: { key: string; wins: number; losses: number; total: number; winRate: number }[]; accent: string }) {
  const sorted = rows.slice().sort((a, b) => b.total - a.total || b.winRate - a.winRate);
  if (!sorted.length) return <p className="py-6 text-center text-[11px] text-[#737373]">No data in this range.</p>;
  return (
    <div className="space-y-1.5 pt-0.5">
      {sorted.map((r) => (
        <div key={r.key} className="min-w-0">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="truncate text-[#A3A3A3]">{r.key}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold" style={{ color: r.winRate >= 50 ? GREEN : RED }}>{r.winRate.toFixed(0)}%</span>
              <span className="ml-1.5 text-[10px] text-[#525252]">{r.wins}W/{r.losses}L</span>
            </span>
          </div>
          <div className="h-[5px] w-full rounded-full bg-[#171717] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.winRate)}%`, background: r.winRate >= 50 ? accent : RED }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('py-1.5 pr-2 text-left font-medium', className)}>{children}</th>;
}
function Td({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={cn('py-1.5 pr-2', className)} style={style}>{children}</td>;
}
