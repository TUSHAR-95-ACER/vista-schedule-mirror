import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { Lightbulb } from 'lucide-react';

export default function BiasAnalytics() {
  const { weeklyPlans, trades } = useTrading();

  const biasStats = useMemo(() => {
    let total = 0, correct = 0;
    let bullTotal = 0, bullCorrect = 0;
    let bearTotal = 0, bearCorrect = 0;
    let neutTotal = 0, neutCorrect = 0;
    const pairMap = new Map<string, { total: number; correct: number }>();
    const condMap = new Map<string, { total: number; correct: number }>();
    const sessionMap = new Map<string, { total: number; correct: number }>();

    // Consistency tracking
    let biasChanges = 0;
    let lastBias = '';

    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.pair || !pa.actualDirection) return;
        total++;
        const isCorrect = pa.bias === pa.actualDirection;
        if (isCorrect) correct++;

        // Consistency
        if (lastBias && pa.bias !== lastBias) biasChanges++;
        lastBias = pa.bias;

        if (pa.bias === 'Bullish') { bullTotal++; if (isCorrect) bullCorrect++; }
        if (pa.bias === 'Bearish') { bearTotal++; if (isCorrect) bearCorrect++; }
        if (pa.bias === 'Neutral') { neutTotal++; if (isCorrect) neutCorrect++; }

        const e = pairMap.get(pa.pair) || { total: 0, correct: 0 };
        e.total++;
        if (isCorrect) e.correct++;
        pairMap.set(pa.pair, e);
      });
    });

    // Session accuracy from trades
    trades.forEach(t => {
      if (t.result === 'Missed' || t.result === 'Cancelled') return;
      const e = sessionMap.get(t.session) || { total: 0, correct: 0 };
      e.total++;
      if (t.result === 'Win') e.correct++;
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
      bestPair: pairAccuracy[0] || null,
      worstPair: pairAccuracy[pairAccuracy.length - 1] || null,
      consistency,
      bestSession: sessionAccuracy[0] || null,
      worstSession: sessionAccuracy[sessionAccuracy.length - 1] || null,
      pairAccuracy,
      sessionAccuracy,
    };
  }, [weeklyPlans, trades]);

  // Missed opportunities
  const missedOpps = useMemo(() => {
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

  // Conversion rate
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

  // Overconfidence detector
  const overconfidence = useMemo(() => {
    let highConfWrong = 0, highConfTotal = 0;
    weeklyPlans.forEach(wp => {
      wp.pairAnalyses.forEach(pa => {
        if (!pa.actualDirection || pa.bias === 'Neutral') return;
        // If user set a strong bias (not neutral), count as high confidence
        highConfTotal++;
        if (pa.bias !== pa.actualDirection) highConfWrong++;
      });
    });
    return highConfTotal > 0 ? Math.round((highConfWrong / highConfTotal) * 100) : 0;
  }, [weeklyPlans]);

  // Market condition vs bias accuracy (from trades)
  const conditionAccuracy = useMemo(() => {
    const condMap = new Map<string, { total: number; wins: number }>();
    trades.filter(t => t.result !== 'Missed' && t.result !== 'Cancelled').forEach(t => {
      const e = condMap.get(t.marketCondition) || { total: 0, wins: 0 };
      e.total++;
      if (t.result === 'Win') e.wins++;
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
        ? `You are ${biasStats.overall.toFixed(0)}% accurate on your weekly bias predictions — strong analytical edge.`
        : `Your bias accuracy is ${biasStats.overall.toFixed(0)}% — consider refining your analysis framework.`
      );
    }
    if (biasStats.bestPair && biasStats.bestPair.total >= 2) {
      result.push(`Best bias accuracy on ${biasStats.bestPair.pair} (${biasStats.bestPair.accuracy.toFixed(0)}% over ${biasStats.bestPair.total} analyses).`);
    }
    if (missedOpps > 0) {
      result.push(`${missedOpps} missed opportunities where your bias was correct but no trade was taken.`);
    }
    if (overconfidence > 40) {
      result.push(`Overconfidence detected: ${overconfidence}% of your strong bias calls were wrong. Consider being more selective.`);
    }
    if (conditionAccuracy.length > 0) {
      const best = conditionAccuracy[0];
      const worst = conditionAccuracy[conditionAccuracy.length - 1];
      if (best.accuracy !== worst.accuracy) {
        result.push(`You perform best in ${best.condition} markets (${best.accuracy}%) and worst in ${worst.condition} markets (${worst.accuracy}%).`);
      }
    }
    if (biasStats.bestSession) {
      result.push(`Best session accuracy: ${biasStats.bestSession.session} (${biasStats.bestSession.accuracy.toFixed(0)}% over ${biasStats.bestSession.total} trades).`);
    }
    if (biasStats.consistency < 60) {
      result.push(`Your bias consistency is low (${biasStats.consistency}%). Frequent bias changes suggest uncertainty in analysis.`);
    }
    if (result.length === 0) {
      result.push('Create weekly plans with pair analyses and fill in results to generate bias insights.');
    }
    return result;
  }, [biasStats, missedOpps, overconfidence, conditionAccuracy]);

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      <PageHeader title="Bias Performance" subtitle="Track prediction accuracy and decision patterns">
        <ThemeToggle />
      </PageHeader>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Overall Bias Accuracy" value={`${biasStats.overall.toFixed(0)}%`} trend={biasStats.overall >= 50 ? 'up' : 'down'} />
        <MetricCard label="Bullish Accuracy" value={`${biasStats.bullish.toFixed(0)}%`} trend={biasStats.bullish >= 50 ? 'up' : 'down'} />
        <MetricCard label="Bearish Accuracy" value={`${biasStats.bearish.toFixed(0)}%`} trend={biasStats.bearish >= 50 ? 'up' : 'down'} />
        <MetricCard label="Neutral Accuracy" value={`${biasStats.neutral.toFixed(0)}%`} />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Best Pair" value={biasStats.bestPair?.pair || '—'} subtitle={biasStats.bestPair ? `${biasStats.bestPair.accuracy.toFixed(0)}%` : ''} trend="up" />
        <MetricCard label="Worst Pair" value={biasStats.worstPair?.pair || '—'} subtitle={biasStats.worstPair ? `${biasStats.worstPair.accuracy.toFixed(0)}%` : ''} trend="down" />
        <MetricCard label="Missed Opportunities" value={String(missedOpps)} subtitle="Correct bias, no trade" />
        <MetricCard label="Conversion Rate" value={`${conversionRate.toFixed(0)}%`} subtitle="Bias → Trade" />
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Bias Consistency" value={`${biasStats.consistency}%`} subtitle="How steady your bias stays" trend={biasStats.consistency >= 60 ? 'up' : 'down'} />
        <MetricCard label="Overconfidence Rate" value={`${overconfidence}%`} subtitle="Strong bias but wrong" trend={overconfidence > 40 ? 'down' : 'up'} />
        <MetricCard label="Best Session" value={biasStats.bestSession?.session || '—'} subtitle={biasStats.bestSession ? `${biasStats.bestSession.accuracy.toFixed(0)}%` : ''} trend="up" />
        <MetricCard label="Worst Session" value={biasStats.worstSession?.session || '—'} subtitle={biasStats.worstSession ? `${biasStats.worstSession.accuracy.toFixed(0)}%` : ''} trend="down" />
      </div>

      {/* Market Condition Performance */}
      {conditionAccuracy.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {conditionAccuracy.map(c => (
            <MetricCard key={c.condition} label={`${c.condition} Markets`} value={`${c.accuracy}%`} subtitle={`${c.total} trades`}
              trend={c.accuracy >= 50 ? 'up' : 'down'} />
          ))}
        </div>
      )}

      {/* Pair-wise Edge */}
      {biasStats.pairAccuracy.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pair-wise Bias Edge</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Pair</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground font-mono">Accuracy</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground font-mono">Analyses</th>
              </tr>
            </thead>
            <tbody>
              {biasStats.pairAccuracy.map(p => (
                <tr key={p.pair} className="border-b border-border/50 hover:bg-accent/50">
                  <td className="px-4 py-2 text-xs font-medium">{p.pair}</td>
                  <td className={`px-4 py-2 font-mono text-xs ${p.accuracy >= 50 ? 'text-success' : 'text-destructive'}`}>{p.accuracy.toFixed(0)}%</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Insight Engine */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart Insights</span>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-sm text-foreground/80">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
