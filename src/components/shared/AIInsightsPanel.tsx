import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertCircle, TrendingUp, AlertTriangle, Target, ShieldAlert, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AIInsight {
  title: string;
  body?: string;
  description?: string;
  severity?: 'info' | 'good' | 'warn' | 'critical';
}

interface AIInsightsProps {
  page: string;
  payload: Record<string, unknown>;
  title?: string;
  className?: string;
}

const CATEGORIES = ['Strength', 'Weakness', 'Opportunity', 'Warning', 'Recommendation'] as const;

const ICONS: Record<string, any> = {
  Strength: TrendingUp,
  Weakness: AlertTriangle,
  Opportunity: Target,
  Warning: ShieldAlert,
  Recommendation: Lightbulb,
};

const ACCENT: Record<string, { ring: string; chip: string; icon: string }> = {
  Strength:       { ring: 'border-success/30 bg-success/[0.04]',         chip: 'bg-success/10 text-success border-success/30',         icon: 'text-success' },
  Weakness:       { ring: 'border-warning/30 bg-warning/[0.04]',         chip: 'bg-warning/10 text-warning border-warning/30',         icon: 'text-warning' },
  Opportunity:    { ring: 'border-primary/30 bg-primary/[0.04]',         chip: 'bg-primary/10 text-primary border-primary/30',         icon: 'text-primary' },
  Warning:        { ring: 'border-destructive/30 bg-destructive/[0.04]', chip: 'bg-destructive/10 text-destructive border-destructive/30', icon: 'text-destructive' },
  Recommendation: { ring: 'border-gold/35 bg-gold/[0.05]',               chip: 'bg-gold/10 text-gold border-gold/30',                  icon: 'text-gold' },
};

/**
 * AI Insights — always visible at the bottom of every page.
 * Auto-loads on mount, returns exactly 5 categorized insights from the page's data.
 * Replaces the old "Page Intelligence" / Mentor Review panels.
 */
export function AIInsightsPanel({ page, payload, title = 'AI Insights', className }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastKeyRef = useRef<string>('');

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

  // Auto-load once per (page + payload fingerprint). No button press required.
  useEffect(() => {
    const key = page + '::' + JSON.stringify(payload).slice(0, 4000);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, JSON.stringify(payload).slice(0, 4000)]);

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold/30 bg-[linear-gradient(135deg,hsl(var(--gold)/0.06),hsl(var(--card))_55%)] overflow-hidden shadow-[0_0_0_1px_hsl(var(--gold)/0.06)_inset]',
        className,
      )}
      aria-label="AI Insights"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gold/10 text-gold border border-gold/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-generated from this page's data — Strength, Weakness, Opportunity, Warning, Recommendation.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? 'Reviewing…' : 'Regenerate'}
        </Button>
      </div>

      <div className="p-5">
        {error && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
            <div>
              <p className="font-medium text-foreground">AI Insights unavailable</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{error}. Try again in a moment — the rest of the page is unaffected.</p>
            </div>
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {CATEGORIES.map((cat, i) => {
              const ins = insights?.find((x) => x.title === cat);
              const body = ins?.body || ins?.description;
              const Icon = ICONS[cat];
              const a = ACCENT[cat];
              return (
                <div
                  key={cat}
                  className={cn(
                    'relative rounded-xl border p-3.5 min-h-[120px] flex flex-col gap-2',
                    a.ring,
                    'animate-in fade-in slide-in-from-bottom-1 duration-300',
                  )}
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-7 w-7 rounded-lg border flex items-center justify-center', a.chip)}>
                      <Icon className={cn('h-3.5 w-3.5', a.icon)} />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">{cat}</span>
                  </div>
                  {loading && !body ? (
                    <div className="flex-1 flex items-center text-xs text-muted-foreground gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Reading data…
                    </div>
                  ) : (
                    <p className="text-sm leading-snug text-foreground/90">
                      {body || 'Not enough data yet for this page.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
