import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateInsights } from '@/lib/insightEngine';

interface AIInsightsProps {
  page: string;
  payload: Record<string, unknown>;
  title?: string;
  className?: string;
  /** Optional pre-computed insights. If provided, used as-is. */
  insights?: string[];
}

/**
 * Offline Insight Panel — dynamic, ranked, page-aware.
 * Calls the detector-based engine in src/lib/insightEngine.ts.
 * No AI calls, no network, no fixed templates — every observation must be evidenced
 * by data the page already has.
 */
export function AIInsightsPanel({ page, payload, title = 'Insights', className, insights }: AIInsightsProps) {
  const lines = useMemo(() => {
    if (insights && insights.length) return insights.slice(0, 10);
    return generateInsights(page, payload as Record<string, any>);
  }, [page, payload, insights]);

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold/25 bg-[linear-gradient(135deg,hsl(var(--gold)/0.04),hsl(var(--card))_60%)] overflow-hidden',
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40">
        <div className="h-7 w-7 rounded-lg bg-gold/10 text-gold border border-gold/30 flex items-center justify-center">
          <Lightbulb className="h-3.5 w-3.5" />
        </div>
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="p-5">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data yet to generate insights.</p>
        ) : (
          <ol className="space-y-2.5">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-3 text-sm leading-snug text-foreground/90">
                <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 pt-0.5">{i + 1}</span>
                <span className="flex-1">{line}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 pt-3 border-t border-border/30 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          Derived directly from logged journal data · no AI required
        </p>
      </div>
    </section>
  );
}


/* ============================================================
   Insight generator — pure functions over adapter payloads.
   Shapes come from src/lib/aiInsightAdapters.ts.
============================================================ */

type AnyRec = Record<string, any>;

function pct(n: any): string {
  return typeof n === 'number' && isFinite(n) ? `${n.toFixed(0)}%` : '—';
}

function num(n: any, d = 2): string {
  return typeof n === 'number' && isFinite(n) ? n.toFixed(d) : '—';
}

function topBy(arr: any, key: string, min = 3): AnyRec | null {
  if (!Array.isArray(arr) || !arr.length) return null;
  const filtered = arr.filter((x: AnyRec) => (x.trades ?? x.count ?? 0) >= min);
  const pool = filtered.length ? filtered : arr;
  return [...pool].sort((a: AnyRec, b: AnyRec) => (Number(b[key]) || 0) - (Number(a[key]) || 0))[0] || null;
}

function bottomBy(arr: any, key: string, min = 3): AnyRec | null {
  if (!Array.isArray(arr) || !arr.length) return null;
  const filtered = arr.filter((x: AnyRec) => (x.trades ?? x.count ?? 0) >= min);
  const pool = filtered.length ? filtered : arr;
  return [...pool].sort((a: AnyRec, b: AnyRec) => (Number(a[key]) || 0) - (Number(b[key]) || 0))[0] || null;
}

export function deriveInsights(page: string, payload: AnyRec): string[] {
  const out: string[] = [];
  if (!payload || payload.empty) {
    return ['Add data on this page to generate insights.'];
  }

  // ---- Trades-shaped payload (Dashboard, Trades, Analytics, TradeQuality, Behavior) ----
  if (typeof payload.total_trades === 'number') {
    const wr = payload.win_rate_pct;
    if (payload.total_trades > 0 && typeof wr === 'number') {
      if (wr >= 55) out.push(`Strong win rate of ${pct(wr)} across the last ${payload.total_trades} trades.`);
      else if (wr >= 45) out.push(`Win rate is ${pct(wr)} across ${payload.total_trades} trades — close to break-even territory.`);
      else if (payload.total_trades >= 5) out.push(`Win rate of ${pct(wr)} across ${payload.total_trades} trades — review setup quality.`);
    }
    if (typeof payload.total_pnl === 'number') {
      if (payload.total_pnl > 0) out.push(`Net PnL positive at ${num(payload.total_pnl)} over the sample.`);
      else if (payload.total_pnl < 0) out.push(`Net PnL negative (${num(payload.total_pnl)}) — protect capital before scaling.`);
    }
    if (typeof payload.avg_rr === 'number') {
      if (payload.avg_rr >= 2) out.push(`Average RR of ${num(payload.avg_rr)} — letting winners run.`);
      else if (payload.avg_rr > 0 && payload.avg_rr < 1) out.push(`Average RR is only ${num(payload.avg_rr)} — winners are being cut early.`);
    }
    const bestPair = topBy(payload.by_pair, 'win_rate');
    const worstPair = bottomBy(payload.by_pair, 'win_rate');
    if (bestPair && (bestPair.win_rate ?? 0) >= 55) {
      out.push(`Strongest performance on ${bestPair.pair} (${pct(bestPair.win_rate)} win rate, ${bestPair.trades} trades).`);
    }
    if (worstPair && bestPair && worstPair.pair !== bestPair.pair && (worstPair.win_rate ?? 100) < 40) {
      out.push(`${worstPair.pair} is underperforming at ${pct(worstPair.win_rate)} — consider sizing down or skipping.`);
    }
    const bestSession = topBy(payload.by_session, 'win_rate');
    if (bestSession && (bestSession.win_rate ?? 0) >= 55) {
      out.push(`Your edge is sharpest in the ${bestSession.session} session (${pct(bestSession.win_rate)} win rate).`);
    }
    const bestSetup = topBy(payload.top_setups, 'win_rate', 3);
    if (bestSetup && (bestSetup.win_rate ?? 0) >= 55) {
      out.push(`Highest-conviction setup: ${bestSetup.setup} at ${pct(bestSetup.win_rate)} over ${bestSetup.trades} trades.`);
    }
    if (Array.isArray(payload.recent_mistakes) && payload.recent_mistakes.length) {
      const counts: Record<string, number> = {};
      for (const m of payload.recent_mistakes) counts[m] = (counts[m] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) out.push(`Most frequent recent leak: "${top[0]}" (${top[1]}x) — make it a checklist item.`);
    }
  }

  // ---- Psychology / Behavior payload ----
  if (Array.isArray(payload.emotion_distribution) && payload.emotion_distribution.length) {
    const top = [...payload.emotion_distribution].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    if (top) out.push(`Dominant emotional state logged: ${top.emotion} (${top.count} entries).`);
  }
  if (Array.isArray(payload.mistake_distribution) && payload.mistake_distribution.length) {
    const top = [...payload.mistake_distribution].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    if (top && top.count >= 2 && !out.some((x) => x.includes(top.mistake))) {
      out.push(`Repeat mistake to address: ${top.mistake} (${top.count}x).`);
    }
  }

  // ---- Plan payloads (Daily / Weekly) ----
  if (Array.isArray(payload.pairs) && payload.pairs.length) {
    const directional = payload.pairs.filter((p: AnyRec) => p.predicted === 'Bullish' || p.predicted === 'Bearish');
    const resolved = directional.filter((p: AnyRec) => p.actual === 'Bullish' || p.actual === 'Bearish');
    if (resolved.length) {
      const hits = resolved.filter((p: AnyRec) => p.actual === p.predicted).length;
      const acc = (hits / resolved.length) * 100;
      out.push(`Plan directional accuracy: ${pct(acc)} (${hits}/${resolved.length} calls correct).`);
    }
    const standAside = payload.pairs.filter((p: AnyRec) => p.predicted === 'Neutral' || p.predicted === 'Sideways').length;
    if (standAside) out.push(`${standAside} stand-aside call(s) logged — discipline counts toward edge.`);
    if (directional.length && !resolved.length) {
      out.push(`Log the actual direction for each pair to grade today's bias.`);
    }
  }
  if (Array.isArray(payload.actual_trades) && payload.actual_trades.length) {
    const wins = payload.actual_trades.filter((t: AnyRec) => t.result === 'Win').length;
    out.push(`${wins}/${payload.actual_trades.length} trades closed as wins on this plan.`);
  }

  // ---- Notebook payload ----
  if (typeof payload.total_entries === 'number') {
    out.push(`Notebook holds ${payload.total_entries} entries — review tagged categories weekly.`);
    const topCat = topBy(payload.categories, 'count', 1);
    if (topCat) out.push(`Most-used category: ${topCat.category} (${topCat.count}).`);
    const topPair = topBy(payload.pairs as AnyRec[], 'count', 1);
    if (topPair) out.push(`Most-studied pair in notebook: ${topPair.pair} (${topPair.count} entries).`);
  }

  // ---- Macro Intelligence fallback ----
  if (page.toLowerCase().includes('macro') && out.length === 0) {
    if (payload.usd_bias) out.push(`Current USD bias: ${payload.usd_bias}.`);
    if (payload.gold_bias) out.push(`Current Gold bias: ${payload.gold_bias}.`);
    if (payload.fed_bias) out.push(`Current Fed lean: ${payload.fed_bias}.`);
  }

  if (!out.length) out.push('Not enough data yet — add more trades and plans to surface insights.');
  return out;
}
