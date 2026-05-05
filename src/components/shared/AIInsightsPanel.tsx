import { useCallback, useState } from 'react';
import { ChevronDown, Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AIInsight {
  title: string;
  description: string;
  severity?: 'info' | 'good' | 'warn' | 'critical';
}

interface AIInsightsPanelProps {
  /** Page identifier sent to the model. */
  page: string;
  /** Structured page data — kept lean and meaningful. */
  payload: Record<string, unknown>;
  /** Optional title override. */
  title?: string;
  className?: string;
}

const sevStyles: Record<string, string> = {
  good: 'border-l-success bg-success/5',
  warn: 'border-l-warning bg-warning/5',
  critical: 'border-l-destructive bg-destructive/5',
  info: 'border-l-primary bg-primary/5',
};
const sevLabel: Record<string, string> = {
  good: 'Edge', warn: 'Leak', critical: 'Risk', info: 'Insight',
};
const sevTagStyle: Record<string, string> = {
  good: 'bg-success/10 text-success',
  warn: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
};

export function AIInsightsPanel({ page, payload, title = 'AI Insights', className }: AIInsightsPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-insights', {
        body: { page, payload },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list = (data as any)?.insights as AIInsight[] | undefined;
      setInsights(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [page, payload]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && insights === null && !loading) generate();
  };

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className={cn('rounded-2xl border border-border bg-card overflow-hidden', className)}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</h3>
              <p className="text-[10px] text-muted-foreground">Gemini-powered page intelligence</p>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-border/40">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{insights?.length ? `${insights.length} insights` : 'On-demand analysis'}</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {loading ? 'Analyzing…' : 'Regenerate'}
            </Button>
          </div>

          {loading && !insights && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating insights…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {insights && insights.length === 0 && !loading && !error && (
            <p className="text-xs text-muted-foreground italic">Not enough data to generate insights yet.</p>
          )}

          {insights && insights.length > 0 && (
            <div className="grid gap-2.5">
              {insights.map((ins, i) => {
                const sev = ins.severity || 'info';
                return (
                  <div key={i} className={cn('rounded-xl border border-border border-l-[3px] p-3.5', sevStyles[sev])}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-bold text-foreground">{ins.title}</h4>
                      <span className={cn('text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full', sevTagStyle[sev])}>
                        {sevLabel[sev]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
