import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className={`h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help shrink-0 ${className || ''}`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Reusable chart section header with gold accent bar + optional info tooltip */
export function ChartHeader({ title, tooltip }: { title: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      <span aria-hidden className="inline-block h-3.5 w-[3px] rounded-sm bg-gradient-to-b from-gold via-gold/70 to-primary/60 shadow-[0_0_8px_hsl(var(--gold)/0.55)]" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {tooltip && <InfoTooltip text={tooltip} />}
    </div>
  );
}
