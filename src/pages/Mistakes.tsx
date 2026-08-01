import { useMemo, useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, LabelList,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Mistake, Session, Trade } from '@/types/trading';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar as CalendarIcon, Download, Brain, AlertOctagon, Clock, RotateCcw,
  TrendingUp, ArrowRight, Target, Lightbulb, ShieldCheck,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ALL_MISTAKES: Mistake[] = ['FOMO', 'Early Entry', 'Overtrading', 'Emotional', 'Ignored SL'];
const ALL_SESSIONS: Session[] = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];

const MISTAKE_COLOR: Record<string, string> = {
  'FOMO': 'hsl(0 84% 60%)',
  'Emotional': 'hsl(38 92% 50%)',
  'Ignored SL': 'hsl(270 70% 58%)',
  'Early Entry': 'hsl(212 95% 58%)',
  'Overtrading': 'hsl(152 60% 45%)',
};
const fallbackColor = (i: number) =>
  ['hsl(0 84% 60%)', 'hsl(38 92% 50%)', 'hsl(270 70% 58%)', 'hsl(212 95% 58%)', 'hsl(152 60% 45%)'][i % 5];

const SEVERITY: Record<string, { level: string; cls: string }> = {
  'FOMO': { level: 'Critical', cls: 'text-destructive border-destructive/40 bg-destructive/10' },
  'Ignored SL': { level: 'Critical', cls: 'text-destructive border-destructive/40 bg-destructive/10' },
  'Early Entry': { level: 'Medium', cls: 'text-warning border-warning/40 bg-warning/10' },
  'Emotional': { level: 'High', cls: 'text-warning border-warning/40 bg-warning/10' },
  'Overtrading': { level: 'Low', cls: 'text-success border-success/40 bg-success/10' },
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtDay = (d?: Date) =>
  d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

/* ------------------------------------------------------------------ */
/* Small presentational primitives                                     */
/* ------------------------------------------------------------------ */

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      'flex h-full flex-col rounded-2xl border border-border/50 bg-[linear-gradient(180deg,hsl(var(--foreground)/0.025),transparent_38%)] bg-card/70 backdrop-blur-[3px]',
      'shadow-[0_1px_0_0_hsl(var(--foreground)/0.05)_inset,0_28px_60px_-40px_hsl(0_0%_0%/0.95)]',
      className,
    )}>{children}</div>
  );
}

function PanelTitle({ title, tooltip, right }: { title: string; tooltip?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <h3 className="font-heading text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 truncate">
          {title}
        </h3>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {right}
    </div>
  );
}

function KpiCard({
  label, value, valueClass, delta, deltaTone, sub, subClass, accent,
}: {
  label: string; value: string; valueClass?: string;
  delta?: string; deltaTone?: 'up' | 'down' | 'flat';
  sub?: string; subClass?: string; accent?: string;
}) {
  const tone = accent ?? 'hsl(var(--primary))';
  return (
    <div
      className="group relative flex h-full min-h-[124px] flex-col overflow-hidden rounded-2xl border border-border/45 bg-card/70 px-4 py-4 animate-fade-in
                 shadow-[0_1px_0_0_hsl(var(--foreground)/0.05)_inset,0_30px_60px_-42px_hsl(0_0%_0%/0.95)]
                 transition-[transform,box-shadow,border-color] duration-300
                 hover:-translate-y-[2px] hover:border-border/70 hover:shadow-[0_1px_0_0_hsl(var(--foreground)/0.07)_inset,0_36px_70px_-40px_hsl(0_0%_0%/1)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] transition-opacity duration-300 group-hover:opacity-[0.16]"
        style={{ background: `linear-gradient(155deg, ${tone}, transparent 55%)` }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }}
      />
      <div className="relative flex h-full flex-col"></div>
      <p className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 truncate">{label}</p>
      <p className={cn('font-heading font-bold tracking-[-0.02em] mt-2.5 text-[26px] leading-none truncate', valueClass)}>
        {value}
      </p>
      <div className="mt-auto pt-3 space-y-1">
        {delta && (
          <p className={cn(
            'text-[10.5px] font-semibold tabular-nums truncate',
            deltaTone === 'up' && 'text-success',
            deltaTone === 'down' && 'text-destructive',
            (!deltaTone || deltaTone === 'flat') && 'text-muted-foreground',
          )}>
            {deltaTone === 'up' ? '↑' : deltaTone === 'down' ? '↓' : '·'} {delta}
          </p>
        )}
        {sub && <p className={cn('text-[10px] leading-snug text-muted-foreground/75 truncate', subClass)}>{sub}</p>}
      </div>
    </div>
  );
}

function InsightItem({ icon: Icon, tone, children }: { icon: any; tone: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border"
        style={{ borderColor: `${tone}55`, background: `${tone}18`, color: tone }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] leading-snug text-foreground/90">{children}</p>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const size = 108, stroke = 9, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(0 84% 60%)" />
            <stop offset="55%" stopColor="hsl(38 92% 50%)" />
            <stop offset="100%" stopColor="hsl(152 60% 45%)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.35} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-heading text-2xl font-bold leading-none">{score}</span>
        <span className="absolute bottom-6 text-[9px] uppercase tracking-wider text-muted-foreground">Impact Score</span>
      </div>
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const size = 22, stroke = 3, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const color = pct >= 50 ? 'hsl(var(--success))' : pct >= 25 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))';
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct / 100))} />
    </svg>
  );
}

const Tip = ({ active, payload, label, money }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono tabular-nums" style={{ color: p.color || p.payload?.fill }}>
          {p.name}: {money ? formatCurrency(Number(p.value)) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Mistakes() {
  const { trades } = useTrading();

  const allValid = useMemo(
    () => trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled'),
    [trades],
  );

  // ---- Date range (defaults to the full span of available trades) ----
  const bounds = useMemo(() => {
    const dates = allValid.map(t => t.date).filter(Boolean).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [allValid]);

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const from = range?.from ? toISO(range.from) : bounds.min;
  const to = range?.to ? toISO(range.to) : bounds.max;

  const inRange = (t: Trade) => (!from || t.date >= from) && (!to || t.date <= to);
  const valid = useMemo(() => allValid.filter(inRange), [allValid, from, to]);

  // Previous comparable window
  const prev = useMemo(() => {
    if (!from || !to) return [] as Trade[];
    const f = new Date(from).getTime(), t2 = new Date(to).getTime();
    const span = Math.max(t2 - f, 86400_000);
    const pf = toISO(new Date(f - span - 86400_000));
    const pt = toISO(new Date(f - 86400_000));
    return allValid.filter(t => t.date >= pf && t.date <= pt);
  }, [allValid, from, to]);

  /* ---------------- Core analytics (unchanged math) ---------------- */

  const buildMistakeData = (rows: Trade[]) =>
    ALL_MISTAKES.map(m => {
      const mt = rows.filter(t => t.mistakes.includes(m));
      const totalLoss = mt.filter(t => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0);
      const avgLoss = mt.length > 0 ? totalLoss / mt.length : 0;
      return { name: m as string, frequency: mt.length, totalLoss, avgLoss };
    }).sort((a, b) => a.totalLoss - b.totalLoss);

  const mistakeData = useMemo(() => buildMistakeData(valid), [valid]);
  const prevData = useMemo(() => buildMistakeData(prev), [prev]);

  const totalMistakes = mistakeData.reduce((s, m) => s + m.frequency, 0);
  const prevTotalMistakes = prevData.reduce((s, m) => s + m.frequency, 0);
  const totalMistakeLoss = mistakeData.reduce((s, m) => s + m.totalLoss, 0);
  const prevMistakeLoss = prevData.reduce((s, m) => s + m.totalLoss, 0);
  const tradesWithMistakes = valid.filter(t => t.mistakes.length > 0);
  const prevWithMistakes = prev.filter(t => t.mistakes.length > 0);
  const distribution = mistakeData.filter(m => m.frequency > 0).map(m => ({ name: m.name, value: m.frequency }));

  const normalLosses = valid.filter(t => t.profitLoss < 0 && t.mistakes.length === 0);
  const mistakeLosses = valid.filter(t => t.profitLoss < 0 && t.mistakes.length > 0);
  const avgNormalLoss = normalLosses.length > 0 ? normalLosses.reduce((s, t) => s + t.profitLoss, 0) / normalLosses.length : 0;
  const avgMistakeLoss = mistakeLosses.length > 0 ? mistakeLosses.reduce((s, t) => s + t.profitLoss, 0) / mistakeLosses.length : 0;

  const calcRecovery = (rows: Trade[]) => {
    let recoveries = 0, attempts = 0;
    const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].mistakes.length > 0) {
        attempts++;
        if (sorted[i + 1].result === 'Win') recoveries++;
      }
    }
    return attempts > 0 ? Math.round((recoveries / attempts) * 100) : 0;
  };
  const recoveryRate = useMemo(() => calcRecovery(valid), [valid]);
  const prevRecoveryRate = useMemo(() => calcRecovery(prev), [prev]);

  const mistakeBySession = useMemo(
    () => ALL_SESSIONS
      .map(s => ({ name: s as string, count: valid.filter(t => t.session === s && t.mistakes.length > 0).length }))
      .filter(s => s.count > 0),
    [valid],
  );

  const mistakeBySetup = useMemo(() => {
    const setupMap = new Map<string, number>();
    valid.filter(t => t.mistakes.length > 0).forEach(t => {
      setupMap.set(t.setup, (setupMap.get(t.setup) || 0) + t.mistakes.length);
    });
    return Array.from(setupMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [valid]);

  const trendData = useMemo(() => {
    const weeks = new Map<string, { count: number; loss: number }>();
    valid.forEach(t => {
      if (t.mistakes.length === 0) return;
      const d = new Date(t.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const cur = weeks.get(key) || { count: 0, loss: 0 };
      cur.count += t.mistakes.length;
      if (t.profitLoss < 0) cur.loss += t.profitLoss;
      weeks.set(key, cur);
    });
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, v]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: v.count,
        loss: Math.round(v.loss * 100) / 100,
      }));
  }, [valid]);

  const impactScore = useMemo(() => {
    if (valid.length === 0) return 0;
    const totalLoss = valid.filter(t => t.profitLoss < 0).reduce((s, t) => s + Math.abs(t.profitLoss), 0);
    if (totalLoss === 0) return 0;
    return Math.min(100, Math.round((Math.abs(totalMistakeLoss) / totalLoss) * 100));
  }, [valid, totalMistakeLoss]);

  const topMistake = mistakeData.find(m => m.frequency > 0);
  const topMistakePct = topMistake && totalMistakeLoss !== 0
    ? Math.round((topMistake.totalLoss / totalMistakeLoss) * 100) : 0;
  const worstSession = mistakeBySession.length
    ? mistakeBySession.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  const topSetup = mistakeBySetup[0];
  const setupSharePct = topSetup && totalMistakes
    ? Math.round((topSetup.count / totalMistakes) * 100) : 0;
  const repeatDelta = prevTotalMistakes > 0
    ? Math.round(((prevTotalMistakes - totalMistakes) / prevTotalMistakes) * 100) : 0;

  const pctDelta = (cur: number, before: number) =>
    before === 0 ? null : Math.round(((cur - before) / Math.abs(before)) * 100);

  const mistakesDelta = totalMistakes - prevTotalMistakes;
  const lossDeltaPct = pctDelta(Math.abs(totalMistakeLoss), Math.abs(prevMistakeLoss));
  const rateNow = valid.length ? Math.round((tradesWithMistakes.length / valid.length) * 100) : 0;
  const ratePrev = prev.length ? Math.round((prevWithMistakes.length / prev.length) * 100) : 0;

  /* ---------------- Table state ---------------- */
  const [typeFilter, setTypeFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'impact' | 'frequency' | 'loss'>('impact');

  const tableRows = useMemo(() => {
    const scoped = sessionFilter === 'all' ? valid : valid.filter(t => t.session === sessionFilter);
    const rows = buildMistakeData(scoped)
      .filter(m => typeFilter === 'all' || m.name === typeFilter)
      .map(m => {
        const impactPct = totalMistakeLoss !== 0 ? Math.round((m.totalLoss / totalMistakeLoss) * 100) : 0;
        const rows2 = scoped.filter(t => t.mistakes.includes(m.name as Mistake));
        const wins = rows2.filter(t => t.result === 'Win').length;
        const recovery = rows2.length ? Math.round((wins / rows2.length) * 100) : 0;
        return { ...m, impactPct, recovery };
      });
    if (sortBy === 'frequency') rows.sort((a, b) => b.frequency - a.frequency);
    else if (sortBy === 'loss') rows.sort((a, b) => a.totalLoss - b.totalLoss);
    else rows.sort((a, b) => b.impactPct - a.impactPct);
    return rows;
  }, [valid, typeFilter, sessionFilter, sortBy, totalMistakeLoss]);

  const handleExport = () => {
    const header = ['Mistake', 'Frequency', 'Total Loss', 'Avg Loss', 'Impact %', 'Severity', 'Recovery %'];
    const lines = tableRows.map(r => [
      r.name, r.frequency, r.totalLoss.toFixed(2), r.avgLoss.toFixed(2),
      r.impactPct, SEVERITY[r.name]?.level ?? '-', r.recovery,
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mistakes-analytics-${from ?? 'all'}_${to ?? 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = range?.from
    ? `${fmtDay(range.from)}${range.to ? ` – ${fmtDay(range.to)}` : ''}`
    : 'All time';

  const lossByType = mistakeData
    .map(m => ({ name: m.name, loss: Math.abs(Math.round(m.totalLoss * 100) / 100) }))
    .sort((a, b) => b.loss - a.loss);

  return (
    <div className="p-4 sm:p-6 w-full space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <PageHeader title="Mistakes Analytics" subtitle="Advanced behavioral analytics & mistake intelligence">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg text-[11px] font-medium">
              <span className="tabular-nums">{rangeLabel}</span>
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} className="pointer-events-auto" />
            <div className="flex justify-end border-t border-border p-2">
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setRange(undefined)}>
                Reset to all time
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-[11px] font-medium" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </PageHeader>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total Mistakes" value={String(totalMistakes)} valueClass="text-destructive"
          accent="hsl(0 84% 60%)"
          delta={prevTotalMistakes ? `${mistakesDelta > 0 ? '+' : ''}${mistakesDelta} vs last period` : undefined}
          deltaTone={mistakesDelta > 0 ? 'down' : mistakesDelta < 0 ? 'up' : 'flat'}
        />
        <KpiCard
          label="Loss from Mistakes" value={formatCurrency(totalMistakeLoss)} valueClass="text-destructive"
          accent="hsl(0 84% 60%)"
          delta={lossDeltaPct !== null ? `${lossDeltaPct > 0 ? '+' : ''}${lossDeltaPct}% vs last period` : undefined}
          deltaTone={lossDeltaPct !== null && lossDeltaPct > 0 ? 'down' : 'up'}
        />
        <KpiCard
          label="Trades w/ Mistakes" value={`${tradesWithMistakes.length} / ${valid.length}`}
          accent="hsl(38 92% 50%)"
          sub={`${rateNow}% of executed trades`}
          delta={prev.length ? `${rateNow - ratePrev > 0 ? '+' : ''}${rateNow - ratePrev}% vs last period` : undefined}
          deltaTone={rateNow > ratePrev ? 'down' : rateNow < ratePrev ? 'up' : 'flat'}
        />
        <KpiCard
          label="Impact Score" value={`${impactScore}/100`}
          valueClass={impactScore >= 60 ? 'text-destructive' : impactScore >= 30 ? 'text-warning' : 'text-success'}
          accent="hsl(152 60% 45%)"
          sub={impactScore >= 60 ? 'Severe — mistakes drive most losses' : impactScore >= 30 ? 'Moderate impact' : 'Excellent control'}
        />
        <KpiCard
          label="Recovery Rate" value={`${recoveryRate}%`}
          valueClass={recoveryRate >= 50 ? 'text-success' : 'text-warning'}
          accent="hsl(38 92% 50%)"
          delta={prevRecoveryRate ? `${recoveryRate - prevRecoveryRate > 0 ? '+' : ''}${recoveryRate - prevRecoveryRate}% vs last period` : undefined}
          deltaTone={recoveryRate >= prevRecoveryRate ? 'up' : 'down'}
          sub="Win on the next trade"
        />
        <KpiCard
          label="Most Common" value={topMistake?.name ?? '—'} valueClass="text-destructive"
          accent="hsl(270 70% 58%)"
          sub={topMistake ? `${topMistakePct}% of mistake losses` : 'No mistakes logged'}
        />
      </div>

      {/* ── Smart insights ─────────────────────────────────────── */}
      <Panel className="border-success/25 bg-[linear-gradient(90deg,hsl(var(--success)/0.07),transparent_45%)]">
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] items-center gap-3 p-3.5">
          <div className="flex items-center gap-2.5 lg:border-r lg:border-border/60 lg:pr-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
              <Brain className="h-4.5 w-4.5" />
            </span>
            <span className="font-heading text-[11px] font-semibold uppercase leading-tight tracking-[0.14em] text-success">
              Smart<br />Insights
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <InsightItem icon={AlertOctagon} tone="hsl(0 84% 60%)">
              {topMistake
                ? <><span className="font-semibold text-destructive">{topMistake.name}</span> causes {topMistakePct}% of your mistake losses</>
                : 'No mistake losses recorded in this period'}
            </InsightItem>
            <InsightItem icon={Clock} tone="hsl(38 92% 50%)">
              {worstSession
                ? <>Most mistakes happen in <span className="font-semibold text-warning">{worstSession.name}</span></>
                : 'No session concentration detected'}
            </InsightItem>
            <InsightItem icon={RotateCcw} tone="hsl(152 60% 45%)">
              Recovery rate after mistakes: <span className="font-semibold text-success">{recoveryRate}%</span>
            </InsightItem>
            <InsightItem icon={TrendingUp} tone="hsl(212 95% 58%)">
              {repeatDelta > 0
                ? <>You are <span className="font-semibold text-success">{repeatDelta}% better</span> at avoiding repeat mistakes</>
                : repeatDelta < 0
                  ? <>Repeat mistakes are up <span className="font-semibold text-destructive">{Math.abs(repeatDelta)}%</span> vs last period</>
                  : <>Avg mistake loss {formatCurrency(avgMistakeLoss)} vs normal {formatCurrency(avgNormalLoss)}</>}
            </InsightItem>
          </div>
        </div>
      </Panel>

      {/* ── Row 1: donut / loss bar / session bar ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <PanelTitle title="Mistakes by Type" tooltip="Share of each mistake type across the selected period" />
          <div className="px-4 pb-3">
            {distribution.length > 0 ? (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                <div className="relative h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={0} animationDuration={700}>
                        {distribution.map((d, i) => (
                          <Cell key={d.name} fill={MISTAKE_COLOR[d.name] ?? fallbackColor(i)} />
                        ))}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="font-heading text-2xl font-bold leading-none">{totalMistakes}</span>
                    <span className="absolute mt-7 text-[9px] uppercase tracking-widest text-muted-foreground">Total</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {mistakeData.slice().sort((a, b) => b.frequency - a.frequency).map((m, i) => (
                    <li key={m.name} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: MISTAKE_COLOR[m.name] ?? fallbackColor(i) }} />
                      <span className="truncate text-foreground/90">{m.name}</span>
                      <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                        {m.frequency} ({totalMistakes ? Math.round((m.frequency / totalMistakes) * 100) : 0}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="grid h-[190px] place-items-center text-sm text-muted-foreground">No mistakes logged</div>
            )}
          </div>
          {topMistake && (
            <div className="flex items-center gap-2 border-t border-border/60 bg-destructive/[0.06] px-4 py-2.5">
              <Target className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[11px] text-destructive/90">
                <span className="font-semibold">{topMistake.name}</span> is your most expensive mistake
              </p>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelTitle title="Loss by Mistake Type" tooltip="Total realised loss attributable to each mistake"
            right={<span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Loss</span>} />
          <div className="h-[236px] px-3 pb-3">
            {lossByType.some(l => l.loss > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lossByType} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }} barSize={9}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" opacity={0.25} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={82} axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.25)' }} content={<Tip money />} />
                  <Bar dataKey="loss" name="Loss" radius={[4, 4, 4, 4]} animationDuration={700}>
                    {lossByType.map((d, i) => (
                      <Cell key={d.name} fill={MISTAKE_COLOR[d.name] ?? fallbackColor(i)} fillOpacity={0.9} />
                    ))}
                    <LabelList dataKey="loss" position="right" offset={8}
                      formatter={(v: number) => (v ? `-${formatCurrency(v)}` : formatCurrency(0))}
                      style={{ fill: 'hsl(var(--destructive))', fontSize: 10, fontFamily: 'monospace' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No losses from mistakes</div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Mistakes by Session" tooltip="Which trading session produces the most mistakes" />
          <div className="h-[200px] px-3">
            {mistakeBySession.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakeBySession} margin={{ top: 18, right: 8, left: -14, bottom: 4 }} barSize={34}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.25)' }} content={<Tip />} />
                  <Bar dataKey="count" name="Mistakes" fill="hsl(38 92% 50%)" fillOpacity={0.9} radius={[4, 4, 0, 0]} animationDuration={700}>
                    <LabelList dataKey="count" position="top" style={{ fill: 'hsl(38 92% 55%)', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No data</div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              {worstSession
                ? <>Most mistakes during <span className="font-semibold text-destructive">{worstSession.name}</span></>
                : 'No session data available'}
            </p>
          </div>
        </Panel>
      </div>

      {/* ── Row 2: trend + setup ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
        <Panel>
          <PanelTitle title="Mistakes Trend (Weekly)" tooltip="Weekly mistake count and the loss attached to those weeks" />
          <div className="h-[236px] px-3 pb-3">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 18, right: 14, left: -14, bottom: 4 }}>
                  <defs>
                    <linearGradient id="trendGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" />
                      <stop offset="100%" stopColor="hsl(0 84% 60%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" opacity={0.25} />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.35 }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
                          <p className="mb-1 text-muted-foreground">Week of {label}</p>
                          <p className="font-mono text-warning">Mistakes: {d.count}</p>
                          <p className="font-mono text-destructive">Loss: {formatCurrency(d.loss)}</p>
                        </div>
                      );
                    }} />
                  <Line type="monotone" dataKey="count" name="Mistakes" stroke="url(#trendGlow)" strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(38 92% 50%)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(0 84% 60%)' }} animationDuration={800}>
                    <LabelList dataKey="count" position="top" offset={10}
                      style={{ fill: 'hsl(38 92% 58%)', fontSize: 10 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No trend data</div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Mistakes by Setup / Strategy" tooltip="Which setups your mistakes cluster around" />
          <div className="h-[200px] px-3">
            {mistakeBySetup.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakeBySetup.slice(0, 6)} layout="vertical" margin={{ top: 6, right: 34, left: 4, bottom: 4 }} barSize={16}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" opacity={0.25} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={92} axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.25)' }} content={<Tip />} />
                  <Bar dataKey="count" name="Mistakes" fill="hsl(152 60% 45%)" fillOpacity={0.85} radius={[0, 4, 4, 0]} animationDuration={700}>
                    <LabelList dataKey="count" position="right" offset={8} style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No data</div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <p className="text-[11px] text-muted-foreground">
              {topSetup
                ? <><span className="font-semibold text-foreground">{topSetup.name}</span> setups lead to <span className="font-semibold text-success">{setupSharePct}%</span> of your mistakes</>
                : 'No setup concentration detected'}
            </p>
          </div>
        </Panel>
      </div>

      {/* ── Bottom: breakdown table + summary ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <Panel className="overflow-hidden">
          <PanelTitle
            title="Mistakes Breakdown"
            tooltip="Full detail per mistake type with impact, severity and recovery"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 w-[112px] text-[11px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ALL_MISTAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue placeholder="All Sessions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {ALL_SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-7 w-[140px] text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impact">Sort: Impact</SelectItem>
                    <SelectItem value="frequency">Sort: Frequency</SelectItem>
                    <SelectItem value="loss">Sort: Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border/60 text-left">
                  {['Mistake Type', 'Frequency', 'Total Loss', 'Avg Loss', 'Impact', 'Severity', 'Recovery Rate', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((m, i) => {
                  const sev = SEVERITY[m.name];
                  const color = MISTAKE_COLOR[m.name] ?? fallbackColor(i);
                  return (
                    <tr key={m.name} className="border-b border-border/40 transition-colors hover:bg-accent/40">
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color }}>{m.name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums">{m.frequency}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-destructive">{formatCurrency(m.totalLoss)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-destructive">{formatCurrency(m.avgLoss)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.abs(m.impactPct))}%`, background: color }} />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{Math.abs(m.impactPct)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', sev?.cls)}>
                          {sev?.level ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MiniRing pct={m.recovery} />
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{m.recovery}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setTypeFilter(m.name)}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10"
                        >
                          Review <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No mistakes match these filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="border-gold/30 p-4">
          <h3 className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Overall Summary</h3>
          <div className="my-4"><ScoreGauge score={impactScore} /></div>
          <dl className="space-y-2 text-[11px]">
            {[
              ['Total Mistakes', String(totalMistakes), ''],
              ['Total Loss', formatCurrency(totalMistakeLoss), 'text-destructive'],
              ['Avg Mistake Loss', formatCurrency(avgMistakeLoss), 'text-destructive'],
              ['Best Improvement', repeatDelta > 0 ? `↑ Fewer repeats (${repeatDelta}%)` : repeatDelta < 0 ? `↓ More repeats (${Math.abs(repeatDelta)}%)` : '—', repeatDelta > 0 ? 'text-success' : repeatDelta < 0 ? 'text-destructive' : ''],
              ['Focus Area', topMistake ? `${topMistake.name} control` : '—', 'text-gold'],
            ].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={cn('font-mono tabular-nums text-right', c as string)}>{v}</dd>
              </div>
            ))}
          </dl>
          <Button
            className="mt-4 h-9 w-full gap-1.5 rounded-lg border border-gold/50 bg-gold/10 text-[11px] font-semibold uppercase tracking-wider text-gold hover:bg-gold/20"
            variant="ghost"
            onClick={() => document.querySelector<HTMLButtonElement>('button[title="Open AI Coach"]')?.click()}
          >
            View AI Action Plan <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Panel>
      </div>

      {/* ── Coach tip ──────────────────────────────────────────── */}
      <Panel className="border-gold/25 bg-[linear-gradient(90deg,hsl(var(--gold)/0.07),transparent_40%)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
            <Lightbulb className="h-4 w-4" />
          </span>
          <p className="text-[11px] leading-snug">
            <span className="font-heading font-semibold uppercase tracking-[0.14em] text-gold">Coach Tip</span>
            <span className="mx-2 text-border">|</span>
            <span className="text-foreground/85">
              {topMistake
                ? <>Focus on <span className="font-semibold text-foreground">{topMistake.name}</span> control and wait for confirmation before entries.
                  {worstSession && <> Review your <span className="font-semibold text-foreground">{worstSession.name}</span> trades carefully.</>}
                  {' '}Cutting it in half would recover roughly {formatCurrency(Math.abs(topMistake.totalLoss) / 2)}.</>
                : 'No mistakes logged in this period — keep protecting your process and journal every deviation.'}
            </span>
          </p>
        </div>
      </Panel>
    </div>
  );
}
