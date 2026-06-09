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
import { ChartHeader } from '@/components/shared/InfoTooltip';

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
import { PerformanceByPairChart } from '@/components/dashboard/PerformanceByPairChart';
import { SessionChart } from '@/components/dashboard/SessionChart';
import { WeeklyPerformanceChart } from '@/components/dashboard/WeeklyPerformanceChart';
import { PerformanceByGradeChart } from '@/components/dashboard/PerformanceByGradeChart';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';


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
    <div className="px-3 sm:px-4 py-3 w-full">
      <PageHeader title="Master Dashboard" subtitle="Trading operating system overview" />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <MetricCard label="Total Trades" value={metrics.total} icon={BarChart3} tooltip="Total number of trades you have logged in the journal" />
        <MetricCard label="Win Rate" value={formatPercent(metrics.winRate)} icon={Target} trend={metrics.winRate >= 50 ? 'up' : 'down'} emphasis={metrics.winRate >= 60 ? 'gold' : undefined} tooltip="Percentage of trades that ended in profit (wins ÷ total trades)" />
        <MetricCard label="Total P/L" value={formatCurrency(metrics.totalProfit)} icon={metrics.totalProfit >= 0 ? TrendingUp : TrendingDown} trend={metrics.totalProfit >= 0 ? 'up' : 'down'} tooltip="Sum of all profits and losses from your trades" />
        <MetricCard label="Profit Factor" value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)} icon={Activity} trend={metrics.profitFactor >= 1.5 ? 'up' : 'down'} emphasis={metrics.profitFactor >= 1.5 ? 'gold' : undefined} tooltip="Gross profit ÷ gross loss. Above 1.5 is strong, below 1.0 means losing money" />
        <MetricCard label="Expectancy" value={formatCurrency(metrics.expectancy)} trend={metrics.expectancy >= 0 ? 'up' : 'down'} tooltip="Average amount you can expect to win or lose per trade over time" />
        <MetricCard label="Max Drawdown" value={formatCurrency(metrics.maxDrawdown)} icon={ArrowDown} trend="down" tooltip="Largest peak-to-trough decline in your account equity" />
        <MetricCard label="Avg Duration" value={avgDuration} icon={Activity} tooltip="Average time you hold a trade from entry to exit" />

      </div>


      {/* Equity Curve (70%) + Performance Summary (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="Equity Curve" tooltip="Shows how your total account value has changed over time based on cumulative P/L" />
          <div className="h-[260px] sm:h-[340px]"><EquityCurveChart trades={trades} /></div>
        </div>
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col">
          <ChartHeader title="Performance Summary" tooltip="Key performance metrics derived from your logged trades" />
          {(() => {
            const wins = validTrades.filter(t => t.result === 'Win').length;
            const losses = validTrades.filter(t => t.result === 'Loss').length;
            const rows: { label: string; value: string; tone?: 'up' | 'down' }[] = [
              { label: 'Win Rate', value: formatPercent(metrics.winRate), tone: metrics.winRate >= 50 ? 'up' : 'down' },
              { label: 'Wins', value: String(wins), tone: 'up' },
              { label: 'Losses', value: String(losses), tone: 'down' },
              { label: 'Average RR', value: metrics.avgRR ? metrics.avgRR.toFixed(2) : '—' },
              { label: 'Profit Factor', value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2), tone: metrics.profitFactor >= 1.5 ? 'up' : 'down' },
            ];
            return (
              <div className="flex-1 flex flex-col justify-between divide-y divide-border/60 mt-2">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{r.label}</span>
                    <span className={`font-heading text-lg font-bold tabular-nums ${r.tone === 'up' ? 'text-success' : r.tone === 'down' ? 'text-destructive' : 'text-foreground'}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-3 sm:mb-4"><DashboardCalendar trades={trades} /></div>

      {/* By Pair / Session / Week */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="By Pair" tooltip="P/L breakdown by each trading pair to see which instruments work best for you" />
          <div className="h-[200px] sm:h-[240px]"><PerformanceByPairChart trades={trades} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="By Session" tooltip="Performance grouped by trading session (London, NY, etc.)" />
          <div className="h-[200px] sm:h-[240px]"><SessionChart trades={trades} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="By Week" tooltip="Weekly P/L to track consistency across calendar weeks (matches calendar row layout)" />
          <div className="h-[200px] sm:h-[240px]"><WeeklyPerformanceChart trades={trades} month={new Date().getMonth()} year={new Date().getFullYear()} /></div>
        </div>
      </div>

      {/* By Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="By Grade" tooltip="Performance grouped by the quality grade you assigned to each trade" />
          <PerformanceByGradeChart trades={trades} />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <ChartHeader title="By Day (P/L)" tooltip="P/L broken down by day of the week to find your best trading days" />
          <div className="h-[200px] sm:h-[240px]"><WeekdayChart trades={trades} /></div>
        </div>
      </div>
    </div>
  );
}