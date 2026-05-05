/**
 * Page-data adapters for the shared AIInsightsPanel.
 * Each adapter normalizes raw page state into a lean JSON payload suitable for Gemini.
 * Keep payloads small (< 8KB) and meaningful — no UI/state cruft.
 */
import type { Trade, WeeklyPlan, DailyPlan } from '@/types/trading';

const N = (n: number | undefined, d = 2) => (typeof n === 'number' && isFinite(n) ? Number(n.toFixed(d)) : null);

export function adaptTrades(trades: Trade[]) {
  const recent = trades.slice(0, 60);
  const byPair: Record<string, { n: number; wins: number; pnl: number }> = {};
  const bySession: Record<string, { n: number; wins: number; pnl: number }> = {};
  const bySetup: Record<string, { n: number; wins: number; pnl: number }> = {};
  let wins = 0, losses = 0, totalPnl = 0, rrSum = 0, rrN = 0;
  for (const t of recent) {
    if (t.result === 'Win') wins++;
    else if (t.result === 'Loss') losses++;
    totalPnl += t.profitLoss || 0;
    if (typeof t.actualRR === 'number') { rrSum += t.actualRR; rrN++; }
    const p = byPair[t.asset] ||= { n: 0, wins: 0, pnl: 0 };
    p.n++; if (t.result === 'Win') p.wins++; p.pnl += t.profitLoss || 0;
    const s = bySession[t.session as string] ||= { n: 0, wins: 0, pnl: 0 };
    s.n++; if (t.result === 'Win') s.wins++; s.pnl += t.profitLoss || 0;
    if (t.setup) {
      const su = bySetup[t.setup] ||= { n: 0, wins: 0, pnl: 0 };
      su.n++; if (t.result === 'Win') su.wins++; su.pnl += t.profitLoss || 0;
    }
  }
  return {
    total_trades: recent.length,
    wins, losses,
    win_rate_pct: wins + losses ? N((wins / (wins + losses)) * 100, 1) : null,
    total_pnl: N(totalPnl),
    avg_rr: rrN ? N(rrSum / rrN) : null,
    by_pair: Object.entries(byPair).map(([k, v]) => ({ pair: k, trades: v.n, win_rate: N((v.wins / v.n) * 100, 1), pnl: N(v.pnl) })),
    by_session: Object.entries(bySession).map(([k, v]) => ({ session: k, trades: v.n, win_rate: N((v.wins / v.n) * 100, 1), pnl: N(v.pnl) })),
    top_setups: Object.entries(bySetup).map(([k, v]) => ({ setup: k, trades: v.n, win_rate: N((v.wins / v.n) * 100, 1), pnl: N(v.pnl) })).sort((a, b) => (b.trades || 0) - (a.trades || 0)).slice(0, 8),
    recent_mistakes: recent.slice(0, 20).flatMap(t => Array.isArray(t.mistakes) ? t.mistakes : []).slice(0, 20),
  };
}

export function adaptWeeklyPlan(plan: WeeklyPlan | null) {
  if (!plan) return { empty: true };
  return {
    week_start: plan.weekStart,
    bias: plan.bias,
    goals: (plan.goals || '').slice(0, 400),
    risk: (plan.risk || '').slice(0, 200),
    levels: (plan.levels || '').slice(0, 400),
    pairs: (plan.pairAnalyses || []).map(p => ({
      pair: p.pair, predicted: p.bias, actual: p.actualBias || null,
      narrative: (p.narrative || '').slice(0, 200),
    })),
    observation_text: (plan.observation?.text || '').slice(0, 600),
    calendar_result_text: (plan.calendarResult?.text || '').slice(0, 600),
  };
}

export function adaptDailyPlan(plan: DailyPlan | null, dayTrades: Trade[]) {
  if (!plan) return { empty: true };
  return {
    date: plan.date,
    daily_bias: plan.dailyBias,
    session_focus: plan.sessionFocus,
    max_trades: plan.maxTrades,
    risk_limit: plan.riskLimit,
    took_trades: plan.tookTrades ?? null,
    pairs: (plan.pairs || []).map(p => ({
      pair: p.pair, predicted: p.bias, actual: p.actualBias || null,
      narrative: (p.narrative || '').slice(0, 200),
    })),
    day_summary: (plan.daySummary?.text || plan.resultNarrative || '').slice(0, 500),
    notes: (plan.notesJournal?.text || plan.note || '').slice(0, 500),
    actual_trades: dayTrades.slice(0, 10).map(t => ({
      pair: t.asset, dir: t.direction, result: t.result, pnl: N(t.profitLoss), rr: N(t.actualRR),
    })),
  };
}

export function adaptNotebook(entries: Array<{ category?: string; pair?: string; date?: string; title?: string; content?: string }>) {
  return {
    total_entries: entries.length,
    categories: Object.entries(
      entries.reduce<Record<string, number>>((a, e) => { const k = e.category || 'Uncategorized'; a[k] = (a[k] || 0) + 1; return a; }, {})
    ).map(([category, count]) => ({ category, count })),
    pairs: Object.entries(
      entries.reduce<Record<string, number>>((a, e) => { if (!e.pair) return a; a[e.pair] = (a[e.pair] || 0) + 1; return a; }, {})
    ).map(([pair, count]) => ({ pair, count })),
    recent: entries.slice(0, 12).map(e => ({
      title: (e.title || '').slice(0, 80),
      category: e.category, pair: e.pair, date: e.date,
      excerpt: (e.content || '').slice(0, 180),
    })),
  };
}

export function adaptPsychology(trades: Trade[]) {
  const emotions: Record<string, number> = {};
  const mistakes: Record<string, number> = {};
  for (const t of trades.slice(0, 80)) {
    const psy: any = (t as any).psychology;
    if (psy?.emotion) emotions[psy.emotion] = (emotions[psy.emotion] || 0) + 1;
    if (Array.isArray(t.mistakes)) for (const m of t.mistakes) mistakes[m] = (mistakes[m] || 0) + 1;
  }
  return {
    sample_size: Math.min(trades.length, 80),
    emotion_distribution: Object.entries(emotions).map(([k, v]) => ({ emotion: k, count: v })),
    mistake_distribution: Object.entries(mistakes).map(([k, v]) => ({ mistake: k, count: v })),
  };
}
