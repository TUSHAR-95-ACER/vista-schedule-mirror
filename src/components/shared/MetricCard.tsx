import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

/** Format large numbers compactly: 10000 → 10K, 1000000 → 1M */
export function formatCompactNumber(value: string | number): string {
  if (typeof value === 'string') {
    // Try to parse currency strings like "$10,000.00" or "-$5,000.00"
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return value;
    const prefix = value.startsWith('-') || value.includes('-$') ? '-' : '';
    const currency = value.includes('$') ? '$' : '';
    const percent = value.includes('%') ? '%' : '';
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return `${prefix}${currency}${(abs / 1_000_000).toFixed(1)}M${percent}`;
    if (abs >= 10_000) return `${prefix}${currency}${(abs / 1_000).toFixed(1)}K${percent}`;
    return value;
  }
  return String(value);
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  tooltip?: string;
}

export function MetricCard({ label, value, icon: Icon, subtitle, trend, className, tooltip }: MetricCardProps) {
  const displayValue = formatCompactNumber(value);

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-3 sm:p-4 animate-fade-in overflow-hidden",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 ml-1" />}
      </div>
      <div className={cn(
        "font-heading font-bold tracking-tight break-words overflow-wrap-anywhere",
        "text-lg sm:text-xl lg:text-2xl",
        trend === 'up' && 'text-success',
        trend === 'down' && 'text-destructive',
      )}>
        <span className="hidden sm:inline">{value}</span>
        <span className="sm:hidden">{displayValue}</span>
      </div>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-[0.12em]">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
