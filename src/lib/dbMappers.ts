import { Trade, TradingAccount, Transaction, ScaleEvent, WeeklyPlan, DailyPlan, TradeJourneyStep } from '@/types/trading';

// Trade: app <-> DB mapping
export function tradeToDb(t: Trade, userId: string) {
  return {
    id: t.id, user_id: userId, date: t.date, entry_time: t.entryTime || null,
    exit_time: t.exitTime || null, market: t.market, asset: t.asset,
    direction: t.direction, session: t.session, market_condition: t.marketCondition,
    setup: t.setup, quantity: t.quantity, entry_price: t.entryPrice,
    stop_loss: t.stopLoss, take_profit: t.takeProfit, exit_price: t.exitPrice ?? null,
    result: t.result, planned_rr: t.plannedRR, actual_rr: t.actualRR ?? null,
    max_rr_reached: t.maxRRReached ?? null, max_adverse_move: t.maxAdverseMove ?? null,
    pips: t.pips ?? null, profit_loss: t.profitLoss, fees: t.fees ?? null,
    notes: t.notes, accounts: JSON.stringify(t.accounts),
    management: JSON.stringify(t.management), confluences: JSON.stringify(t.confluences),
    entry_confluences: t.entryConfluences ? JSON.stringify(t.entryConfluences) : null,
    target_confluences: t.targetConfluences ? JSON.stringify(t.targetConfluences) : null,
    chart_link: t.chartLink || null, prediction_image: t.predictionImage || null,
    execution_image: t.executionImage || null,
    psychology: t.psychology ? JSON.stringify(t.psychology) : null,
    mistakes: JSON.stringify(t.mistakes), grade: t.grade || null,
    timeframe: t.timeframe || null,
    trend: t.trend || null,
    trade_journey: t.tradeJourney ? JSON.stringify(t.tradeJourney) : null,
    day_tags: t.dayTags ? JSON.stringify(t.dayTags) : '[]',
  };
}

export function dbToTrade(row: any): Trade {
  return {
    id: row.id, date: row.date, entryTime: row.entry_time || undefined,
    exitTime: row.exit_time || undefined, market: row.market, asset: row.asset,
    direction: row.direction, session: row.session, marketCondition: row.market_condition,
    setup: row.setup, quantity: Number(row.quantity), entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss), takeProfit: Number(row.take_profit),
    exitPrice: row.exit_price != null ? Number(row.exit_price) : undefined,
    result: row.result, plannedRR: Number(row.planned_rr),
    actualRR: row.actual_rr != null ? Number(row.actual_rr) : undefined,
    maxRRReached: row.max_rr_reached != null ? Number(row.max_rr_reached) : undefined,
    maxAdverseMove: row.max_adverse_move != null ? Number(row.max_adverse_move) : undefined,
    pips: row.pips != null ? Number(row.pips) : undefined,
    profitLoss: Number(row.profit_loss), fees: row.fees != null ? Number(row.fees) : undefined,
    notes: row.notes || '', accounts: typeof row.accounts === 'string' ? JSON.parse(row.accounts) : (row.accounts || []),
    management: typeof row.management === 'string' ? JSON.parse(row.management) : (row.management || []),
    confluences: typeof row.confluences === 'string' ? JSON.parse(row.confluences) : (row.confluences || []),
    entryConfluences: row.entry_confluences ? (typeof row.entry_confluences === 'string' ? JSON.parse(row.entry_confluences) : row.entry_confluences) : undefined,
    targetConfluences: row.target_confluences ? (typeof row.target_confluences === 'string' ? JSON.parse(row.target_confluences) : row.target_confluences) : undefined,
    chartLink: row.chart_link || undefined, predictionImage: row.prediction_image || undefined,
    executionImage: row.execution_image || undefined,
    psychology: row.psychology ? (typeof row.psychology === 'string' ? JSON.parse(row.psychology) : row.psychology) : undefined,
    mistakes: typeof row.mistakes === 'string' ? JSON.parse(row.mistakes) : (row.mistakes || []),
    grade: row.grade || undefined,
    timeframe: row.timeframe || undefined,
    trend: row.trend || undefined,
    tradeJourney: row.trade_journey ? (typeof row.trade_journey === 'string' ? JSON.parse(row.trade_journey) : row.trade_journey) : undefined,
  };
}

// TradingAccount: app <-> DB
export function accountToDb(a: TradingAccount, userId: string) {
  return {
    id: a.id, user_id: userId, name: a.name, broker: a.broker, type: a.type,
    starting_balance: a.startingBalance, current_size: a.currentSize,
    initial_size: a.initialSize, currency: a.currency, stage: a.stage || null,
    target_balance: a.targetBalance ?? null, status: a.status || null,
    phase1_target: a.phase1Target ?? null, phase2_target: a.phase2Target ?? null,
    phase3_target: a.phase3Target ?? null, phase1_target_percent: a.phase1TargetPercent ?? null,
    phase2_target_percent: a.phase2TargetPercent ?? null, phase3_target_percent: a.phase3TargetPercent ?? null,
    max_drawdown_limit: a.maxDrawdownLimit ?? null, daily_drawdown_limit: a.dailyDrawdownLimit ?? null,
    target_percent: a.targetPercent ?? null, daily_drawdown_percent: a.dailyDrawdownPercent ?? null,
    max_drawdown_percent: a.maxDrawdownPercent ?? null, steps: a.steps ?? null,
    payouts: JSON.stringify(a.payouts || []),
    created_at: a.createdAt,
  };
}

export function dbToAccount(row: any): TradingAccount {
  return {
    id: row.id, name: row.name, broker: row.broker, type: row.type,
    startingBalance: Number(row.starting_balance), currentSize: Number(row.current_size),
    initialSize: Number(row.initial_size), currency: row.currency,
    stage: row.stage || undefined, targetBalance: row.target_balance != null ? Number(row.target_balance) : undefined,
    createdAt: row.created_at, status: row.status || undefined,
    phase1Target: row.phase1_target != null ? Number(row.phase1_target) : undefined,
    phase2Target: row.phase2_target != null ? Number(row.phase2_target) : undefined,
    phase3Target: row.phase3_target != null ? Number(row.phase3_target) : undefined,
    phase1TargetPercent: row.phase1_target_percent != null ? Number(row.phase1_target_percent) : undefined,
    phase2TargetPercent: row.phase2_target_percent != null ? Number(row.phase2_target_percent) : undefined,
    phase3TargetPercent: row.phase3_target_percent != null ? Number(row.phase3_target_percent) : undefined,
    maxDrawdownLimit: row.max_drawdown_limit != null ? Number(row.max_drawdown_limit) : undefined,
    dailyDrawdownLimit: row.daily_drawdown_limit != null ? Number(row.daily_drawdown_limit) : undefined,
    targetPercent: row.target_percent != null ? Number(row.target_percent) : undefined,
    dailyDrawdownPercent: row.daily_drawdown_percent != null ? Number(row.daily_drawdown_percent) : undefined,
    maxDrawdownPercent: row.max_drawdown_percent != null ? Number(row.max_drawdown_percent) : undefined,
    steps: row.steps || undefined,
    payouts: typeof row.payouts === 'string' ? JSON.parse(row.payouts) : (row.payouts || []),
  };
}

// Transaction
export function txToDb(t: Transaction, userId: string) {
  return { id: t.id, user_id: userId, date: t.date, account_id: t.accountId, type: t.type, amount: t.amount, note: t.note };
}
export function dbToTx(row: any): Transaction {
  return { id: row.id, date: row.date, accountId: row.account_id, type: row.type, amount: Number(row.amount), note: row.note || '' };
}

// ScaleEvent
export function scaleToDb(s: ScaleEvent, userId: string) {
  return { id: s.id, user_id: userId, account_id: s.accountId, date: s.date, old_size: s.oldSize, new_size: s.newSize, note: s.note || null };
}
export function dbToScale(row: any): ScaleEvent {
  return { id: row.id, accountId: row.account_id, date: row.date, oldSize: Number(row.old_size), newSize: Number(row.new_size), note: row.note || undefined };
}

// WeeklyPlan
export function weeklyPlanToDb(p: WeeklyPlan, userId: string) {
  return {
    id: p.id, user_id: userId, week_start: p.weekStart, bias: p.bias,
    markets: JSON.stringify(p.markets), setups: JSON.stringify(p.setups),
    levels: p.levels, risk: p.risk, goals: p.goals,
    pair_analyses: JSON.stringify(p.pairAnalyses),
    news_items: p.newsItems ? JSON.stringify(p.newsItems) : null,
    news_result: p.newsResult || null, analysis_video_url: p.analysisVideoUrl || null,
    reviewed: p.reviewed || false,
  };
}
export function dbToWeeklyPlan(row: any): WeeklyPlan {
  return {
    id: row.id, weekStart: row.week_start, bias: row.bias,
    markets: typeof row.markets === 'string' ? JSON.parse(row.markets) : (row.markets || []),
    setups: typeof row.setups === 'string' ? JSON.parse(row.setups) : (row.setups || []),
    levels: row.levels, risk: row.risk, goals: row.goals,
    pairAnalyses: typeof row.pair_analyses === 'string' ? JSON.parse(row.pair_analyses) : (row.pair_analyses || []),
    newsItems: row.news_items ? (typeof row.news_items === 'string' ? JSON.parse(row.news_items) : row.news_items) : undefined,
    newsResult: row.news_result || undefined, analysisVideoUrl: row.analysis_video_url || undefined,
    reviewed: row.reviewed || false,
  };
}

// DailyPlan
export function dailyPlanToDb(p: DailyPlan, userId: string) {
  return {
    id: p.id, user_id: userId, date: p.date, daily_bias: p.dailyBias,
    session_focus: p.sessionFocus, max_trades: p.maxTrades, risk_limit: p.riskLimit,
    pairs: JSON.stringify(p.pairs),
    news_items: p.newsItems ? JSON.stringify(p.newsItems) : null,
    took_trades: p.tookTrades ?? null, result_narrative: p.resultNarrative || null,
    result_chart_image: p.resultChartImage || null,
    analysis_video_url: p.analysisVideoUrl || null, note: p.note || null,
    reviewed: p.reviewed || false,
  };
}
export function dbToDailyPlan(row: any): DailyPlan {
  return {
    id: row.id, date: row.date, dailyBias: row.daily_bias,
    sessionFocus: row.session_focus, maxTrades: Number(row.max_trades), riskLimit: row.risk_limit,
    pairs: typeof row.pairs === 'string' ? JSON.parse(row.pairs) : (row.pairs || []),
    newsItems: row.news_items ? (typeof row.news_items === 'string' ? JSON.parse(row.news_items) : row.news_items) : undefined,
    tookTrades: row.took_trades ?? undefined, resultNarrative: row.result_narrative || undefined,
    resultChartImage: row.result_chart_image || undefined,
    analysisVideoUrl: row.analysis_video_url || undefined, note: row.note || undefined,
    reviewed: row.reviewed || false,
  };
}
