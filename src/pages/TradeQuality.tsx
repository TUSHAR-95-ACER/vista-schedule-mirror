import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency, calcAvgRR } from '@/lib/calculations';
import { Trade } from '@/types/trading';
import { Lightbulb } from 'lucide-react';

const COLORS = ['hsl(142,71%,45%)', 'hsl(210,100%,50%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)'];

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

function calcExecutionScore(t: Trade): number {
  let score = 50;
  if (t.psychology?.checklist?.followPlan) score += 10;
  if (t.psychology?.checklist?.riskRespected) score += 10;
  if (t.psychology?.checklist?.waitedConfirmation) score += 10;
  if (t.psychology?.checklist?.noFomo) score += 10;
  if (t.psychology?.checklist?.noRevenge) score += 10;
  return Math.min(100, score);
}

export default function TradeQuality() {
  const { trades } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled'), [trades]);

  const gradeData = useMemo(() => {
    const grades = ['A+', 'A', 'B', 'C'];
    return grades.map(grade => {
      const gt = valid.filter(t => t.grade === grade);
      const wins = gt.filter(t => t.result === 'Win').length;
      const winRate = gt.length ? Math.round((wins / gt.length) * 100) : 0;
      const avgPL = gt.length ? gt.reduce((s, t) => s + t.profitLoss, 0) / gt.length : 0;
      const totalPL = gt.reduce((s, t) => s + t.profitLoss, 0);
      const avgRR = calcAvgRR(gt);
      const avgExec = gt.length ? Math.round(gt.reduce((s, t) => s + calcExecutionScore(t), 0) / gt.length) : 0;
      return { grade, count: gt.length, winRate, avgPL: Math.round(avgPL * 100) / 100, totalPL, avgRR, avgExec };
    });
  }, [valid]);

  const holdQuality = useMemo(() => {
    const withExit = valid.filter(t => t.exitPrice && t.result === 'Win');
    if (withExit.length === 0) return 0;
    const held = withExit.filter(t => {
      const tpDist = Math.abs(t.takeProfit - t.entryPrice);
      const exitDist = Math.abs((t.exitPrice || t.entryPrice) - t.entryPrice);
      return exitDist >= tpDist * 0.7;
    });
    return Math.round((held.length / withExit.length) * 100);
  }, [valid]);

  const entryPrecision = useMemo(() => {
    if (valid.length === 0) return 0;
    const precise = valid.filter(t => {
      const actualMove = t.direction === 'Long'
        ? (t.exitPrice || t.entryPrice) - t.entryPrice
        : t.entryPrice - (t.exitPrice || t.entryPrice);
      return actualMove > 0;
    });
    return Math.round((precise.length / valid.length) * 100);
  }, [valid]);

  // Exit discipline: % of winning trades that reached at least 80% of TP
  const exitDiscipline = useMemo(() => {
    const wins = valid.filter(t => t.result === 'Win' && t.exitPrice);
    if (wins.length === 0) return 0;
    const disciplined = wins.filter(t => {
      const tpDist = Math.abs(t.takeProfit - t.entryPrice);
      const exitDist = Math.abs((t.exitPrice! - t.entryPrice));
      return exitDist >= tpDist * 0.8;
    });
    return Math.round((disciplined.length / wins.length) * 100);
  }, [valid]);

  // RR discipline: % of trades where actual RR >= planned RR
  const rrDiscipline = useMemo(() => {
    const withRR = valid.filter(t => t.actualRR !== undefined && t.plannedRR > 0);
    if (withRR.length === 0) return 0;
    const disciplined = withRR.filter(t => (t.actualRR || 0) >= t.plannedRR * 0.8);
    return Math.round((disciplined.length / withRR.length) * 100);
  }, [valid]);

  const avgExecScore = valid.length ? Math.round(valid.reduce((s, t) => s + calcExecutionScore(t), 0) / valid.length) : 0;

  // Execution Score vs Profit scatter data
  const execVsProfit = useMemo(() => {
    return valid.map(t => ({
      exec: calcExecutionScore(t),
      pl: t.profitLoss,
      size: Math.abs(t.profitLoss) + 10,
    }));
  }, [valid]);

  // Insights
  const insights = useMemo(() => {
    const result: string[] = [];
    const aPlus = gradeData.find(g => g.grade === 'A+');
    const c = gradeData.find(g => g.grade === 'C');
    if (aPlus && c && aPlus.count > 0 && c.count > 0) {
      if (aPlus.totalPL > 0 && c.totalPL < 0) {
        result.push(`Your A+ trades are profitable (${formatCurrency(aPlus.totalPL)}) but C trades destroy gains (${formatCurrency(c.totalPL)}). Focus on quality setups.`);
      }
    }
    if (holdQuality < 50) result.push(`Hold quality is only ${holdQuality}%. You're closing winning trades too early.`);
    if (exitDiscipline < 50) result.push(`Exit discipline is ${exitDiscipline}%. Work on letting winners reach target.`);
    if (avgExecScore >= 80) result.push(`Execution score of ${avgExecScore}/100 shows strong discipline. Keep it up.`);
    return result;
  }, [gradeData, holdQuality, exitDiscipline, avgExecScore]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Trade Quality" subtitle="Quality scoring & execution analysis">
        <ThemeToggle />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Avg Execution Score" value={`${avgExecScore}/100`} trend={avgExecScore >= 70 ? 'up' : 'down'} />
        <MetricCard label="Entry Precision" value={`${entryPrecision}%`} trend={entryPrecision >= 50 ? 'up' : 'down'} />
        <MetricCard label="Hold Quality" value={`${holdQuality}%`} subtitle="Held to TP" trend={holdQuality >= 60 ? 'up' : 'down'} />
        <MetricCard label="Exit Discipline" value={`${exitDiscipline}%`} subtitle="Reached 80% TP" trend={exitDiscipline >= 60 ? 'up' : 'down'} />
        <MetricCard label="RR Discipline" value={`${rrDiscipline}%`} subtitle="Actual ≥ Planned" trend={rrDiscipline >= 50 ? 'up' : 'down'} />
        <MetricCard label="Total Graded" value={valid.length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Grade vs Profit</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="totalPL" name="Total P/L" radius={[4, 4, 0, 0]} opacity={0.8}>
                  {gradeData.map((d, i) => <Cell key={i} fill={d.totalPL >= 0 ? 'hsl(142 71% 45%)' : 'hsl(0 84% 60%)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Execution Score vs Profit</h3>
          <div className="h-[240px]">
            {execVsProfit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="exec" name="Exec Score" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="pl" name="P/L" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <ZAxis dataKey="size" range={[20, 200]} />
                  <Tooltip content={<Tip />} />
                  <Scatter data={execVsProfit} fill="hsl(210 80% 55%)" opacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quality Insights</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => <p key={i} className="text-sm text-foreground/80">{insight}</p>)}
          </div>
        </div>
      )}

      {/* Grade Details Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Grade</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Trades</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Win Rate</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Avg RR</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Avg P/L</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Total P/L</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground font-mono">Exec Score</th>
            </tr>
          </thead>
          <tbody>
            {gradeData.map((g, i) => (
              <tr key={g.grade} className="border-b border-border/50 hover:bg-accent/50">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm" style={{ backgroundColor: COLORS[i] + '22', color: COLORS[i] }}>{g.grade}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{g.count}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{g.winRate}%</td>
                <td className="px-4 py-2.5 font-mono text-xs">{g.avgRR}</td>
                <td className={cn('px-4 py-2.5 font-mono text-xs', g.avgPL >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(g.avgPL)}</td>
                <td className={cn('px-4 py-2.5 font-mono text-xs', g.totalPL >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(g.totalPL)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{g.avgExec}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
