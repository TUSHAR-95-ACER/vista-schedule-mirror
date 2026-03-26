import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PlanListItemProps {
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: ReactNode;
  accentColor?: string;
}

export function PlanListItem({ onClick, title, subtitle, meta, icon, accentColor }: PlanListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-border/50 bg-card px-5 py-4',
        'hover:border-primary/30 hover:shadow-[var(--shadow-elevated)] transition-all duration-200',
        'group relative overflow-hidden'
      )}
    >
      {/* Subtle left accent */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity')} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <span className="text-sm font-semibold text-foreground block">{title}</span>
            {subtitle && <span className="text-xs text-muted-foreground mt-0.5 block">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="text-[11px] font-mono font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
              {meta}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}
