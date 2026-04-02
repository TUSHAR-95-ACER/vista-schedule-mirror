import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ChartHeader } from '@/components/shared/InfoTooltip';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Mistake, Session } from '@/types/trading';

const ALL_MISTAKES: Mistake[] = ['FOMO', 'Early Entry', 'Overtrading', 'Emotional', 'Ignored SL'];
const COLORS = ['hsl(0 84% 60% / 0.8)', 'hsl(38 92% 50% / 0.8)', 'hsl(270 60% 50% / 0.8)', 'hsl(210 100% 50% / 0.8)', 'hsl(330 70% 50% / 0.8)'];
const SEVERITY: Record<Mistake, { level: string; color: string }> = {
  'FOMO': { level: 'Critical', color: 'text-destructive' },
  'Early Entry': { level: 'Critical', color: 'text-destructive' },
  'Overtrading': { level: 'Moderate', color: 'text-warning' },
  'Emotional': { level: 'Behavioral', color: 'text-primary' },
  'Ignored SL': { level: 'Critical', color: 'text-destructive' },
};

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

export default function Mistakes() {
  const { trades } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled'), [trades]);

  const mistakeData = useMemo(() => {
    return ALL_MISTAKES.map(m => {
      const mt = valid.filter(t => t.mistakes.includes(m));
      const totalLoss = mt.filter(t => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0);
      const avgLoss = mt.length > 0 ? totalLoss / mt.length : 0;
      return { name: m, frequency: mt.length, totalLoss, avgLoss };
    }).sort((a, b) => a.totalLoss - b.totalLoss);
  }, [valid]);

  const totalMistakes = mistakeData.reduce((s, m) => s + m.frequency, 0);
  const totalMistakeLoss = mistakeData.reduce((s, m) => s + m.totalLoss, 0);
  const tradesWithMistakes = valid.filter(t => t.mistakes.length > 0);
  const distribution = mistakeData.filter(m => m.frequency > 0).map(m => ({ name: m.name, value: m.frequency }));

  // Normal loss avg vs mistake loss avg
  const normalLosses = valid.filter(t => t.profitLoss < 0 && t.mistakes.length === 0);
  const mistakeLosses = valid.filter(t => t.profitLoss < 0 && t.mistakes.length > 0);
  const avgNormalLoss = normalLosses.length > 0 ? normalLosses.reduce((s, t) => s + t.profitLoss, 0) / normalLosses.length : 0;
  const avgMistakeLoss = mistakeLosses.length > 0 ? mistakeLosses.reduce((s, t) => s + t.profitLoss, 0) / mistakeLosses.length : 0;

  // Mistake recovery rate (trades after mistake that are wins)
  const recoveryRate = useMemo(() => {
    let recoveries = 0, attempts = 0;
    const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].mistakes.length > 0) {
        attempts++;
        if (sorted[i + 1].result === 'Win') recoveries++;
      }
    }
    return attempts > 0 ? Math.round((recoveries / attempts) * 100) : 0;
  }, [valid]);

  // Mistake by session
  const mistakeBySession = useMemo(() => {
    const sessions: Session[] = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];
    return sessions.map(s => {
      const count = valid.filter(t => t.session === s && t.mistakes.length > 0).length;
      return { name: s, count };
    }).filter(s => s.count > 0);
  }, [valid]);

  // Mistake by setup
  const mistakeBySetup = useMemo(() => {
    const setupMap = new Map<string, number>();
    valid.filter(t => t.mistakes.length > 0).forEach(t => {
      setupMap.set(t.setup, (setupMap.get(t.setup) || 0) + t.mistakes.length);
    });
    return Array.from(setupMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [valid]);

  // Weekly trend
  const trendData = useMemo(() => {
    const weeks = new Map<string, number>();
    valid.forEach(t => {
      if (t.mistakes.length === 0) return;
      const d = new Date(t.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weeks.set(key, (weeks.get(key) || 0) + t.mistakes.length);
    });
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week: week.slice(5), count }));
  }, [valid]);

  // Smart insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    const topMistake = mistakeData.find(m => m.frequency > 0);
    if (topMistake && totalMistakeLoss !== 0) {
      const pct = Math.round((topMistake.totalLoss / totalMistakeLoss) * 100);
      msgs.push(`${topMistake.name} causes ${pct}% of your mistake losses`);
    }
    if (mistakeBySession.length > 0) {
      const worst = mistakeBySession.reduce((a, b) => b.count > a.count ? b : a);
      msgs.push(`Most mistakes happen in ${worst.name} session`);
    }
    if (avgMistakeLoss < avgNormalLoss) {
      msgs.push(`Mistake losses avg ${formatCurrency(avgMistakeLoss)} vs normal ${formatCurrency(avgNormalLoss)}`);
    }
    if (recoveryRate > 0) {
      msgs.push(`Recovery rate after mistakes: ${recoveryRate}%`);
    }
    return msgs;
  }, [mistakeData, mistakeBySession, avgMistakeLoss, avgNormalLoss, recoveryRate, totalMistakeLoss]);

  // Impact score (0-100)
  const impactScore = useMemo(() => {
    if (valid.length === 0) return 0;
    const totalLoss = valid.filter(t => t.profitLoss < 0).reduce((s, t) => s + Math.abs(t.profitLoss), 0);
    if (totalLoss === 0) return 0;
    return Math.min(100, Math.round((Math.abs(totalMistakeLoss) / totalLoss) * 100));
  }, [valid, totalMistakeLoss]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Mistakes" subtitle="Advanced behavioral analytics & mistake intelligence">
        <ThemeToggle />
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Mistakes" value={totalMistakes} trend="down" />
        <MetricCard label="Loss from Mistakes" value={formatCurrency(totalMistakeLoss)} trend="down" />
        <MetricCard label="Trades w/ Mistakes" value={`${tradesWithMistakes.length} / ${valid.length}`} />
        <MetricCard label="Most Common" value={mistakeData.find(m => m.frequency > 0)?.name || '-'} trend="down" />
      </div>

      {/* Impact & Recovery Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Impact Score" value={`${impactScore}/100`} subtitle="% of losses from mistakes" />
        <MetricCard label="Recovery Rate" value={`${recoveryRate}%`} subtitle="Win after mistake" trend={recoveryRate >= 50 ? 'up' : 'down'} />
        <MetricCard label="Avg Mistake Loss" value={formatCurrency(avgMistakeLoss)} trend="down" />
        <MetricCard label="Avg Normal Loss" value={formatCurrency(avgNormalLoss)} trend="down" />
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Smart Insights</h3>
          {insights.map((msg, i) => (
            <p key={i} className="text-xs text-foreground">💡 {msg}</p>
          ))}
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Mistake Frequency" tooltip="Bar chart showing how often each type of mistake occurs" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mistakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="frequency" name="Count" fill="hsl(var(--destructive) / 0.8)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Distribution" tooltip="Pie chart showing the proportion of each mistake type" />
          <div className="h-[240px]">
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} strokeWidth={0}>
                    {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No mistakes</div>}
          </div>
        </div>
      </div>

      {/* Charts Row 2: By Session & By Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Mistakes by Session" tooltip="Which trading session has the most mistakes" />
          <div className="h-[200px]">
            {mistakeBySession.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakeBySession}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" name="Mistakes" fill="hsl(var(--warning) / 0.8)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Mistakes by Setup" tooltip="Which trade setup type leads to the most mistakes" />
          <div className="h-[200px]">
            {mistakeBySetup.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakeBySetup} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" name="Mistakes" fill="hsl(var(--primary) / 0.8)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      {trendData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Mistake Trend (Weekly)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Mistakes" fill="hsl(var(--warning) / 0.8)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-primary">Mistake</th>
              <th className="px-4 py-3 text-xs font-medium text-primary font-mono">Frequency</th>
              <th className="px-4 py-3 text-xs font-medium text-primary font-mono">Total Loss</th>
              <th className="px-4 py-3 text-xs font-medium text-primary font-mono">Avg Loss</th>
              <th className="px-4 py-3 text-xs font-medium text-primary">Severity</th>
              <th className="px-4 py-3 text-xs font-medium text-primary">Impact</th>
            </tr>
          </thead>
          <tbody>
            {mistakeData.map(m => {
              const impactPct = totalMistakeLoss !== 0 ? Math.round((m.totalLoss / totalMistakeLoss) * 100) : 0;
              const sev = SEVERITY[m.name as Mistake];
              return (
                <tr key={m.name} className="border-b border-border/50 hover:bg-accent/50">
                  <td className="px-4 py-2.5 text-xs font-medium text-primary">{m.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{m.frequency}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-destructive">{formatCurrency(m.totalLoss)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-destructive">{formatCurrency(m.avgLoss)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('text-xs font-medium', sev?.color)}>{sev?.level}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${impactPct}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{impactPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
