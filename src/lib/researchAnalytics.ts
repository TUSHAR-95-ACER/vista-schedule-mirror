import { ResearchTest, Strategy, ResearchMarketCondition } from '@/types/research';

export interface ConditionStat { key: ResearchMarketCondition; wins: number; losses: number; total: number; winRate: number }

export function conditionStats(tests: ResearchTest[]): ConditionStat[] {
  const keys: ResearchMarketCondition[] = ['Trending', 'Volatile', 'Sideways'];
  return keys.map((key) => {
    const subset = tests.filter((t) => t.marketCondition === key && (t.result === 'Win' || t.result === 'Loss'));
    const wins = subset.filter((t) => t.result === 'Win').length;
    const losses = subset.filter((t) => t.result === 'Loss').length;
    const total = wins + losses;
    return { key, wins, losses, total, winRate: total ? (wins / total) * 100 : 0 };
  });
}


export interface StrategyKPIs {
  totalTests: number;
  wins: number;
  losses: number;
  scratches: number;
  winRate: number;        // 0-100
  avgRR: number;
  biasAccuracy: number;   // 0-100
  bestSession: string;
  bestPair: string;
  aGradePct: number;
  validationScore: number; // 0-100 composite
}

function pct(n: number, d: number) { return d > 0 ? (n / d) * 100 : 0; }

export function computeKPIs(tests: ResearchTest[]): StrategyKPIs {
  const decisive = tests.filter((t) => t.result === 'Win' || t.result === 'Loss');
  const wins = tests.filter((t) => t.result === 'Win').length;
  const losses = tests.filter((t) => t.result === 'Loss').length;
  const scratches = tests.filter((t) => t.result === 'Scratch').length;
  const winRate = pct(wins, decisive.length);

  const rrVals = tests.map((t) => parseFloat(t.rAchieved)).filter((v) => !Number.isNaN(v));
  const avgRR = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 0;

  const biasJudged = tests.filter((t) => t.predictedBias && t.actualBias);
  const biasHits = biasJudged.filter((t) => t.predictedBias === t.actualBias).length;
  const biasAccuracy = pct(biasHits, biasJudged.length);

  const bySession = winRateByKey(tests, (t) => t.session || '');
  const byPair = winRateByKey(tests, (t) => t.pair || '');
  const bestSession = topKey(bySession);
  const bestPair = topKey(byPair);

  const graded = tests.filter((t) => t.grade);
  const aGradePct = pct(graded.filter((t) => t.grade === 'A').length, graded.length);

  // Composite: 40% winrate + 30% bias accuracy + 20% A-grade + 10% sample size scaling
  const sampleFactor = Math.min(1, tests.length / 30) * 100;
  const validationScore = Math.round(
    winRate * 0.4 + biasAccuracy * 0.3 + aGradePct * 0.2 + sampleFactor * 0.1,
  );

  return {
    totalTests: tests.length,
    wins,
    losses,
    scratches,
    winRate,
    avgRR,
    biasAccuracy,
    bestSession,
    bestPair,
    aGradePct,
    validationScore,
  };
}

export interface BucketStat { key: string; wins: number; losses: number; total: number; winRate: number }

export function winRateByKey(tests: ResearchTest[], keyFn: (t: ResearchTest) => string): BucketStat[] {
  const map = new Map<string, { wins: number; losses: number; total: number }>();
  tests.forEach((t) => {
    const k = keyFn(t);
    if (!k) return;
    const cur = map.get(k) || { wins: 0, losses: 0, total: 0 };
    if (t.result === 'Win') cur.wins += 1;
    if (t.result === 'Loss') cur.losses += 1;
    if (t.result === 'Win' || t.result === 'Loss') cur.total += 1;
    map.set(k, cur);
  });
  return Array.from(map.entries()).map(([key, v]) => ({
    key, ...v, winRate: v.total ? (v.wins / v.total) * 100 : 0,
  }));
}

function topKey(stats: BucketStat[]): string {
  const sig = stats.filter((s) => s.total >= 2);
  if (!sig.length) return '—';
  return sig.sort((a, b) => b.winRate - a.winRate)[0].key;
}

export function gradeDistribution(tests: ResearchTest[]) {
  const g = { A: 0, B: 0, C: 0 };
  tests.forEach((t) => { if (t.grade) g[t.grade] += 1; });
  return [
    { key: 'A', count: g.A },
    { key: 'B', count: g.B },
    { key: 'C', count: g.C },
  ];
}

export function emotionDistribution(tests: ResearchTest[]) {
  const map = new Map<string, number>();
  tests.forEach((t) => { if (t.emotionalState) map.set(t.emotionalState, (map.get(t.emotionalState) || 0) + 1); });
  return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
}

export function biasAccuracySplit(tests: ResearchTest[]) {
  const judged = tests.filter((t) => t.predictedBias && t.actualBias);
  const hits = judged.filter((t) => t.predictedBias === t.actualBias).length;
  return [
    { key: 'Correct', count: hits },
    { key: 'Wrong', count: judged.length - hits },
  ];
}

export function summarizeStrategy(s: Strategy): StrategyKPIs {
  return computeKPIs(s.tests);
}

// ===================== Strategy Testing terminal analytics =====================

const rr = (t: ResearchTest) => {
  const v = parseFloat(t.rAchieved);
  if (!Number.isNaN(v)) return v;
  if (t.result === 'Win') return 1;
  if (t.result === 'Loss') return -1;
  return 0;
};

const chrono = (tests: ResearchTest[]) =>
  tests.filter((t) => t.result).slice().sort((a, b) => a.date.localeCompare(b.date));

export interface EquityPoint { i: number; date: string; equity: number; drawdown: number }

export function equityCurve(tests: ResearchTest[]): EquityPoint[] {
  let eq = 0, peak = 0;
  return chrono(tests).map((t, i) => {
    eq += rr(t);
    peak = Math.max(peak, eq);
    return { i: i + 1, date: t.date, equity: Number(eq.toFixed(2)), drawdown: Number((eq - peak).toFixed(2)) };
  });
}

export interface RiskMetrics {
  netR: number; expectancy: number; profitFactor: number; avgWin: number; avgLoss: number;
  maxDrawdown: number; maxWinStreak: number; maxLossStreak: number; sharpe: number;
  bestTrade: number; worstTrade: number;
}

export function riskMetrics(tests: ResearchTest[]): RiskMetrics {
  const seq = chrono(tests);
  const rs = seq.map(rr);
  const wins = rs.filter((v) => v > 0);
  const losses = rs.filter((v) => v < 0);
  const sum = rs.reduce((a, b) => a + b, 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const mean = rs.length ? sum / rs.length : 0;
  const sd = rs.length > 1
    ? Math.sqrt(rs.reduce((a, b) => a + (b - mean) ** 2, 0) / (rs.length - 1))
    : 0;
  const curve = equityCurve(tests);
  const maxDrawdown = curve.length ? Math.min(...curve.map((p) => p.drawdown)) : 0;
  let ws = 0, ls = 0, maxWinStreak = 0, maxLossStreak = 0;
  seq.forEach((t) => {
    if (t.result === 'Win') { ws += 1; ls = 0; } else if (t.result === 'Loss') { ls += 1; ws = 0; }
    maxWinStreak = Math.max(maxWinStreak, ws);
    maxLossStreak = Math.max(maxLossStreak, ls);
  });
  return {
    netR: Number(sum.toFixed(2)),
    expectancy: Number(mean.toFixed(2)),
    profitFactor: grossLoss ? Number((grossWin / grossLoss).toFixed(2)) : grossWin ? Infinity : 0,
    avgWin: wins.length ? Number((grossWin / wins.length).toFixed(2)) : 0,
    avgLoss: losses.length ? Number((-grossLoss / losses.length).toFixed(2)) : 0,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxWinStreak, maxLossStreak,
    sharpe: sd ? Number((mean / sd).toFixed(2)) : 0,
    bestTrade: rs.length ? Number(Math.max(...rs).toFixed(2)) : 0,
    worstTrade: rs.length ? Number(Math.min(...rs).toFixed(2)) : 0,
  };
}

export function returnDistribution(tests: ResearchTest[]) {
  const buckets = [
    { key: '≤ -2R', min: -Infinity, max: -2 },
    { key: '-2 to -1R', min: -2, max: -1 },
    { key: '-1 to 0R', min: -1, max: 0 },
    { key: '0 to 1R', min: 0, max: 1 },
    { key: '1 to 2R', min: 1, max: 2 },
    { key: '2 to 3R', min: 2, max: 3 },
    { key: '> 3R', min: 3, max: Infinity },
  ];
  const rs = chrono(tests).map(rr);
  return buckets.map((b) => ({
    key: b.key,
    count: rs.filter((v) => v > b.min && v <= b.max).length,
    positive: b.min >= 0,
  }));
}

export function tradeQuality(tests: ResearchTest[]) {
  const g = gradeDistribution(tests);
  const ungraded = tests.filter((t) => !t.grade).length;
  return [...g, { key: 'Ungraded', count: ungraded }].filter((x) => x.count > 0);
}

export interface ExecutionMetric { key: string; pct: number }

export function executionQuality(tests: ResearchTest[]): ExecutionMetric[] {
  const n = tests.length || 1;
  const has = (fn: (t: ResearchTest) => boolean) => (tests.filter(fn).length / n) * 100;
  const kpi = computeKPIs(tests);
  return [
    { key: 'Plan Documented', pct: has((t) => !!t.narrative?.trim()) },
    { key: 'Entry Defined', pct: has((t) => !!t.entryPrice?.trim() && !!t.stopLoss?.trim()) },
    { key: 'Target Defined', pct: has((t) => !!t.tp1?.trim()) },
    { key: 'Reviewed', pct: has((t) => !!(t.reflectionWentWell || t.reflectionToImprove || t.reflectionNotes)?.trim?.()) },
    { key: 'Graded A/B', pct: has((t) => t.grade === 'A' || t.grade === 'B') },
    { key: 'Bias Accuracy', pct: kpi.biasAccuracy },
  ].map((m) => ({ ...m, pct: Math.round(m.pct) }));
}

export type InsightTone = 'positive' | 'negative' | 'warning' | 'neutral';
export interface StrategyInsight { tone: InsightTone; title: string; detail: string }

export function keyInsights(tests: ResearchTest[]): StrategyInsight[] {
  const kpi = computeKPIs(tests);
  const m = riskMetrics(tests);
  const out: StrategyInsight[] = [];
  if (!tests.length) return [{ tone: 'neutral', title: 'No data yet', detail: 'Log your first test to unlock edge analytics.' }];

  out.push(kpi.winRate >= 55
    ? { tone: 'positive', title: `Win rate ${kpi.winRate.toFixed(1)}%`, detail: 'Above the 55% institutional threshold on decisive tests.' }
    : { tone: kpi.winRate >= 45 ? 'warning' : 'negative', title: `Win rate ${kpi.winRate.toFixed(1)}%`, detail: 'Tighten entry filters or widen targets to lift expectancy.' });

  out.push(m.expectancy > 0
    ? { tone: 'positive', title: `Expectancy +${m.expectancy}R`, detail: `Net ${m.netR}R across ${tests.length} tests.` }
    : { tone: 'negative', title: `Expectancy ${m.expectancy}R`, detail: 'Average test is losing — do not promote yet.' });

  const sess = winRateByKey(tests, (t) => t.session || '').filter((s) => s.total >= 2).sort((a, b) => b.winRate - a.winRate);
  if (sess.length) out.push({ tone: 'positive', title: `${sess[0].key} is strongest`, detail: `${sess[0].winRate.toFixed(0)}% win rate over ${sess[0].total} decisive tests.` });
  if (sess.length > 1) {
    const worst = sess[sess.length - 1];
    out.push({ tone: 'warning', title: `${worst.key} underperforms`, detail: `${worst.winRate.toFixed(0)}% win rate — consider excluding this session.` });
  }
  if (m.maxLossStreak >= 3) out.push({ tone: 'negative', title: `${m.maxLossStreak} loss streak`, detail: 'Drawdown clustering — review risk sizing rules.' });
  if (kpi.biasAccuracy && kpi.biasAccuracy < 50) out.push({ tone: 'warning', title: `Bias accuracy ${kpi.biasAccuracy.toFixed(0)}%`, detail: 'HTF read is coin-flip; refine narrative process.' });
  return out.slice(0, 6);
}

export interface ValidationCheck { key: string; label: string; done: boolean; progress: number; target: string }

export function validationProgress(tests: ResearchTest[]): ValidationCheck[] {
  const kpi = computeKPIs(tests);
  const m = riskMetrics(tests);
  const graded = tests.filter((t) => t.grade).length;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return [
    { key: 'sample', label: 'Sample Size', done: tests.length >= 30, progress: clamp((tests.length / 30) * 100), target: `${tests.length}/30 tests` },
    { key: 'winrate', label: 'Win Rate ≥ 50%', done: kpi.winRate >= 50, progress: clamp((kpi.winRate / 50) * 100), target: `${kpi.winRate.toFixed(1)}%` },
    { key: 'expectancy', label: 'Positive Expectancy', done: m.expectancy > 0, progress: clamp(((m.expectancy + 0.5) / 1) * 100), target: `${m.expectancy}R` },
    { key: 'pf', label: 'Profit Factor ≥ 1.5', done: m.profitFactor >= 1.5, progress: clamp((m.profitFactor / 1.5) * 100), target: Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : '∞' },
    { key: 'bias', label: 'Bias Accuracy ≥ 60%', done: kpi.biasAccuracy >= 60, progress: clamp((kpi.biasAccuracy / 60) * 100), target: `${kpi.biasAccuracy.toFixed(0)}%` },
    { key: 'graded', label: 'All Tests Graded', done: !!tests.length && graded === tests.length, progress: clamp((graded / (tests.length || 1)) * 100), target: `${graded}/${tests.length}` },
  ];
}

export function nextSteps(tests: ResearchTest[]): string[] {
  const checks = validationProgress(tests);
  const open = checks.filter((c) => !c.done);
  if (!open.length) return ['All validation gates cleared — promote this strategy to your playbook.'];
  return open.slice(0, 4).map((c) => {
    switch (c.key) {
      case 'sample': return `Log ${Math.max(0, 30 - tests.length)} more tests to reach a statistically usable sample.`;
      case 'winrate': return 'Raise win rate above 50% by tightening entry confirmation criteria.';
      case 'expectancy': return 'Improve expectancy — extend winners or cut premature exits.';
      case 'pf': return 'Lift profit factor to 1.5 by reducing full-stop losses.';
      case 'bias': return 'Sharpen HTF bias process to reach 60% directional accuracy.';
      default: return 'Grade every remaining test to complete process scoring.';
    }
  });
}

export function edgeSummary(tests: ResearchTest[]) {
  const kpi = computeKPIs(tests);
  const m = riskMetrics(tests);
  const verdict = kpi.validationScore >= 75 ? 'Validated Edge'
    : kpi.validationScore >= 55 ? 'Promising Edge'
    : kpi.validationScore >= 35 ? 'Needs More Data' : 'No Edge Yet';
  return { verdict, score: kpi.validationScore, kpi, metrics: m };
}
