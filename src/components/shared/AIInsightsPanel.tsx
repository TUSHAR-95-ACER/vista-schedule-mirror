import { useCallback, useState } from 'react';
import { ChevronDown, Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AIInsight {
  title: string;
  body?: string;
  description?: string; // legacy
  severity?: 'info' | 'good' | 'warn' | 'critical';
}

interface AIInsightsPanelProps {
  page: string;
  payload: Record<string, unknown>;
  title?: string;
  className?: string;
}

const sevAccent: Record<string, string> = {
  good: 'before:bg-success',
  warn: 'before:bg-warning',
  critical: 'before:bg-destructive',
  info: 'before:bg-primary',
};

export function AIInsightsPanel({ page, payload, title = 'Mentor Review', className }: AIInsightsPanelProps) {
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
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className={cn('rounded-2xl border border-border bg-card overflow-hidden', className)}
    >
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-heading font-semibold text-foreground tracking-tight">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">A mentor-style read of your journal — paragraph by paragraph.</p>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-5 sm:px-7 pb-7 pt-2 space-y-5 border-t border-border/40">
          <div className="flex items-center justify-between pt-3">
            <p className="text-xs text-muted-foreground">
              {insights?.length ? `${insights.length} observations` : 'On-demand mentor review'}
            </p>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? 'Reviewing…' : 'Regenerate'}
            </Button>
          </div>

          {loading && !insights && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading your journal…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-foreground/80 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Mentor review unavailable</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{error} The rest of your dashboard is still fully functional — try again in a moment.</p>
              </div>
            </div>
          )}

          {insights && insights.length === 0 && !loading && !error && (
            <p className="text-sm text-muted-foreground italic">Not enough data to review yet — log a few more trades or journal entries.</p>
          )}

          {insights && insights.length > 0 && (
            <div className="flex flex-col gap-7 max-w-3xl">
              {insights.map((ins, i) => {
                const sev = ins.severity || 'info';
                const body = ins.body || ins.description || '';
                return (
                  <article
                    key={i}
                    className={cn(
                      'relative pl-5 animate-in fade-in slide-in-from-bottom-2 duration-500',
                      'before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full',
                      sevAccent[sev],
                    )}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                  >
                    <h4 className="text-lg font-heading font-semibold text-foreground tracking-tight leading-snug mb-2.5">
                      {ins.title}
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/85 leading-[1.75] [&_p]:my-2 [&_strong]:text-foreground [&_strong]:font-semibold">
                      <ReactMarkdown>{body}</ReactMarkdown>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
