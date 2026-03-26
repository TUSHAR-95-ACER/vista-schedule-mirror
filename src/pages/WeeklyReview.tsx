import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

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

function getWeekName(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' });
  const weekNum = Math.ceil(day / 7);
  return `Week ${weekNum} ${month}`;
}

function calcExecutionScore(t: any): number {
  let score = 50;
  if (t.psychology?.checklist?.followPlan) score += 10;
  if (t.psychology?.checklist?.riskRespected) score += 10;
  if (t.psychology?.checklist?.waitedConfirmation) score += 10;
  if (t.psychology?.checklist?.noFomo) score += 10;
  if (t.psychology?.checklist?.noRevenge) score += 10;
  return Math.min(100, score);
}

export default function WeeklyReview() {
  const { trades, weeklyPlans } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.result !== 'Missed' && t.result !== 'Cancelled'), [trades]);

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, typeof valid>();
    valid.forEach(t => {
      const d = new Date(t.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const arr = weeks.get(key) || [];
      arr.push(t);
      weeks.set(key, arr);
    });
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, wt]) => {
        const wins = wt.filter(t => t.result === 'Win').length;
        const losses = wt.filter(t => t.result === 'Loss').length;
        const pl = wt.reduce((s, t) => s + t.profitLoss, 0);
        const avgRR = wt.filter(t => t.actualRR !== undefined).reduce((s, t) => s + (t.actualRR || 0), 0) / (wt.filter(t => t.actualRR !== undefined).length || 1);
        const winRate = wt.length ? (wins / wt.length) * 100 : 0;
        const setups = [...new Set(wt.map(t => t.setup))];
        const bestSetup = setups.reduce((best, s) => {
          const st = wt.filter(t => t.setup === s);
          const spl = st.reduce((ss, t) => ss + t.profitLoss, 0);
          return spl > (best.pl || -Infinity) ? { name: s, pl: spl } : best;
        }, { name: '-', pl: -Infinity });
        const mistakes = wt.flatMap(t => t.mistakes);
        const avgExec = wt.length ? Math.round(wt.reduce((s, t) => s + calcExecutionScore(t), 0) / wt.length) : 0;

        // Bias accuracy from weekly plans
        const matchingPlan = weeklyPlans.find(wp => wp.weekStart === week);
        let biasAccuracy = 0;
        if (matchingPlan) {
          const analyzed = matchingPlan.pairAnalyses.filter(pa => pa.actualDirection);
          const correct = analyzed.filter(pa => pa.bias === pa.actualDirection);
          biasAccuracy = analyzed.length > 0 ? Math.round((correct.length / analyzed.length) * 100) : 0;
        }

        // Best/worst pair
        const pairMap = new Map<string, number>();
        wt.forEach(t => pairMap.set(t.asset, (pairMap.get(t.asset) || 0) + t.profitLoss));
        const pairEntries = [...pairMap.entries()];
        const bestPair = pairEntries.sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const worstPair = pairEntries.sort((a, b) => a[1] - b[1])[0]?.[0] || '-';

        // Best/worst session
        const sessMap = new Map<string, number>();
        wt.forEach(t => sessMap.set(t.session, (sessMap.get(t.session) || 0) + t.profitLoss));
        const sessEntries = [...sessMap.entries()];
        const bestSession = sessEntries.sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const worstSession = sessEntries.sort((a, b) => a[1] - b[1])[0]?.[0] || '-';

        return {
          week, weekName: getWeekName(week), trades: wt.length, wins, losses, pl,
          avgRR: Math.round(avgRR * 100) / 100,
          winRate: Math.round(winRate * 10) / 10,
          bestSetup: bestSetup.name,
          mistakeCount: mistakes.length,
          topMistake: mistakes.length ? [...new Set(mistakes)].sort((a, b) => mistakes.filter(m => m === b).length - mistakes.filter(m => m === a).length)[0] : '-',
          avgExec, biasAccuracy, bestPair, worstPair, bestSession, worstSession,
        };
      });
  }, [valid, weeklyPlans]);

  const latest = weeklyData[weeklyData.length - 1];
  const plTrend = weeklyData.map(w => ({ name: w.weekName, pl: w.pl }));

  // Insights
  const insights = useMemo(() => {
    if (weeklyData.length < 2) return [];
    const result: string[] = [];

    // Best week pattern
    const weekNums = weeklyData.map(w => ({ num: Math.ceil(new Date(w.week).getDate() / 7), pl: w.pl }));
    const weekAvg = new Map<number, { total: number; count: number }>();
    weekNums.forEach(w => {
      const e = weekAvg.get(w.num) || { total: 0, count: 0 };
      e.total += w.pl; e.count++;
      weekAvg.set(w.num, e);
    });
    const bestWeekNum = [...weekAvg.entries()].sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
    if (bestWeekNum) result.push(`Your best performance tends to be Week ${bestWeekNum[0]} of each month.`);

    const worstWeek = weeklyData.reduce((w, d) => d.pl < w.pl ? d : w, weeklyData[0]);
    if (worstWeek.pl < 0) result.push(`Worst week was ${worstWeek.weekName} with ${formatCurrency(worstWeek.pl)}.`);

    return result;
  }, [weeklyData]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Weekly Review" subtitle="Auto-generated weekly performance reports">
        <ThemeToggle />
      </PageHeader>

      {latest ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <MetricCard label="Latest Week" value={latest.weekName} />
            <MetricCard label="Trades" value={latest.trades} />
            <MetricCard label="Win Rate" value={`${latest.winRate}%`} trend={latest.winRate >= 50 ? 'up' : 'down'} />
            <MetricCard label="P/L" value={formatCurrency(latest.pl)} trend={latest.pl >= 0 ? 'up' : 'down'} />
            <MetricCard label="Execution Score" value={`${latest.avgExec}%`} trend={latest.avgExec >= 70 ? 'up' : 'down'} />
            <MetricCard label="Bias Accuracy" value={`${latest.biasAccuracy}%`} trend={latest.biasAccuracy >= 50 ? 'up' : 'down'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Weekly P/L Trend</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={plTrend}>
                    <defs>
                      <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="pl" name="P/L" stroke="hsl(var(--primary))" fill="url(#plGrad)" strokeWidth={2} baseValue="dataMin" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Win Rate by Week</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData.map(w => ({ name: w.weekName, winRate: w.winRate }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="winRate" name="Win %" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Insights</span>
              </div>
              <div className="space-y-2">
                {insights.map((insight, i) => <p key={i} className="text-sm text-foreground/80">{insight}</p>)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">No trading data for weekly review</div>
      )}

      {/* All Weeks Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground">Week</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">Trades</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">Win Rate</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">P/L</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">Avg RR</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">Bias Acc</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground font-mono">Exec</th>
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground">Mistakes</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData.slice().reverse().map(w => (
              <tr key={w.week} className="border-b border-border/50 hover:bg-accent/50">
                <td className="px-3 py-2.5 text-xs font-medium">{w.weekName}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{w.trades}</td>
                <td className={cn('px-3 py-2.5 font-mono text-xs', w.winRate >= 50 ? 'text-success' : 'text-destructive')}>{w.winRate}%</td>
                <td className={cn('px-3 py-2.5 font-mono text-xs', w.pl >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(w.pl)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{w.avgRR}</td>
                <td className={cn('px-3 py-2.5 font-mono text-xs', w.biasAccuracy >= 50 ? 'text-success' : 'text-muted-foreground')}>{w.biasAccuracy}%</td>
                <td className="px-3 py-2.5 font-mono text-xs">{w.avgExec}%</td>
                <td className="px-3 py-2.5 text-xs">{w.mistakeCount > 0 ? `${w.mistakeCount} (${w.topMistake})` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
