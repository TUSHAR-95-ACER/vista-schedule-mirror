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