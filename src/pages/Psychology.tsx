import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-sm" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
};

export default function Psychology() {
  const { trades } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.psychology && t.result !== 'Missed' && t.result !== 'Cancelled'), [trades]);

  // Emotion breakdown
  const emotionData = useMemo(() => {
    const map = new Map<string, { pl: number; count: number; wins: number }>();
    valid.forEach(t => {
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
  }, [valid]);

  // Discipline/Focus trend over time
  const trendData = useMemo(() => {
    const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((t, i) => ({
      index: i + 1,
      date: t.date,
      discipline: t.psychology!.discipline,
      focus: t.psychology!.focus,
      pl: t.profitLoss,
    }));
  }, [valid]);

  // Checklist adherence radar
  const checklistData = useMemo(() => {
    if (valid.length === 0) return [];
    const keys = ['followPlan', 'noFomo', 'noRevenge', 'waitedConfirmation', 'riskRespected'];
    const labels: Record<string, string> = {
      followPlan: 'Follow Plan',
      noFomo: 'No FOMO',
      noRevenge: 'No Revenge',
      waitedConfirmation: 'Confirmation',
      riskRespected: 'Risk Respected',
    };
    return keys.map(key => {
      const trueCount = valid.filter(t => t.psychology!.checklist[key as keyof typeof t.psychology.checklist]).length;
      return {
        subject: labels[key],
        value: Math.round((trueCount / valid.length) * 100),
      };
    });
  }, [valid]);

  // Mistake frequency
  const mistakeData = useMemo(() => {
    const map = new Map<string, number>();
    valid.forEach(t => {
      t.mistakes.forEach(m => map.set(m, (map.get(m) || 0) + 1));
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [valid]);

  // Summary stats
  const stats = useMemo(() => {
    if (valid.length === 0) return null;
    const avgDiscipline = valid.reduce((s, t) => s + t.psychology!.discipline, 0) / valid.length;
    const avgFocus = valid.reduce((s, t) => s + t.psychology!.focus, 0) / valid.length;
    const highDisciplineTrades = valid.filter(t => t.psychology!.discipline >= 4);
    const highDiscWinRate = highDisciplineTrades.length > 0
      ? Math.round((highDisciplineTrades.filter(t => t.result === 'Win').length / highDisciplineTrades.length) * 100)
      : 0;
    const lowDisciplineTrades = valid.filter(t => t.psychology!.discipline <= 2);
    const lowDiscWinRate = lowDisciplineTrades.length > 0
      ? Math.round((lowDisciplineTrades.filter(t => t.result === 'Win').length / lowDisciplineTrades.length) * 100)
      : 0;
    const topEmotion = emotionData.sort((a, b) => b.winRate - a.winRate)[0];

    return {
      avgDiscipline: avgDiscipline.toFixed(1),
      avgFocus: avgFocus.toFixed(1),
      highDiscWinRate,
      lowDiscWinRate,
      totalMistakes: valid.reduce((s, t) => s + t.mistakes.length, 0),
      topEmotion: topEmotion?.name ?? '—',
      topEmotionWinRate: topEmotion?.winRate ?? 0,
    };
  }, [valid, emotionData]);

  if (valid.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Psychology" subtitle="Behavioral analysis">
          <ThemeToggle />
        </PageHeader>
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          No psychology data available. Log trades with psychology fields to see insights.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Psychology" subtitle="Behavioral analysis">
        <ThemeToggle />
      </PageHeader>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Avg Discipline', value: `${stats.avgDiscipline}/5`, tone: '' },
            { label: 'Avg Focus', value: `${stats.avgFocus}/5`, tone: '' },
            { label: 'High Discipline Win%', value: `${stats.highDiscWinRate}%`, tone: 'text-success' },
            { label: 'Low Discipline Win%', value: `${stats.lowDiscWinRate}%`, tone: 'text-destructive' },
            { label: 'Total Mistakes', value: stats.totalMistakes, tone: stats.totalMistakes > 10 ? 'text-destructive' : '' },
            { label: 'Best Emotion', value: stats.topEmotion, tone: 'text-success' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-xl font-bold', item.tone || 'text-foreground')}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Emotion vs P/L */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Emotion vs P/L</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,19%,27%)" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215,20%,65%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215,20%,65%)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pl" name="P/L" radius={[4, 4, 0, 0]} opacity={0.8}>
                  {emotionData.map((e, i) => (
                    <Cell key={i} fill={e.pl >= 0 ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Checklist Adherence Radar */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Checklist Adherence</h3>
          <div className="h-[220px]">
            {checklistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={checklistData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(217,19%,27%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'hsl(215,20%,65%)' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'hsl(215,20%,65%)' }} />
                  <Radar name="Adherence %" dataKey="value" stroke="hsl(210,100%,50%)" fill="hsl(210,100%,50%)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Discipline + Focus Trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Discipline & Focus Trend</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210,100%,50%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(210,100%,50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,19%,27%)" opacity={0.3} />
                <XAxis dataKey="index" tick={{ fontSize: 10, fill: 'hsl(215,20%,65%)' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(215,20%,65%)' }} />
                <Tooltip content={<CustomTooltip />} />
                 <Area type="monotone" dataKey="discipline" name="Discipline" stroke="hsl(210,100%,50%)" fill="url(#discGrad)" strokeWidth={2} opacity={0.8} baseValue="dataMin" />
                 <Area type="monotone" dataKey="focus" name="Focus" stroke="hsl(142,71%,45%)" fill="url(#focusGrad)" strokeWidth={2} opacity={0.8} baseValue="dataMin" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mistake Frequency */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Mistake Frequency</h3>
          {mistakeData.length > 0 ? (
            <div className="space-y-3">
              {mistakeData.map(m => {
                const pct = valid.length > 0 ? Math.round((m.count / valid.length) * 100) : 0;
                return (
                  <div key={m.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{m.count}</Badge>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-destructive/70 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No mistakes recorded 🎉</div>
          )}
        </div>
      </div>

      {/* Emotion Win Rate Table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Emotion Performance Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Emotion</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Trades</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Win Rate</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Total P/L</th>
              </tr>
            </thead>
            <tbody>
              {emotionData.map(row => (
                <tr key={row.name} className="border-b border-border/50">
                  <td className="px-3 py-2 text-xs font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-xs text-center text-muted-foreground">{row.count}</td>
                  <td className="px-3 py-2 text-xs text-center">
                    <span className={row.winRate >= 50 ? 'text-success' : 'text-destructive'}>{row.winRate}%</span>
                  </td>
                  <td className={cn('px-3 py-2 text-xs text-right font-mono', row.pl >= 0 ? 'text-success' : 'text-destructive')}>
                    {row.pl >= 0 ? '+' : ''}{row.pl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
