import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { formatCurrency, formatPercent, calcWinRate } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
};

export default function AIInsights() {
  const { trades } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.result !== 'Missed' && t.result !== 'Cancelled'), [trades]);

  // Generate insights
  const insights = useMemo(() => {
    if (valid.length < 5) return [];
    const results: { title: string; description: string; type: 'positive' | 'negative' | 'neutral' }[] = [];
    
    const winRate = calcWinRate(trades);
    if (winRate >= 55) results.push({ title: 'Strong Win Rate', description: `Your ${winRate.toFixed(1)}% win rate shows consistent edge. Maintain your current approach.`, type: 'positive' });
    else if (winRate < 40) results.push({ title: 'Low Win Rate Alert', description: `At ${winRate.toFixed(1)}%, review your entry criteria and confluences.`, type: 'negative' });

    // Best pair
    const pairMap = new Map<string, number>();
    valid.forEach(t => pairMap.set(t.asset, (pairMap.get(t.asset) || 0) + t.profitLoss));
    const bestPair = [...pairMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const worstPair = [...pairMap.entries()].sort((a, b) => a[1] - b[1])[0];
    if (bestPair) results.push({ title: `Focus on ${bestPair[0]}`, description: `${bestPair[0]} is your most profitable pair at ${formatCurrency(bestPair[1])}. Consider allocating more focus here.`, type: 'positive' });
    if (worstPair && worstPair[1] < 0) results.push({ title: `Avoid ${worstPair[0]}`, description: `${worstPair[0]} is your worst pair at ${formatCurrency(worstPair[1])}. Consider reducing exposure.`, type: 'negative' });

    // Session analysis
    const sessionMap = new Map<string, { pl: number; count: number }>();
    valid.forEach(t => {
      const s = sessionMap.get(t.session) || { pl: 0, count: 0 };
      s.pl += t.profitLoss; s.count++;
      sessionMap.set(t.session, s);
    });
    const bestSession = [...sessionMap.entries()].sort((a, b) => b[1].pl - a[1].pl)[0];
    if (bestSession) results.push({ title: `Best Session: ${bestSession[0]}`, description: `${bestSession[0]} session yields ${formatCurrency(bestSession[1].pl)} across ${bestSession[1].count} trades.`, type: 'neutral' });

    // Overtrading check
    const dayMap = new Map<string, number>();
    valid.forEach(t => dayMap.set(t.date, (dayMap.get(t.date) || 0) + 1));
    const overtradeDays = [...dayMap.values()].filter(c => c > 3).length;
    if (overtradeDays > 2) results.push({ title: 'Overtrading Detected', description: `You've overtraded (>3 trades/day) on ${overtradeDays} days. This correlates with lower win rates.`, type: 'negative' });

    // Mistake patterns
    const allMistakes = valid.flatMap(t => t.mistakes);
    if (allMistakes.length > 0) {
      const freq = new Map<string, number>();
      allMistakes.forEach(m => freq.set(m, (freq.get(m) || 0) + 1));
      const topMistake = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      results.push({ title: `Top Mistake: ${topMistake[0]}`, description: `${topMistake[0]} occurred ${topMistake[1]} times. Eliminating this could significantly improve performance.`, type: 'negative' });
    }

    // RR analysis
    const avgRR = valid.filter(t => t.actualRR).reduce((s, t) => s + (t.actualRR || 0), 0) / (valid.filter(t => t.actualRR).length || 1);
    if (avgRR >= 2) results.push({ title: 'Excellent Risk:Reward', description: `Average RR of ${avgRR.toFixed(2)} shows strong trade management.`, type: 'positive' });

    return results;
  }, [valid, trades]);

  // Radar data
  const radarData = useMemo(() => {
    const winRate = calcWinRate(trades);
    const avgRR = valid.filter(t => t.actualRR).reduce((s, t) => s + (t.actualRR || 0), 0) / (valid.filter(t => t.actualRR).length || 1);
    const withPsych = valid.filter(t => t.psychology);
    const avgDiscipline = withPsych.length ? (withPsych.reduce((s, t) => s + t.psychology!.discipline, 0) / withPsych.length) * 20 : 50;
    const avgFocus = withPsych.length ? (withPsych.reduce((s, t) => s + t.psychology!.focus, 0) / withPsych.length) * 20 : 50;
    const consistency = Math.min(100, valid.length * 2);
    const riskMgmt = withPsych.filter(t => t.psychology!.checklist.riskRespected).length / (withPsych.length || 1) * 100;
    return [
      { subject: 'Win Rate', value: winRate },
      { subject: 'RR Ratio', value: Math.min(100, avgRR * 25) },
      { subject: 'Discipline', value: avgDiscipline },
      { subject: 'Focus', value: avgFocus },
      { subject: 'Consistency', value: consistency },
      { subject: 'Risk Mgmt', value: riskMgmt },
    ];
  }, [valid, trades]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="AI Insights" subtitle="Intelligent trading recommendations">
        <ThemeToggle />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trader Radar */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Trader Profile</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights Cards */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Recommendations</h3>
          {insights.length > 0 ? insights.map((insight, i) => (
            <div key={i} className={cn(
              'border rounded-lg p-4 transition-colors',
              insight.type === 'positive' && 'bg-success/5 border-success/20',
              insight.type === 'negative' && 'bg-destructive/5 border-destructive/20',
              insight.type === 'neutral' && 'bg-card border-border',
            )}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  insight.type === 'positive' && 'bg-success',
                  insight.type === 'negative' && 'bg-destructive',
                  insight.type === 'neutral' && 'bg-primary',
                )} />
                <h4 className="text-sm font-semibold">{insight.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground pl-4">{insight.description}</p>
            </div>
          )) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              Log at least 5 trades to generate AI insights
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
