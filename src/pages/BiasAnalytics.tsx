import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PageHeader } from '@/components/shared/MetricCard';
import { Lightbulb, TrendingUp, TrendingDown, Target, Activity, BarChart3, Crosshair, Clock, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
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
        )}>
          {value}
        </p>
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

  const biasStats = useMemo(() => {
    let total = 0, correct = 0;
    let bullTotal = 0, bullCorrect = 0;
    let bearTotal = 0, bearCorrect = 0;
    let neutTotal = 0, neutCorrect = 0;
    const pairMap = new Map<string, { total: number; correct: number }>();
    const sessionMap = new Map<string, { total: number; correct: number }>();
    let biasChanges = 0;
    let lastBias = '';

    // Process weekly plan pair analyses
    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.pair || !pa.actualDirection) return;
        total++;
        const isCorrect = pa.bias === pa.actualDirection;
        if (isCorrect) correct++;
        if (lastBias && pa.bias !== lastBias) biasChanges++;
        lastBias = pa.bias;
        if (pa.bias === 'Bullish') { bullTotal++; if (isCorrect) bullCorrect++; }
        if (pa.bias === 'Bearish') { bearTotal++; if (isCorrect) bearCorrect++; }
        if (pa.bias === 'Neutral') { neutTotal++; if (isCorrect) neutCorrect++; }
        const e = pairMap.get(pa.pair) || { total: 0, correct: 0 };
        e.total++; if (isCorrect) e.correct++;
        pairMap.set(pa.pair, e);
      });
    });

    // Process daily plan pair analyses
    dailyPlans.forEach(dp => {
      dp.pairs.forEach(pp => {
        if (!pp.pair || !(pp as any).actualBias) return;
        total++;
        const isCorrect = pp.bias === (pp as any).actualBias;
        if (isCorrect) correct++;
        if (lastBias && pp.bias !== lastBias) biasChanges++;
        lastBias = pp.bias;
        if (pp.bias === 'Bullish') { bullTotal++; if (isCorrect) bullCorrect++; }
        if (pp.bias === 'Bearish') { bearTotal++; if (isCorrect) bearCorrect++; }
        if (pp.bias === 'Neutral') { neutTotal++; if (isCorrect) neutCorrect++; }
        const e = pairMap.get(pp.pair) || { total: 0, correct: 0 };
        e.total++; if (isCorrect) e.correct++;
        pairMap.set(pp.pair, e);
      });
    });

    trades.forEach(t => {
      if (t.result === 'Untriggered Setup' || t.result === 'Cancelled') return;
      const e = sessionMap.get(t.session) || { total: 0, correct: 0 };
      e.total++; if (t.result === 'Win') e.correct++;
      sessionMap.set(t.session, e);
    });

    const pairAccuracy = [...pairMap.entries()]
      .map(([pair, { total: t, correct: c }]) => ({ pair, accuracy: t > 0 ? (c / t) * 100 : 0, total: t }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const sessionAccuracy = [...sessionMap.entries()]
      .map(([session, { total: t, correct: c }]) => ({ session, accuracy: t > 0 ? (c / t) * 100 : 0, total: t }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const consistency = total > 1 ? Math.round((1 - biasChanges / (total - 1)) * 100) : 100;

    return {
      overall: total > 0 ? (correct / total) * 100 : 0,
      total, correct,
      bullish: bullTotal > 0 ? (bullCorrect / bullTotal) * 100 : 0,
      bearish: bearTotal > 0 ? (bearCorrect / bearTotal) * 100 : 0,
      neutral: neutTotal > 0 ? (neutCorrect / neutTotal) * 100 : 0,
      bullTotal, bearTotal, neutTotal,
      bestPair: pairAccuracy[0] || null,
      worstPair: pairAccuracy[pairAccuracy.length - 1] || null,
      consistency,
      bestSession: sessionAccuracy[0] || null,
      worstSession: sessionAccuracy[sessionAccuracy.length - 1] || null,
      pairAccuracy,
      sessionAccuracy,
    };
  }, [weeklyPlans, dailyPlans, trades]);

  const missedOpps = useMemo(() => {
    // Renamed: "Opportunity Not Found" — bias was correct but no trade was taken
    let count = 0;
    const tradeDates = new Set(trades.map(t => t.date + '_' + t.asset));
    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.pair || !pa.actualDirection) return;
        if (pa.bias !== pa.actualDirection) return;
        const weekStart = new Date(wp.weekStart);
        let found = false;
        for (let d = 0; d < 7; d++) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + d);
          if (tradeDates.has(date.toISOString().split('T')[0] + '_' + pa.pair)) { found = true; break; }
        }
        if (!found) count++;
      });
    });
    return count;
  }, [weeklyPlans, trades]);

  const conversionRate = useMemo(() => {
    let totalAnalyses = 0, converted = 0;
    const tradeDates = new Set(trades.map(t => t.date + '_' + t.asset));
    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.pair) return;
        totalAnalyses++;
        const weekStart = new Date(wp.weekStart);
        for (let d = 0; d < 7; d++) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + d);
          if (tradeDates.has(date.toISOString().split('T')[0] + '_' + pa.pair)) { converted++; break; }
        }
      });
    });
    return totalAnalyses > 0 ? (converted / totalAnalyses) * 100 : 0;
  }, [weeklyPlans, trades]);

  const overconfidence = useMemo(() => {
    let highConfWrong = 0, highConfTotal = 0;
    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.actualDirection || pa.bias === 'Neutral') return;
        highConfTotal++;
        if (pa.bias !== pa.actualDirection) highConfWrong++;
      });
    });
    return highConfTotal > 0 ? Math.round((highConfWrong / highConfTotal) * 100) : 0;
  }, [weeklyPlans]);

  const conditionAccuracy = useMemo(() => {
    const condMap = new Map<string, { total: number; wins: number }>();
    trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled').forEach(t => {
      const e = condMap.get(t.marketCondition) || { total: 0, wins: 0 };
      e.total++; if (t.result === 'Win') e.wins++;
      condMap.set(t.marketCondition, e);
    });
    return [...condMap.entries()].map(([cond, { total, wins }]) => ({
      condition: cond, accuracy: Math.round((wins / total) * 100), total,
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [trades]);

  const insights = useMemo(() => {
    const result: string[] = [];
    if (biasStats.overall > 0) {
      result.push(biasStats.overall >= 60
        ? `Your ${biasStats.overall.toFixed(0)}% bias accuracy shows a strong analytical edge.`
        : `At ${biasStats.overall.toFixed(0)}%, consider refining your analysis framework.`
      );
    }
    if (biasStats.bestPair && biasStats.bestPair.total >= 2) {
      result.push(`Strongest read on ${biasStats.bestPair.pair} — ${biasStats.bestPair.accuracy.toFixed(0)}% across ${biasStats.bestPair.total} analyses.`);
    }
    if (missedOpps > 0) {
      result.push(`${missedOpps} missed opportunities — you called the direction right but didn't take the trade.`);
    }
    if (overconfidence > 40) {
      result.push(`Overconfidence alert: ${overconfidence}% of strong bias calls were wrong.`);
    }
    if (conditionAccuracy.length > 0) {
      const best = conditionAccuracy[0];
      const worst = conditionAccuracy[conditionAccuracy.length - 1];
      if (best.accuracy !== worst.accuracy) {
        result.push(`Best in ${best.condition} markets (${best.accuracy}%), weakest in ${worst.condition} (${worst.accuracy}%).`);
      }
    }
    if (biasStats.consistency < 60) {
      result.push(`Bias consistency is low (${biasStats.consistency}%) — frequent changes suggest uncertainty.`);
    }
    if (result.length === 0) {
      result.push('Create weekly plans with pair analyses and fill in actual results to generate insights.');
    }
    return result;
  }, [biasStats, missedOpps, overconfidence, conditionAccuracy]);

  const hasData = biasStats.total > 0;

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title="Bias Performance" subtitle="Track your prediction accuracy and identify patterns">
        <ThemeToggle />
      </PageHeader>

      {/* Hero Score */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-success/5" />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-primary mb-2">Overall Bias Accuracy</p>
            <div className="flex items-end gap-3">
              <span className={cn(
                'font-heading text-5xl sm:text-6xl font-black tracking-tighter',
                biasStats.overall >= 60 ? 'text-success' : biasStats.overall >= 40 ? 'text-warning' : 'text-destructive'
              )}>
                {biasStats.overall.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground mb-2">{biasStats.correct}/{biasStats.total} correct</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-success mb-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="font-heading text-lg font-bold">{biasStats.bullish.toFixed(0)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bullish</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-destructive mb-1">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span className="font-heading text-lg font-bold">{biasStats.bearish.toFixed(0)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bearish</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Minus className="h-3.5 w-3.5" />
                <span className="font-heading text-lg font-bold">{biasStats.neutral.toFixed(0)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Neutral</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Conversion Rate" value={`${conversionRate.toFixed(0)}%`} subtitle="Analysis → Trade" icon={Target} accent="primary" tooltip="How often your weekly analysis leads to an actual trade" />
        <StatCard label="Opportunity Not Found" value={String(missedOpps)} subtitle="Correct bias, no trade" icon={Zap} accent="warning" trend={missedOpps > 0 ? 'down' : 'neutral'} tooltip="Times you predicted direction correctly but didn't take the trade — your bias was right but the opportunity wasn't found/acted on" />
        <StatCard label="Bias Consistency" value={`${biasStats.consistency}%`} subtitle="How steady you stay" icon={Activity} accent={biasStats.consistency >= 60 ? 'success' : 'destructive'} trend={biasStats.consistency >= 60 ? 'up' : 'down'} tooltip="How often you stick with your bias vs changing it frequently" />
        <StatCard label="Overconfidence" value={`${overconfidence}%`} subtitle="Strong bias but wrong" icon={AlertTriangle} accent={overconfidence > 40 ? 'destructive' : 'success'} trend={overconfidence > 40 ? 'down' : 'up'} tooltip="Percentage of strong directional bias calls that turned out wrong" />
      </div>

      {/* Best/Worst */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Best Pair" value={biasStats.bestPair?.pair || '—'} subtitle={biasStats.bestPair ? `${biasStats.bestPair.accuracy.toFixed(0)}% accuracy` : ''} icon={TrendingUp} accent="success" tooltip="The pair where your directional prediction is most accurate" />
        <StatCard label="Worst Pair" value={biasStats.worstPair?.pair || '—'} subtitle={biasStats.worstPair ? `${biasStats.worstPair.accuracy.toFixed(0)}% accuracy` : ''} icon={TrendingDown} accent="destructive" tooltip="The pair where your directional prediction is least accurate" />
        <StatCard label="Best Session" value={biasStats.bestSession?.session || '—'} subtitle={biasStats.bestSession ? `${biasStats.bestSession.accuracy.toFixed(0)}% win rate` : ''} icon={Clock} accent="success" tooltip="The trading session where you have the highest win rate" />
        <StatCard label="Worst Session" value={biasStats.worstSession?.session || '—'} subtitle={biasStats.worstSession ? `${biasStats.worstSession.accuracy.toFixed(0)}% win rate` : ''} icon={Clock} accent="destructive" tooltip="The trading session where you have the lowest win rate" />
      </div>

      {/* Detailed breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pair-wise accuracy bars */}
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Pair-wise Accuracy</h3>
          </div>
          <div className="p-5 space-y-3">
            {biasStats.pairAccuracy.length > 0 ? (
              biasStats.pairAccuracy.map(p => (
                <AccuracyBar key={p.pair} label={p.pair} value={p.accuracy} total={p.total} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No pair data yet</p>
            )}
          </div>
        </div>

        {/* Market Condition Performance */}
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-warning" />
            </div>
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Market Condition Performance</h3>
          </div>
          <div className="p-5 space-y-3">
            {conditionAccuracy.length > 0 ? (
              conditionAccuracy.map(c => (
                <AccuracyBar key={c.condition} label={c.condition} value={c.accuracy} total={c.total} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No market condition data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Session accuracy */}
      {biasStats.sessionAccuracy.length > 0 && (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-success" />
            </div>
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Session Win Rate</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {biasStats.sessionAccuracy.map(s => (
                <AccuracyBar key={s.session} label={s.session} value={s.accuracy} total={s.total} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Smart Insights */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3.5 border-b border-border/40 bg-gradient-to-r from-warning/10 to-transparent flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-warning" />
          </div>
          <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">Smart Insights</h3>
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
        </div>
      </div>
    </div>
  );
}
