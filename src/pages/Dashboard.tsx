import { useMemo } from 'react';
import { WeekdayChart } from '@/components/dashboard/WeekdayChart';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  ArrowDown,
} from 'lucide-react';
import { useTrading } from '@/contexts/TradingContext';
import { MetricCard, PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  calcWinRate,
  calcProfitFactor,
  calcExpectancy,
  calcMaxDrawdown,
  formatCurrency,
  formatPercent,
  calcAvgRR,
} from '@/lib/calculations';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { WinLossChart } from '@/components/dashboard/WinLossChart';
import { PerformanceByPairChart } from '@/components/dashboard/PerformanceByPairChart';
import { SessionChart } from '@/components/dashboard/SessionChart';
import { WeeklyPerformanceChart } from '@/components/dashboard/WeeklyPerformanceChart';
import { PerformanceByGradeChart } from '@/components/dashboard/PerformanceByGradeChart';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { RRDistributionChart } from '@/components/dashboard/RRDistributionChart';

export default function Dashboard() {
  const { trades } = useTrading();

  const validTrades = useMemo(
    () => trades.filter((trade) => trade.result !== 'Untriggered Setup' && trade.result !== 'Cancelled'),
    [trades]
  );

  const metrics = useMemo(
    () => ({
      total: trades.length,
      winRate: calcWinRate(trades),
      totalProfit: validTrades.reduce((sum, trade) => sum + trade.profitLoss, 0),
      profitFactor: calcProfitFactor(trades),
      expectancy: calcExpectancy(trades),
      maxDrawdown: calcMaxDrawdown(trades),
      avgRR: calcAvgRR(trades),
    }),
    [trades, validTrades]
  );


  const avgDuration = useMemo(() => {
    const tradesWithTimes = validTrades.filter((t) => t.entryTime && t.exitTime);
    if (tradesWithTimes.length === 0) return 'N/A';
    const totalMinutes = tradesWithTimes.reduce((sum, t) => {
      const entry = new Date(`${t.date}T${t.entryTime}`);
      const exit = new Date(`${t.date}T${t.exitTime}`);
      return sum + (exit.getTime() - entry.getTime()) / 60000;
    }, 0);
    const avg = totalMinutes / tradesWithTimes.length;
    if (avg < 60) return `${Math.round(avg)}m`;
    const h = Math.floor(avg / 60);
    const m = Math.round(avg % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, [validTrades]);

  return (
    <div className="p-3 sm:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Master Dashboard" subtitle="Trading operating system overview">
        <ThemeToggle />
        <div className="flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          LIVE
        </div>
      </PageHeader>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <MetricCard label="Total Trades" value={metrics.total} icon={BarChart3} />
        <MetricCard label="Win Rate" value={formatPercent(metrics.winRate)} icon={Target} trend={metrics.winRate >= 50 ? 'up' : 'down'} />
        <MetricCard label="Total P/L" value={formatCurrency(metrics.totalProfit)} icon={metrics.totalProfit >= 0 ? TrendingUp : TrendingDown} trend={metrics.totalProfit >= 0 ? 'up' : 'down'} />
        <MetricCard label="Profit Factor" value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)} icon={Activity} trend={metrics.profitFactor >= 1.5 ? 'up' : 'down'} />
        <MetricCard label="Expectancy" value={formatCurrency(metrics.expectancy)} trend={metrics.expectancy >= 0 ? 'up' : 'down'} />
        <MetricCard label="Max Drawdown" value={formatCurrency(metrics.maxDrawdown)} icon={ArrowDown} trend="down" />
        <MetricCard label="Avg Duration" value={avgDuration} icon={Activity} />
      </div>

      {/* RR Distribution Analytics */}
      <RRDistributionChart trades={trades} />

      {/* Equity Curve + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">Equity Curve</h3>
          <div className="h-[220px] sm:h-[280px]"><EquityCurveChart trades={trades} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">Win / Loss</h3>
          <div className="h-[220px] sm:h-[280px]"><WinLossChart trades={trades} /></div>
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-3 sm:mb-4"><DashboardCalendar trades={trades} /></div>

      {/* By Pair / Session / Week */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">By Pair</h3>
          <div className="h-[200px] sm:h-[240px]"><PerformanceByPairChart trades={trades} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">By Session</h3>
          <div className="h-[200px] sm:h-[240px]"><SessionChart trades={trades} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">By Week</h3>
          <div className="h-[200px] sm:h-[240px]"><WeeklyPerformanceChart trades={trades} /></div>
        </div>
      </div>

      {/* By Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">By Grade</h3>
          <PerformanceByGradeChart trades={trades} />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">By Day (P/L)</h3>
          <div className="h-[200px] sm:h-[240px]"><WeekdayChart trades={trades} /></div>
        </div>
      </div>
    </div>
  );
}