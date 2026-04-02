import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { RRDistributionChart } from '@/components/dashboard/RRDistributionChart';

export default function SystemAnalytics() {
  const { trades } = useTrading();

  return (
    <div className="p-3 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="System Analytics" subtitle="RR behavior distribution & trade system metrics">
        <ThemeToggle />
      </PageHeader>

      <RRDistributionChart trades={trades} />
    </div>
  );
}
