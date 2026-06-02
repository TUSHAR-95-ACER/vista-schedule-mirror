import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { Lightbulb, TrendingUp, TrendingDown, Target, Activity, Crosshair, Clock, ArrowUpRight, ArrowDownRight, Minus, MoveHorizontal } from 'lucide-react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { normalizeBiasDirection } from '@/lib/bias';
import { cn } from '@/lib/utils';

function StatCard({ label, value, subtitle, trend, icon: Icon, accent, tooltip }: {
  label: string; value: string; subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ElementType;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
  tooltip?: string;
}) {
  const accentBg = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between min-h-[110px] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <div className="flex items-start justify-between mb-auto">
        <div className="flex items-center gap-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {Icon && (
          <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', accent ? accentBg[accent] : 'bg-muted text-muted-foreground')}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div>
        <p className={cn(
          'font-heading text-xl sm:text-2xl font-bold tracking-tight',
          trend === 'up' && 'text-success',
          trend === 'down' && 'text-destructive',
          !trend && 'text-foreground',
        )}>{value}</p>
        {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function AccuracyBar({ label, value, total }: { label: string; value: number; total?: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {total !== undefined && <span className="text-[10px] text-muted-foreground font-mono">{total} analyses</span>}
          <span className={cn('text-xs font-mono font-bold', value >= 50 ? 'text-success' : 'text-destructive')}>{value.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', value >= 60 ? 'bg-success' : value >= 40 ? 'bg-warning' : 'bg-destructive')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function BiasAnalytics() {
  const { weeklyPlans, dailyPlans, trades } = useTrading();

  const stats = useMemo(() => {
    // Directional accuracy ONLY counts Bullish/Bearish predictions.
    // Neutral / Sideways calls are "stand aside" days and are tracked separately.
    let dirTotal = 0, dirCorrect = 0;
    let bullTotal = 0, bullCorrect = 0;
    let bearTotal = 0, bearCorrect = 0;
    let standAsideDays = 0;
    const pairMap = new Map<string, { total: number; correct: number }>();
    const sessionMap = new Map<string, { total: number; correct: number }>();

    let prevBias = '';
    let biasChanges = 0;
    let biasObservations = 0;

    const tradeKeys = new Set(trades.map((t) => `${t.date}_${t.asset}`));
    let executable = 0;
    let executed = 0;

    const ingest = (pair: string, predicted: string, actual: string, dateRangeStarts: string[]) => {
      const pBias = normalizeBiasDirection(predicted);
      const aBias = normalizeBiasDirection(actual);
      if (!pBias) return;

      biasObservations++;
      if (prevBias && pBias !== prevBias) biasChanges++;
      prevBias = pBias;

      const directional = pBias === 'Bullish' || pBias === 'Bearish';
      if (!directional) {
        standAsideDays++;
      } else if (aBias) {
        dirTotal++;
        const correct = pBias === aBias;
        if (correct) dirCorrect++;
        if (pBias === 'Bullish') { bullTotal++; if (correct) bullCorrect++; }
        else { bearTotal++; if (correct) bearCorrect++; }
        if (pair) {
          const e = pairMap.get(pair) || { total: 0, correct: 0 };
          e.total++; if (correct) e.correct++;
          pairMap.set(pair, e);
        }
      }

      // Execution rate: did a directional bias on a pair lead to at least one trade in the date window?
      if (directional && pair && dateRangeStarts.length) {
        executable++;
        const took = dateRangeStarts.some((d) => tradeKeys.has(`${d}_${pair}`));
        if (took) executed++;
      }
    };

    weeklyPlans.forEach((wp) => {
      const start = new Date(wp.weekStart);
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
      }
      wp.pairAnalyses.forEach((pa) => {
        if (!pa.pair) return;
        ingest(pa.pair, pa.bias as string, (pa.actualDirection || (pa as any).actualBias || '') as string, days);
      });
    });

    dailyPlans.forEach((dp) => {
      dp.pairs.forEach((pp) => {
        if (!pp.pair) return;
        ingest(pp.pair, pp.bias as string, ((pp as any).actualBias || '') as string, [dp.date]);
      });
    });

    trades.forEach((t) => {
      if (t.result === 'Untriggered Setup' || t.result === 'Cancelled') return;
      const e = sessionMap.get(t.session) || { total: 0, correct: 0 };
      e.total++; if (t.result === 'Win') e.correct++;
      sessionMap.set(t.session, e);
    });

    const pairAccuracy = [...pairMap.entries()]
      .map(([pair, { total, correct }]) => ({ pair, accuracy: total > 0 ? (correct / total) * 100 : 0, total }))
      .sort((a, b) => b.accuracy - a.accuracy);
    const sessionAccuracy = [...sessionMap.entries()]
      .map(([session, { total, correct }]) => ({ session, accuracy: total > 0 ? (correct / total) * 100 : 0, total }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const stability = biasObservations > 1 ? Math.round((1 - biasChanges / (biasObservations - 1)) * 100) : 100;

    return {
      overall: dirTotal > 0 ? (dirCorrect / dirTotal) * 100 : 0,
      dirTotal, dirCorrect,
      bullish: bullTotal > 0 ? (bullCorrect / bullTotal) * 100 : 0,
      bearish: bearTotal > 0 ? (bearCorrect / bearTotal) * 100 : 0,
      bullTotal, bearTotal,
      standAsideDays,
      bestPair: pairAccuracy[0] || null,
      worstPair: pairAccuracy[pairAccuracy.length - 1] || null,
      bestSession: sessionAccuracy[0] || null,
      worstSession: sessionAccuracy[sessionAccuracy.length - 1] || null,
      pairAccuracy, sessionAccuracy,
      stability, biasChanges, biasObservations,
      executable, executed,
      executionRate: executable > 0 ? (executed / executable) * 100 : 0,
    };
  }, [weeklyPlans, dailyPlans, trades]);

  const insights = useMemo(() => {
    const out: string[] = [];
    if (stats.dirTotal > 0) {
      out.push(stats.overall >= 60
        ? `Directional bias is solid: ${stats.overall.toFixed(0)}% across ${stats.dirTotal} resolved calls.`
        : `Directional bias is ${stats.overall.toFixed(0)}% — your read needs refining (${stats.dirTotal} resolved calls).`);
    }
    if (stats.bestPair && stats.bestPair.total >= 2) {
      out.push(`Sharpest read on ${stats.bestPair.pair} — ${stats.bestPair.accuracy.toFixed(0)}% across ${stats.bestPair.total} analyses.`);
    }
    if (stats.executable > 0 && stats.executionRate < 50) {
      out.push(`Execution rate is ${stats.executionRate.toFixed(0)}% — you called the direction but only traded ${stats.executed}/${stats.executable} times.`);
    }
    if (stats.stability < 60) {
      out.push(`Bias stability is low (${stats.stability}%) — frequent changes suggest uncertainty.`);
    }
    if (stats.standAsideDays > 0) {
      out.push(`${stats.standAsideDays} stand-aside days logged (Neutral / Sideways) — discipline counts.`);
    }
    if (out.length === 0) {
      out.push('Create weekly plans with pair analyses and fill in actual results to generate insights.');
    }
    return out;
  }, [stats]);

  return (
    <div className="p-4 lg:p-6 w-full space-y-6">
      <PageHeader title="Bias Performance" subtitle="Every metric below is derived directly from logged journal data." />

      {/* Hero score */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-success/5" />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
              Overall Bias Accuracy
              <InfoTooltip text="Source: weekly + daily pair analyses where Predicted and Actual are both filled and predicted bias was directional (Bullish/Bearish). Neutral/Sideways are excluded — they are stand-aside calls." />
            </p>
            <div className="flex items-end gap-3">
              <span className={cn(
                'font-heading text-5xl sm:text-6xl font-black tracking-tighter',
                stats.overall >= 60 ? 'text-success' : stats.overall >= 40 ? 'text-warning' : 'text-destructive',
              )}>{stats.overall.toFixed(0)}%</span>
              <span className="text-sm text-muted-foreground mb-2">{stats.dirCorrect}/{stats.dirTotal} directional calls correct</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-success mb-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="font-heading text-lg font-bold">{stats.bullish.toFixed(0)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bullish ({stats.bullTotal})</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-destructive mb-1">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span className="font-heading text-lg font-bold">{stats.bearish.toFixed(0)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bearish ({stats.bearTotal})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Bullish Accuracy" value={`${stats.bullish.toFixed(0)}%`}
          subtitle={`${stats.bullTotal} predictions`} icon={TrendingUp} accent="success"
          tooltip="Source: Bullish predictions in weekly/daily plans where the actual direction was logged. Calculation: correct ÷ total Bullish predictions."
        />
        <StatCard
          label="Bearish Accuracy" value={`${stats.bearish.toFixed(0)}%`}
          subtitle={`${stats.bearTotal} predictions`} icon={TrendingDown} accent="destructive"
          tooltip="Source: Bearish predictions in weekly/daily plans where the actual direction was logged. Calculation: correct ÷ total Bearish predictions."
        />
        <StatCard
          label="Neutral / Stand Aside Days" value={String(stats.standAsideDays)}
          subtitle="Neutral + Sideways calls" icon={MoveHorizontal} accent="warning"
          tooltip="Source: count of pair analyses logged as Neutral or Sideways. These are not graded — they represent intentional stand-aside discipline."
        />
        <StatCard
          label="Bias Execution Rate" value={`${stats.executionRate.toFixed(0)}%`}
          subtitle={`${stats.executed} of ${stats.executable} acted on`} icon={Target} accent="primary"
          tooltip="Source: directional bias entries (Bullish/Bearish) cross-referenced with the trades log. Calculation: pairs with at least one trade on the analysis date(s) ÷ total directional bias entries."
        />
      </div>

      {/* Stability + Best/Worst */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Bias Stability" value={`${stats.stability}%`}
          subtitle={`${stats.biasChanges} changes / ${stats.biasObservations} obs`} icon={Activity}
          accent={stats.stability >= 60 ? 'success' : 'destructive'}
          trend={stats.stability >= 60 ? 'up' : 'down'}
          tooltip="Source: sequence of logged bias calls. Calculation: 1 − (bias changes ÷ (observations − 1)). High = you stay with your read; low = frequent changes."
        />
        <StatCard
          label="Best Pair" value={stats.bestPair?.pair || '—'}
          subtitle={stats.bestPair ? `${stats.bestPair.accuracy.toFixed(0)}% over ${stats.bestPair.total} calls` : ''}
          icon={TrendingUp} accent="success"
          tooltip="Source: directional bias accuracy grouped by pair. Calculation: correct ÷ total directional calls per pair, ranked descending."
        />
        <StatCard
          label="Worst Pair" value={stats.worstPair?.pair || '—'}
          subtitle={stats.worstPair ? `${stats.worstPair.accuracy.toFixed(0)}% over ${stats.worstPair.total} calls` : ''}
          icon={TrendingDown} accent="destructive"
          tooltip="Source: same per-pair grouping as Best Pair, lowest accuracy."
        />
        <StatCard
          label="Best Session" value={stats.bestSession?.session || '—'}
          subtitle={stats.bestSession ? `${stats.bestSession.accuracy.toFixed(0)}% win rate` : ''}
          icon={Clock} accent="success"
          tooltip="Source: closed trades (excluding Untriggered Setup / Cancelled), grouped by session. Calculation: wins ÷ trades."
        />
      </div>

      {/* Per-pair bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Directional Accuracy by Pair</h3>
            <InfoTooltip text="Bullish/Bearish predictions only. Neutral/Sideways excluded." />
          </div>
          <div className="p-5 space-y-3">
            {stats.pairAccuracy.length > 0 ? (
              stats.pairAccuracy.map((p) => <AccuracyBar key={p.pair} label={p.pair} value={p.accuracy} total={p.total} />)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No directional pair data yet</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-success" />
            </div>
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Win Rate by Session</h3>
            <InfoTooltip text="Closed trades only (Untriggered Setup / Cancelled excluded)." />
          </div>
          <div className="p-5 space-y-3">
            {stats.sessionAccuracy.length > 0 ? (
              stats.sessionAccuracy.map((s) => <AccuracyBar key={s.session} label={s.session} value={s.accuracy} total={s.total} />)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No session data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3.5 border-b border-border/40 bg-gradient-to-r from-warning/10 to-transparent flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-warning" />
          </div>
          <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Insights</h3>
        </div>
        <div className="p-5 space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-foreground/80 leading-relaxed">{insight}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 mt-3 flex items-center gap-1">
            <Minus className="h-3 w-3" /> Every figure on this page is derived from logged plans and trades — no inferred or estimated stats.
          </p>
        </div>
      </div>
    </div>
  );
}
