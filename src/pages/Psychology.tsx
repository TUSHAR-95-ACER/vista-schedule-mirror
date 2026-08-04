import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '@/contexts/TradingContext';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, PieChart, Pie, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { generateInsights } from '@/lib/insightEngine';
import { adaptPsychology } from '@/lib/aiInsightAdapters';
import {
  Brain, Target, Eye, HeartPulse, AlertTriangle, Smile, Download, CalendarRange,
  Lightbulb, ArrowRight, TrendingUp, TrendingDown, Activity, Sparkles, ShieldCheck,
} from 'lucide-react';

/* ── tokens ─────────────────────────────────────────────────────────── */
const C = {
  green: '#22C55E',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  orange: '#F59E0B',
  red: '#EF4444',
  emerald: '#10B981',
  yellow: '#FACC15',
  muted: '#8A8F98',
};

const cardBase =
  'rounded-[18px] border border-white/[0.055] bg-[#050505] p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.09] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_50px_-40px_rgba(0,0,0,0.9)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_26px_60px_-34px_rgba(0,0,0,0.95)]';

/* ── small building blocks ──────────────────────────────────────────── */
function Ring({ value, color, size = 62, stroke = 7 }: { value: number; color: string; size?: number; stroke?: number }) {
  const r = size / 2 - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color}55)` }}
      />
      <text
        x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        className="font-mono" fill={color} fontSize={size * 0.26} fontWeight={700}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function KpiCard({
  label, value, status, change, ringValue, color, icon: Icon, tooltip,
}: {
  label: string; value: string; status: string; change: string; ringValue: number;
  color: string; icon: any; tooltip: string;
}) {
  return (
    <div className={cn(cardBase, 'min-h-[178px]')}>
      <div className="flex h-full items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${color}1A`, color }}>
              <span
                className="pointer-events-none absolute -inset-2 rounded-full blur-[10px]"
                style={{ background: `radial-gradient(circle, ${color}55 0%, transparent 70%)` }}
                aria-hidden
              />
              <Icon className="relative h-4 w-4" />
            </span>
            <span className="truncate text-[11.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>
              {label}
            </span>
            <InfoTooltip text={tooltip} />
          </div>
          <p className="mt-5 font-mono text-[46px] leading-none font-extrabold tracking-tight text-white break-words">
            {value}
          </p>
          <p className="mt-3.5 text-[13.5px] font-semibold" style={{ color }}>{status}</p>
          <p className="mt-2 text-[11.5px]" style={{ color: C.muted }}>{change}</p>
        </div>
        <Ring value={ringValue} color={color} />
      </div>
    </div>
  );
}


function SectionCard({
  title, subtitle, tooltip, children, className, action,
}: { title: string; subtitle?: string; tooltip?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn(cardBase, 'flex flex-col', className)}>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-[21px] font-semibold leading-tight tracking-[-0.01em] text-white">{title}</h2>
            {tooltip && <InfoTooltip text={tooltip} />}
          </div>
          {subtitle && <p className="mt-1.5 text-[11.5px] tracking-wide" style={{ color: C.muted }}>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[14px] border border-white/[0.09] bg-[#08080A]/95 px-4 py-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md">
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.muted }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 font-mono text-[14px] font-semibold" style={{ color: p.color || p.fill }}>
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/70">{p.name}</span>
          {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};


/* ── page ───────────────────────────────────────────────────────────── */
export default function Psychology() {
  const { trades } = useTrading();
  const [range, setRange] = useState<'30' | '90' | 'all'>('all');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');

  const valid = useMemo(
    () => trades.filter(t => t.psychology && t.result !== 'Untriggered Setup' && t.result !== 'Cancelled'),
    [trades],
  );

  const scoped = useMemo(() => {
    if (range === 'all') return valid;
    const days = range === '30' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return valid.filter(t => new Date(t.date).getTime() >= cutoff);
  }, [valid, range]);

  /* ---- calculations (unchanged logic) ---- */
  const emotionData = useMemo(() => {
    const map = new Map<string, { pl: number; count: number; wins: number }>();
    scoped.forEach(t => {
      const em = t.psychology!.emotion;
      const m = map.get(em) || { pl: 0, count: 0, wins: 0 };
      m.pl += t.profitLoss;
      m.count++;
      if (t.result === 'Win') m.wins++;
      map.set(em, m);
    });
    return Array.from(map.entries()).map(([name, d]) => ({
      name, pl: Math.round(d.pl * 100) / 100, count: d.count,
      winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    }));
  }, [scoped]);

  const trendData = useMemo(() => {
    const sorted = [...scoped].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((t, i) => ({
      index: i + 1,
      date: t.date,
      discipline: t.psychology!.discipline,
      focus: t.psychology!.focus,
      pl: t.profitLoss,
    }));
  }, [scoped]);

  const checklistData = useMemo(() => {
    if (scoped.length === 0) return [];
    const keys = ['followPlan', 'riskRespected', 'waitedConfirmation', 'noRevenge', 'noFomo'];
    const labels: Record<string, string> = {
      followPlan: 'Follow Plan',
      riskRespected: 'Risk Respected',
      waitedConfirmation: 'Confirmation',
      noRevenge: 'No Revenge',
      noFomo: 'No FOMO',
    };
    return keys.map(key => {
      const trueCount = scoped.filter(t => t.psychology!.checklist[key as keyof typeof t.psychology.checklist]).length;
      return { subject: labels[key], value: Math.round((trueCount / scoped.length) * 100) };
    });
  }, [scoped]);

  const mistakeData = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach(t => { t.mistakes.forEach(m => map.set(m, (map.get(m) || 0) + 1)); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [scoped]);

  const stats = useMemo(() => {
    if (scoped.length === 0) return null;
    const avgDiscipline = scoped.reduce((s, t) => s + t.psychology!.discipline, 0) / scoped.length;
    const avgFocus = scoped.reduce((s, t) => s + t.psychology!.focus, 0) / scoped.length;
    const highDisciplineTrades = scoped.filter(t => t.psychology!.discipline >= 4);
    const highDiscWinRate = highDisciplineTrades.length > 0
      ? Math.round((highDisciplineTrades.filter(t => t.result === 'Win').length / highDisciplineTrades.length) * 100) : 0;
    const lowDisciplineTrades = scoped.filter(t => t.psychology!.discipline <= 2);
    const lowDiscWinRate = lowDisciplineTrades.length > 0
      ? Math.round((lowDisciplineTrades.filter(t => t.result === 'Win').length / lowDisciplineTrades.length) * 100) : 0;
    const topEmotion = [...emotionData].sort((a, b) => b.winRate - a.winRate)[0];

    // stability = 100 - normalised spread of discipline scores
    const mean = avgDiscipline;
    const variance = scoped.reduce((s, t) => s + Math.pow(t.psychology!.discipline - mean, 2), 0) / scoped.length;
    const stability = Math.max(0, Math.round(100 - (Math.sqrt(variance) / 2) * 100));
    const mistakesPerTrade = scoped.reduce((s, t) => s + t.mistakes.length, 0) / scoped.length;
    const psychScore = Math.max(0, Math.min(100, Math.round(
      (avgDiscipline / 5) * 40 + (avgFocus / 5) * 30 + (stability / 100) * 20 - mistakesPerTrade * 10 + 10,
    )));

    return {
      avgDiscipline: avgDiscipline.toFixed(1),
      avgFocus: avgFocus.toFixed(1),
      disciplinePct: Math.round((avgDiscipline / 5) * 100),
      focusPct: Math.round((avgFocus / 5) * 100),
      highDiscWinRate,
      lowDiscWinRate,
      totalMistakes: scoped.reduce((s, t) => s + t.mistakes.length, 0),
      mistakesPerTrade,
      stability,
      psychScore,
      topEmotion: topEmotion?.name ?? '—',
      topEmotionWinRate: topEmotion?.winRate ?? 0,
    };
  }, [scoped, emotionData]);

  /* period-over-period deltas (previous equal window) */
  const deltas = useMemo(() => {
    const half = Math.floor(scoped.length / 2);
    if (half < 2) return { disc: null as number | null, focus: null as number | null, score: null as number | null };
    const sorted = [...scoped].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prev = sorted.slice(0, half), cur = sorted.slice(half);
    const avg = (arr: typeof sorted, k: 'discipline' | 'focus') =>
      arr.reduce((s, t) => s + t.psychology![k], 0) / arr.length;
    return {
      disc: avg(cur, 'discipline') - avg(prev, 'discipline'),
      focus: avg(cur, 'focus') - avg(prev, 'focus'),
      score: ((avg(cur, 'discipline') + avg(cur, 'focus')) - (avg(prev, 'discipline') + avg(prev, 'focus'))) * 10,
    };
  }, [scoped]);

  const fmtDelta = (v: number | null, suffix = '') =>
    v === null ? 'Not enough data' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}${suffix} vs previous period`;

  /* weekday heatmap */
  const heat = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = new Map<string, { pl: number; count: number; disc: number }>();
    scoped.forEach(t => {
      const d = days[new Date(t.date).getDay()];
      const m = map.get(d) || { pl: 0, count: 0, disc: 0 };
      m.pl += t.profitLoss; m.count++; m.disc += t.psychology!.discipline;
      map.set(d, m);
    });
    const rows = days.slice(1, 6).map(d => {
      const m = map.get(d);
      return { day: d, pl: m ? Math.round(m.pl * 100) / 100 : 0, count: m?.count ?? 0, disc: m && m.count ? m.disc / m.count : 0 };
    });
    const withData = rows.filter(r => r.count > 0);
    const best = withData.length ? [...withData].sort((a, b) => b.pl - a.pl)[0] : null;
    const worst = withData.length ? [...withData].sort((a, b) => a.pl - b.pl)[0] : null;
    const consistent = withData.length ? [...withData].sort((a, b) => b.disc - a.disc)[0] : null;
    return { rows, best, worst, consistent };
  }, [scoped]);

  const donutData = useMemo(
    () => emotionData.map(e => ({ name: e.name, value: Math.abs(e.pl), pl: e.pl })).filter(d => d.value > 0),
    [emotionData],
  );
  const donutColors = [C.emerald, C.blue, C.purple, C.orange, C.red, C.yellow, C.green];

  const insights = useMemo(() => generateInsights('Psychology', adaptPsychology(trades) as any), [trades]);

  const filteredEmotionRows = useMemo(
    () => (emotionFilter === 'all' ? emotionData : emotionData.filter(e => e.name === emotionFilter)),
    [emotionData, emotionFilter],
  );

  const exportCsv = () => {
    const rows = [
      ['Emotion', 'Trades', 'Win Rate %', 'Total P/L'],
      ...emotionData.map(e => [e.name, e.count, e.winRate, e.pl]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'psychology-emotions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ---- header (shared) ---- */
  const Header = (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 className="font-heading text-[32px] font-bold uppercase tracking-[0.1em] text-white sm:text-[40px] xl:text-[48px] leading-[1.05]">
          Psychology Dashboard
        </h1>
        <p className="mt-2 text-[13px] sm:text-[15px]" style={{ color: C.muted }}>
          Behavioral analysis • Emotional performance • Trading psychology insights
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HeaderActions />
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#050505] px-1.5 py-1">
          <CalendarRange className="mx-1.5 h-3.5 w-3.5" style={{ color: C.muted }} />
          {(['30', '90', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                range === r ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white',
              )}
            >
              {r === 'all' ? 'All' : `${r}D`}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#050505] px-3.5 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:border-white/20 hover:bg-white/5"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>
    </div>
  );

  if (scoped.length === 0 || !stats) {
    return (
      <div className="w-full p-6">
        {Header}
        <div className={cn(cardBase, 'py-20 text-center')} style={{ color: C.muted }}>
          No psychology data in this range. Log trades with psychology fields to see insights.
        </div>
      </div>
    );
  }

  const gaugeValue = stats.psychScore;
  const gaugeAngle = 180 - (gaugeValue / 100) * 180;

  return (
    <div className="w-full space-y-7 p-7">
      {Header}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

        <KpiCard
          label="Psychology Score" value={`${stats.psychScore}`} icon={Brain} color={C.green}
          status={stats.psychScore >= 70 ? 'Strong mindset' : stats.psychScore >= 50 ? 'Developing' : 'Needs work'}
          change={fmtDelta(deltas.score)} ringValue={stats.psychScore}
          tooltip="Composite score from discipline, focus, emotional stability and mistake rate."
        />
        <KpiCard
          label="Discipline Score" value={`${stats.avgDiscipline}/5`} icon={Target} color={C.purple}
          status={`High-discipline win rate ${stats.highDiscWinRate}%`}
          change={fmtDelta(deltas.disc)} ringValue={stats.disciplinePct}
          tooltip="Average self-rated discipline score per trade (1-5)."
        />
        <KpiCard
          label="Focus Score" value={`${stats.avgFocus}/5`} icon={Eye} color={C.blue}
          status={Number(stats.avgFocus) >= 4 ? 'Sharp execution' : 'Attention drifting'}
          change={fmtDelta(deltas.focus)} ringValue={stats.focusPct}
          tooltip="Average self-rated focus score per trade (1-5)."
        />
        <KpiCard
          label="Emotional Stability" value={`${stats.stability}%`} icon={HeartPulse} color={C.orange}
          status={stats.stability >= 75 ? 'Consistent state' : 'Variable state'}
          change={`Low-discipline win rate ${stats.lowDiscWinRate}%`} ringValue={stats.stability}
          tooltip="Consistency of discipline scores across trades — higher means less emotional swing."
        />
        <KpiCard
          label="Total Mistakes" value={`${stats.totalMistakes}`} icon={AlertTriangle} color={C.red}
          status={`${stats.mistakesPerTrade.toFixed(2)} per trade`}
          change={`${mistakeData.length} distinct mistake types`}
          ringValue={Math.min(100, stats.mistakesPerTrade * 50)}
          tooltip="Total number of trading mistakes logged in this range."
        />
        <KpiCard
          label="Best Emotion" value={stats.topEmotion} icon={Smile} color={C.emerald}
          status={`${stats.topEmotionWinRate}% win rate`}
          change={`Across ${emotionData.length} emotional states`} ringValue={stats.topEmotionWinRate}
          tooltip="The emotional state that correlates with your best trading results."
        />
      </div>

      {/* ── ANALYTICS ROW (4 cards) ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-4">
        {/* Emotional Health Gauge */}
        <SectionCard title="Emotional Health" subtitle="Composite psychology gauge" tooltip="Overall psychological health derived from discipline, focus and stability.">
          <div className="flex flex-col items-center">
            <div className="relative h-[130px] w-[240px]">
              <svg viewBox="0 0 240 130" className="h-full w-full">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={C.red} />
                    <stop offset="50%" stopColor={C.orange} />
                    <stop offset="100%" stopColor={C.green} />
                  </linearGradient>
                </defs>
                <path d="M20 120 A100 100 0 0 1 220 120" stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path
                  d="M20 120 A100 100 0 0 1 220 120" stroke="url(#gaugeGrad)" strokeWidth="14" fill="none" strokeLinecap="round"
                  strokeDasharray={Math.PI * 100} strokeDashoffset={Math.PI * 100 * (1 - gaugeValue / 100)}
                  style={{ transition: 'stroke-dashoffset 700ms ease' }}
                />
                <line
                  x1="120" y1="120"
                  x2={120 + 78 * Math.cos((gaugeAngle * Math.PI) / 180)}
                  y2={120 - 78 * Math.sin((gaugeAngle * Math.PI) / 180)}
                  stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"
                />
                <circle cx="120" cy="120" r="5" fill="#FFFFFF" />
              </svg>
              <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
                <p className="font-mono text-[40px] font-bold leading-none text-white">{gaugeValue}</p>
              </div>
            </div>
            <p className="mt-1 text-[13px] font-semibold" style={{ color: gaugeValue >= 70 ? C.green : gaugeValue >= 50 ? C.orange : C.red }}>
              {gaugeValue >= 70 ? 'Healthy' : gaugeValue >= 50 ? 'Moderate' : 'At Risk'}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: C.muted }}>{fmtDelta(deltas.score)}</p>
            <div className="mt-4 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] leading-relaxed" style={{ color: C.muted }}>
              <span className="text-white">Insight: </span>
              High-discipline trades win {stats.highDiscWinRate}% vs {stats.lowDiscWinRate}% on low-discipline trades.
            </div>
          </div>
        </SectionCard>

        {/* Emotion vs P/L */}
        <SectionCard title="Emotion vs P/L" subtitle="Profit impact by emotional state" tooltip="How your emotional state during trading impacts your profit/loss">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionData} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTip />} />
                <Bar dataKey="pl" name="P/L" radius={[8, 8, 0, 0]} animationDuration={700}>
                  {emotionData.map((e, i) => <Cell key={i} fill={e.pl >= 0 ? C.green : C.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Mistake frequency */}
        <SectionCard title="Mistake Frequency" subtitle="Occurrence rate per mistake type" tooltip="How often each type of mistake occurs in your trades">
          {mistakeData.length > 0 ? (
            <div className="space-y-4">
              {mistakeData.slice(0, 6).map((m, i) => {
                const pct = Math.round((m.count / scoped.length) * 100);
                const color = [C.red, C.orange, C.yellow, C.purple, C.blue, C.emerald][i % 6];
                return (
                  <div key={m.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-white">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="truncate">{m.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="rounded-md border border-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-white">{m.count}</span>
                        <span className="font-mono text-[11px]" style={{ color: C.muted }}>{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[13px]" style={{ color: C.muted }}>
              No mistakes recorded 🎉
            </div>
          )}
        </SectionCard>

        {/* Checklist radar */}
        <SectionCard title="Checklist Adherence" subtitle="Pre-trade rule compliance" tooltip="How well you follow your pre-trade checklist items (radar shows % compliance)">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={checklistData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: C.muted }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(138,143,152,0.6)' }} axisLine={false} />
                <Radar name="Adherence %" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.22} strokeWidth={2} animationDuration={700} />
                <Tooltip content={<ChartTip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── TREND SECTION ── */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <SectionCard
          className="2xl:col-span-2"
          title="Discipline & Focus Trend"
          subtitle="Score progression across logged trades"
          tooltip="How your discipline and focus scores are trending over time"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }} content={<ChartTip />} />
                <Area type="monotone" dataKey="discipline" name="Discipline" stroke={C.green} fill="url(#discGrad)" strokeWidth={2.5} animationDuration={900} />
                <Area type="monotone" dataKey="focus" name="Focus" stroke={C.blue} fill="url(#focusGrad)" strokeWidth={2.5} animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Emotion performance table */}
        <SectionCard
          title="Emotion Performance"
          subtitle="Breakdown by emotional state"
          tooltip="Detailed table showing win rate and P/L for each emotional state"
          action={
            <select
              value={emotionFilter}
              onChange={e => setEmotionFilter(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] text-white outline-none"
            >
              <option value="all">All emotions</option>
              {emotionData.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  {['Emotion', 'Trades', 'Win Rate', 'Total P/L'].map((h, i) => (
                    <th
                      key={h}
                      className={cn('px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em]', i === 1 && 'text-center', i === 2 && 'text-center', i === 3 && 'text-right')}
                      style={{ color: C.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmotionRows.map(row => (
                  <tr key={row.name} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                    <td className="px-3 py-3 text-[13px] font-medium text-white">{row.name}</td>
                    <td className="px-3 py-3 text-center font-mono text-[13px]" style={{ color: C.muted }}>{row.count}</td>
                    <td className="px-3 py-3 text-center font-mono text-[13px]" style={{ color: row.winRate >= 50 ? C.green : C.red }}>{row.winRate}%</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]" style={{ color: row.pl >= 0 ? C.green : C.red }}>
                      {row.pl >= 0 ? '+' : ''}{row.pl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* ── AI INSIGHTS ROW ── */}
      <section className={cn(cardBase)}>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${C.yellow}14`, color: C.yellow }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="font-heading text-[22px] font-semibold text-white">AI Insights</h2>
          <span className="text-[12px]" style={{ color: C.muted }}>Derived from logged journal data · no AI required</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3].map(i => {
            const icons = [TrendingUp, ShieldCheck, Activity, TrendingDown];
            const colors = [C.green, C.purple, C.blue, C.orange];
            const Icon = icons[i];
            const text = insights[i];
            return (
              <div key={i} className="rounded-[14px] border border-white/[0.06] bg-white/[0.015] p-4 transition-all duration-[180ms] hover:-translate-y-0.5 hover:bg-white/[0.035]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${colors[i]}14`, color: colors[i] }}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-white">
                  {['Strength', 'Discipline', 'Pattern', 'Warning'][i]}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: C.muted }}>
                  {text ?? 'Not enough data yet to generate this observation.'}
                </p>
              </div>
            );
          })}
          <Link
            to="/ai-insights"
            className="group flex flex-col justify-between rounded-[14px] border p-4 transition-all duration-[180ms] hover:-translate-y-0.5"
            style={{ borderColor: `${C.emerald}33`, background: `${C.emerald}0D` }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${C.emerald}1F`, color: C.emerald }}>
              <Brain className="h-4 w-4" />
            </span>
            <span>
              <span className="mt-3 block text-[14px] font-semibold text-white">View Full AI Report</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[12px]" style={{ color: C.emerald }}>
                Open AI Insights <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── BOTTOM GRID ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Heatmap */}
        <SectionCard title="Psychology Heatmap" subtitle="Discipline & P/L by weekday" tooltip="Weekday view of trading psychology and profitability.">
          <div className="grid grid-cols-5 gap-2">
            {heat.rows.map(r => {
              const intensity = r.count === 0 ? 0 : Math.min(1, Math.abs(r.pl) / (Math.max(...heat.rows.map(x => Math.abs(x.pl))) || 1));
              const bg = r.count === 0
                ? 'rgba(255,255,255,0.04)'
                : `${r.pl >= 0 ? C.green : C.red}${Math.round(20 + intensity * 200).toString(16).padStart(2, '0')}`;
              return (
                <div key={r.day} className="text-center">
                  <div className="flex h-16 items-center justify-center rounded-xl border border-white/[0.06]" style={{ background: bg }}>
                    <span className="font-mono text-[12px] font-semibold text-white">{r.count}</span>
                  </div>
                  <p className="mt-1.5 text-[11px]" style={{ color: C.muted }}>{r.day}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 space-y-2.5">
            {[
              { label: 'Best Day', v: heat.best, color: C.green },
              { label: 'Worst Day', v: heat.worst, color: C.red },
              { label: 'Most Consistent', v: heat.consistent, color: C.blue },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <span className="text-[12px]" style={{ color: C.muted }}>{row.label}</span>
                <span className="font-mono text-[12px] font-semibold" style={{ color: row.color }}>
                  {row.v ? `${row.v.day} · ${row.v.pl >= 0 ? '+' : ''}${row.v.pl.toFixed(2)}` : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
            Legend
            <span className="h-2.5 w-6 rounded-full" style={{ background: `${C.red}CC` }} />
            <span className="h-2.5 w-6 rounded-full bg-white/10" />
            <span className="h-2.5 w-6 rounded-full" style={{ background: `${C.green}CC` }} />
          </div>
        </SectionCard>

        {/* Donut */}
        <SectionCard title="Performance by Emotion" subtitle="P/L distribution across states" tooltip="Share of absolute P/L generated under each emotional state.">
          <div className="h-[230px]">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none" animationDuration={800}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.pl >= 0 ? donutColors[i % donutColors.length] : C.red} />)}
                  </Pie>
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px]" style={{ color: C.muted }}>No P/L data</div>
            )}
          </div>
          <div
            className="mt-4 rounded-xl border px-3 py-2.5 text-[12px]"
            style={{ borderColor: `${C.green}2E`, background: `${C.green}0D`, color: C.green }}
          >
            Best emotional state: <span className="font-semibold">{stats.topEmotion}</span> at {stats.topEmotionWinRate}% win rate.
          </div>
        </SectionCard>

        {/* Top mistakes */}
        <SectionCard title="Top 5 Mistakes" subtitle="Most frequent execution errors" tooltip="Ranked list of your most common logged mistakes.">
          {mistakeData.length > 0 ? (
            <div className="space-y-2.5">
              {mistakeData.slice(0, 5).map((m, i) => {
                const pct = Math.round((m.count / scoped.length) * 100);
                return (
                  <div key={m.name} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 transition-colors hover:bg-white/[0.04]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-bold" style={{ background: `${C.red}14`, color: C.red }}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-white">{m.name}</span>
                    <span className="font-mono text-[12px] text-white">{m.count}</span>
                    <span className="font-mono text-[11px]" style={{ color: C.muted }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px]" style={{ color: C.muted }}>No mistakes recorded 🎉</div>
          )}
          <Link
            to="/mistakes"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/[0.05]"
          >
            View Mistake Analysis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </SectionCard>
      </div>

      {/* ── COACH TIP FOOTER ── */}
      <section className="flex flex-col items-start gap-4 rounded-[18px] border border-white/[0.06] bg-[#050505] p-6 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${C.yellow}14`, color: C.yellow }}>
            <Lightbulb className="h-5 w-5" />
          </span>
          <span className="font-heading text-[15px] font-semibold uppercase tracking-[0.14em] text-white">Coach Tip</span>
        </div>
        <p className="flex-1 text-[14px] leading-relaxed" style={{ color: C.muted }}>
          {insights[0] ??
            `Your discipline averages ${stats.avgDiscipline}/5. Trades rated 4+ win ${stats.highDiscWinRate}% of the time — protect that edge by skipping setups when focus drops below 4.`}
        </p>
        <Link
          to="/ai-insights"
          className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-black transition-transform hover:-translate-y-0.5"
          style={{ background: C.green }}
        >
          View Action Plan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
