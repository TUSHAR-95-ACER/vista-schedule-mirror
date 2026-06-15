import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertCircle, TrendingUp, AlertTriangle, Target, ShieldAlert, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

// djb2 hash of stringified payload — stable, deterministic, fast.
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload) || '';
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${str.length}:${(h >>> 0).toString(36)}`;
}

/**
 * AI Insights — always visible at the bottom of every page.
 * Cache-first: instantly displays stored insights from `ai_insights_cache`.
 * Only invokes the AI when the payload hash differs from the cached hash, or
 * when the user clicks Regenerate.
 */
export function AIInsightsPanel({ page, payload, title = 'AI Insights', className }: AIInsightsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastHashRef = useRef<string>('');
  const inFlightRef = useRef<string>('');

  const fetchOrGenerate = useCallback(async (force = false) => {
    if (!user?.id) return;
    const hash = hashPayload(payload);
    if (!force && hash === lastHashRef.current && insights) return;
    if (inFlightRef.current === hash && !force) return;
    inFlightRef.current = hash;

    setError(null);

    // 1) Try cache first — instant render, no spinner.
    if (!force) {
      const { data: cached } = await supabase
        .from('ai_insights_cache')
        .select('payload_hash, insights')
        .eq('user_id', user.id)
        .eq('page', page)
        .maybeSingle();
      if (cached && cached.payload_hash === hash && Array.isArray(cached.insights)) {
        setInsights(cached.insights as AIInsight[]);
        lastHashRef.current = hash;
        inFlightRef.current = '';
        return;
      }
    }

    // 2) Data changed (or forced) → call AI, then upsert cache.
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-insights', {
        body: { page, payload, payloadHash: hash },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list = (data as any)?.insights as AIInsight[] | undefined;
      const next = Array.isArray(list) ? list : [];
      setInsights(next);
      lastHashRef.current = hash;

      // Persist locally too (edge function also upserts server-side as fallback)
      await supabase
        .from('ai_insights_cache')
        .upsert(
          { user_id: user.id, page, payload_hash: hash, insights: next as any },
          { onConflict: 'user_id,page' },
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insights');
    } finally {
      setLoading(false);
      inFlightRef.current = '';
    }
  }, [user?.id, page, payload, insights]);

  // Re-check whenever the payload hash (data) changes. No regeneration on simple
  // remount — only when the underlying data actually changed.
  useEffect(() => {
    void fetchOrGenerate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, page, hashPayload(payload)]);

  const showInitialSpinner = loading && !insights;

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
            <p className="text-xs text-muted-foreground mt-0.5">Cached — refreshes only when your data changes. Use Regenerate to force.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fetchOrGenerate(true)} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? 'Refreshing…' : 'Regenerate'}
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
                  {showInitialSpinner && !body ? (
                    <div className="flex-1 flex items-center text-xs text-muted-foreground gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Generating once…
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
