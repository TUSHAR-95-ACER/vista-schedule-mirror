import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Strategy } from '@/types/research';
import { loadStrategies } from '@/lib/researchStorage';
import { computeKPIs } from '@/lib/researchAnalytics';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function ResearchAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    if (!user) return;
    setStrategies(loadStrategies(user.id));
  }, [user]);

  const rows = useMemo(() => strategies.map((s) => {
    const k = computeKPIs(s.tests);
    const days = new Set(s.tests.map((t) => t.date).filter(Boolean)).size;
    return { strategy: s, kpi: k, days };
  }), [strategies]);

  const active = rows.filter((r) => r.strategy.status !== 'Archived');
  const archived = rows.filter((r) => r.strategy.status === 'Archived');

  const mostTested = [...rows].sort((a, b) => b.kpi.totalTests - a.kpi.totalTests)[0];
  const ranked = [...active].filter((r) => r.kpi.totalTests >= 1).sort((a, b) => b.kpi.winRate - a.kpi.winRate);
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];
  const promotionCandidates = active.filter((r) => r.kpi.validationScore >= 60 && r.kpi.totalTests >= 10);
  const retireCandidates = active.filter((r) => r.kpi.totalTests >= 10 && r.kpi.winRate < 35);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    strategies.forEach((s) => s.tests.forEach((t) => {
      if (!t.date) return;
      const m = t.date.slice(0, 7);
      map.set(m, (map.get(m) || 0) + 1);
    }));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
  }, [strategies]);

  const rankChart = ranked.slice(0, 12).map((r) => ({ key: r.strategy.name, winRate: Math.round(r.kpi.winRate) }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Research Lab Analytics"
        subtitle="Strategy performance, validation progress and promotion candidates. Independent from Journal Analytics."
      >
        <Button variant="outline" size="sm" onClick={() => navigate('/research-lab')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Research Lab
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Strategies" value={rows.length} />
        <MetricCard label="Active" value={active.length} />
        <MetricCard label="Archived" value={archived.length} />
        <MetricCard label="Most Tested" value={mostTested?.strategy.name || '—'} />
        <MetricCard label="Highest Win Rate" value={highest ? `${highest.strategy.name} · ${highest.kpi.winRate.toFixed(0)}%` : '—'} trend="up" />
        <MetricCard label="Lowest Win Rate" value={lowest && lowest !== highest ? `${lowest.strategy.name} · ${lowest.kpi.winRate.toFixed(0)}%` : '—'} trend="down" />
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Strategy Performance Ranking</h3>
        {rankChart.length === 0 ? (
          <p className="text-sm text-muted-foreground">No strategies with tests yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rankChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Strategy Comparison Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-3">Strategy</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-left py-2 pr-3">Template</th>
                <th className="text-right py-2 pr-3">Tests</th>
                <th className="text-right py-2 pr-3">Days</th>
                <th className="text-right py-2 pr-3">Win %</th>
                <th className="text-right py-2 pr-3">Avg RR</th>
                <th className="text-right py-2 pr-3">Bias %</th>
                <th className="text-right py-2 pr-3">A %</th>
                <th className="text-right py-2 pr-3">Validation</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.strategy.id} className="border-b border-border/60 hover:bg-accent/40 cursor-pointer"
                  onClick={() => navigate(`/research-lab/${r.strategy.id}`)}>
                  <td className="py-2 pr-3 font-medium">{r.strategy.icon} {r.strategy.name}</td>
                  <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{r.strategy.status}</Badge></td>
                  <td className="py-2 pr-3 uppercase text-xs text-muted-foreground">{r.strategy.template || 'blank'}</td>
                  <td className="py-2 pr-3 text-right">{r.kpi.totalTests}</td>
                  <td className="py-2 pr-3 text-right">{r.days}</td>
                  <td className="py-2 pr-3 text-right">{r.kpi.winRate ? `${r.kpi.winRate.toFixed(0)}%` : '—'}</td>
                  <td className="py-2 pr-3 text-right">{r.kpi.avgRR ? r.kpi.avgRR.toFixed(2) : '—'}</td>
                  <td className="py-2 pr-3 text-right">{r.kpi.biasAccuracy ? `${r.kpi.biasAccuracy.toFixed(0)}%` : '—'}</td>
                  <td className="py-2 pr-3 text-right">{r.kpi.aGradePct ? `${r.kpi.aGradePct.toFixed(0)}%` : '—'}</td>
                  <td className="py-2 pr-3 text-right font-mono">{r.kpi.validationScore}/100</td>
                  <td className="py-2 text-right">
                    {r.kpi.validationScore >= 60 && r.kpi.totalTests >= 10
                      ? <Badge className="bg-emerald-600 text-white">Promote</Badge>
                      : r.kpi.totalTests >= 10 && r.kpi.winRate < 35
                        ? <Badge variant="destructive">Retire</Badge>
                        : <Badge variant="secondary">Keep testing</Badge>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="py-6 text-center text-muted-foreground text-xs">No strategies yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-heading font-semibold mb-3">Promotion Candidates</h3>
          {promotionCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet. Need ≥10 tests and ≥60 validation score.</p>
          ) : (
            <ul className="space-y-2">
              {promotionCandidates.map((r) => (
                <li key={r.strategy.id} className="flex items-center justify-between text-sm">
                  <span>{r.strategy.icon} {r.strategy.name}</span>
                  <span className="font-mono text-xs text-emerald-600">{r.kpi.validationScore}/100</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-heading font-semibold mb-3">Strategies to Retire</h3>
          {retireCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">None. Underperformers need ≥10 tests and &lt;35% win rate.</p>
          ) : (
            <ul className="space-y-2">
              {retireCandidates.map((r) => (
                <li key={r.strategy.id} className="flex items-center justify-between text-sm">
                  <span>{r.strategy.icon} {r.strategy.name}</span>
                  <span className="font-mono text-xs text-destructive">{r.kpi.winRate.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Monthly Testing Activity</h3>
        {monthly.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tests logged yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
