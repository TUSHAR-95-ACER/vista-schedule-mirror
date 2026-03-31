export type Market = 'Forex' | 'Crypto' | 'Commodities' | 'Indices' | 'Stocks' | 'Futures';

export type Session = 'Asia' | 'London' | 'New York' | 'New York Kill Zone' | 'London Close';

export type MarketCondition = 'Trending' | 'Ranging' | 'Volatile';

export type TradeDirection = 'Long' | 'Short';

export type TradeResult = 'Win' | 'Loss' | 'Breakeven' | 'Untriggered Setup' | 'Cancelled';

export type AccountType = 'Personal' | 'Prop Firm' | 'Funded' | 'Demo';

export type PropFirmStage = 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Funded' | 'Scale Up';

export type AccountStatus = 'Evaluation' | 'Funded' | 'Active' | 'Disabled';

export type TradeGrade = 'A+' | 'A' | 'B' | 'C';

export type TradeManagement =
  | 'Moved SL to Breakeven'
  | 'Partial TP'
  | 'Trailing Stop'
  | 'Closed Early'
  | 'Held Full Position'
  | 'Scaled In'
  | 'Scaled Out';

export type Confluence =
  | 'Order Block'
  | 'BOS'
  | 'CHoCH'
  | 'FVG'
  | 'Liquidity Sweep'
  | 'SMT'
  | 'Support/Resistance'
  | 'EQH'
  | 'EQL';

export type Emotion = 'Confident' | 'Fearful' | 'Greedy' | 'Neutral' | 'Anxious' | 'Calm';

export type Mistake = 'FOMO' | 'Early Entry' | 'Overtrading' | 'Emotional' | 'Ignored SL';

export type PairReason = 'Liquidity Sweep' | 'Order Block' | 'Fair Value Gap' | 'SMT Divergence' | 'Trend Continuation' | 'Volume Candle';

export const PAIR_REASONS: PairReason[] = ['Liquidity Sweep', 'Order Block', 'Fair Value Gap', 'SMT Divergence', 'Trend Continuation', 'Volume Candle'];

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  type: AccountType;
  startingBalance: number;
  currentSize: number; // tracks current account size (updated on scale-ups)
  initialSize: number; // original starting size, never changes
  currency: string;
  stage?: PropFirmStage;
  targetBalance?: number;
  createdAt: string;
  status?: AccountStatus;
  phase1Target?: number;
  phase2Target?: number;
  phase3Target?: number;
  phase1TargetPercent?: number;  // e.g. 8 means 8%
  phase2TargetPercent?: number;
  phase3TargetPercent?: number;
  maxDrawdownLimit?: number;
  dailyDrawdownLimit?: number;
  targetPercent?: number;       // e.g. 10 means 10%
  dailyDrawdownPercent?: number; // e.g. 5 means 5%
  maxDrawdownPercent?: number;   // e.g. 10 means 10%
  steps?: 1 | 2 | 3;           // number of evaluation steps
  payouts?: Payout[];
}

export interface Payout {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface AccountAllocation {
  accountId: string;
  riskPercent: number;
}

export interface Trade {
  id: string;
  date: string;
  entryTime?: string;
  exitTime?: string;
  market: Market;
  asset: string;
  direction: TradeDirection;
  session: Session;
  marketCondition: MarketCondition;
  setup: string;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number;
  result: TradeResult;
  plannedRR: number;
  actualRR?: number;
  maxRRReached?: number;
  maxAdverseMove?: number;
  pips?: number;
  profitLoss: number;
  fees?: number;
  notes: string;
  accounts: AccountAllocation[];
  management: TradeManagement[];
  confluences: string[];
  entryConfluences?: string[];
  targetConfluences?: string[];
  chartLink?: string;
  predictionImage?: string;
  executionImage?: string;
  psychology?: TradePsychology;
  mistakes: Mistake[];
  grade?: TradeGrade;
}

export interface TradePsychology {
  emotion: Emotion;
  focus: number;
  discipline: number;
  checklist: {
    followPlan: boolean;
    noFomo: boolean;
    noRevenge: boolean;
    waitedConfirmation: boolean;
    riskRespected: boolean;
  };
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  note: string;
}

export interface ScaleEvent {
  id: string;
  accountId: string;
  date: string;
  oldSize: number;
  newSize: number;
  note?: string;
}

// News item for plans
export interface NewsItem {
  id: string;
  date: string;
  event: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  notes?: string;
  image?: string;
}

// Weekly Plan with multi-pair analysis
export interface PairAnalysis {
  id: string;
  pair: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  setupFocus: string;
  reasons: PairReason[];
  keyLevels: string;
  chartImage?: string;
  narrative?: string;
  expectedDirection: 'Buy' | 'Sell';
  resultChartImage?: string;
  resultNarrative?: string;
  actualDirection?: 'Bullish' | 'Bearish' | 'Neutral' | '';
  actualResult?: 'Win' | 'Loss' | 'Untriggered Setup' | '';
  note?: string;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  bias: string;
  markets: string[];
  setups: string[];
  levels: string;
  risk: string;
  goals: string;
  pairAnalyses: PairAnalysis[];
  newsItems?: NewsItem[];
  newsResult?: string;
  analysisVideoUrl?: string;
  reviewed?: boolean;
}

// Daily Plan
export interface DailyPairPlan {
  id: string;
  pair: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  setup: string;
  reasons: PairReason[];
  keyLevels: string;
  chartImage?: string;
  narrative?: string;
  resultChartImage?: string;
  resultNarrative?: string;
  note?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  dailyBias: 'Bullish' | 'Bearish' | 'Neutral';
  sessionFocus: Session;
  maxTrades: number;
  riskLimit: string;
  pairs: DailyPairPlan[];
  newsItems?: NewsItem[];
  tookTrades?: boolean;
  resultNarrative?: string;
  resultChartImage?: string;
  analysisVideoUrl?: string;
  note?: string;
  reviewed?: boolean;
}

export const TRADE_GRADES: TradeGrade[] = ['A+', 'A', 'B', 'C'];

export const FOREX_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'EURAUD', 'EURNZD',
  'GBPAUD', 'GBPNZD', 'AUDNZD', 'AUDCAD',
];

export const METALS = ['XAUUSD', 'XAGUSD'];

export const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'];

export const INDICES = ['US30', 'NAS100', 'SPX500', 'UK100', 'GER40'];

export const ALL_ASSETS = [...FOREX_PAIRS, ...METALS, ...CRYPTO_PAIRS, ...INDICES];

export const SETUPS = [
  'Breakout', 'Pullback', 'No Bos', 'Volume Candle',
];

export const CONFLUENCE_OPTIONS = [
  'Order Block',
  'BOS',
  'CHoCH',
  'FVG',
  'Liquidity Sweep',
  'SMT',
  'Support/Resistance',
  'EQH',
  'EQL',
] as const;
