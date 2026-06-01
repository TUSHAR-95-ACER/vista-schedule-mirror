export type StrategyStatus = 'Testing' | 'Promising' | 'Validated' | 'Failed' | 'Archived';
export type StrategyType = 'Session Model' | 'Liquidity Model' | 'SMT Model' | 'PO3 Model' | 'Custom';

export type Bias = 'Bullish' | 'Neutral' | 'Bearish';
export type DealingRange = 'Premium' | 'Discount' | 'EQ';
export type LiquidityTarget = 'BSL Above' | 'SSL Below' | 'Both' | 'None';
export type BreakoutQuality = 'Strong Displacement' | 'Weak Displacement' | 'No Displacement';
export type FVGLocation = 'High' | '50%' | 'Low';
export type EntryType = 'DR High' | 'DR Low' | 'Midpoint' | 'FVG' | 'Supply/Demand';
export type LTFConfirmation = 'Bullish MSS' | 'Bearish MSS' | 'Wick Rejection' | 'Displacement Off Zone';
export type TestResult = 'Win' | 'Loss' | 'Scratch';
export type ProcessGrade = 'A' | 'B' | 'C';
export type EmotionalState = 'Process' | 'Flow' | 'Foggy' | 'Revenge';

export const SESSIONS = [
  'Asia',
  'London',
  'New York',
  'London Killzone',
  'New York Killzone',
  'London Lunch',
  'London Close',
] as const;
export type ResearchSession = typeof SESSIONS[number];

export interface ResearchTest {
  id: string;
  createdAt: string;
  updatedAt: string;
  date: string;
  pair: string;
  session: ResearchSession | '';
  predictedBias: Bias | '';
  actualBias: Bias | '';
  dealingRange: DealingRange | '';
  liquidityTarget: LiquidityTarget | '';
  liquidityNote: string;
  narrative: string;
  drHigh: string;
  drEq: string;
  drLow: string;
  breakoutQuality: BreakoutQuality | '';
  fvgLocation: FVGLocation | '';
  entryType: EntryType | '';
  ltfConfirmation: LTFConfirmation | '';
  entryPrice: string;
  stopLoss: string;
  tp1: string;
  tp1Target: string;
  tp2: string;
  tp2Target: string;
  result: TestResult | '';
  rAchieved: string;
  grade: ProcessGrade | '';
  emotionalState: EmotionalState | '';
  predictedScreenshot?: string;
  actualScreenshot?: string;
  reflectionWentWell: string;
  reflectionToImprove: string;
  reflectionNotes: string;
  reviewFollowedModel: string;
  reviewNarrative: string;
  reviewDifferently: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  icon: string;        // emoji
  color: string;       // tailwind color name token
  status: StrategyStatus;
  pairs: string[];
  tests: ResearchTest[];
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

export const STRATEGY_TYPES: StrategyType[] = [
  'Session Model', 'Liquidity Model', 'SMT Model', 'PO3 Model', 'Custom',
];

export const STRATEGY_COLORS = [
  'blue', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'orange', 'slate',
] as const;

export const STRATEGY_ICONS = ['🧪', '🎯', '📊', '⚡', '🌊', '🔭', '🧠', '🪙', '📈', '🛰️'];

export function createEmptyTest(pair = ''): ResearchTest {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    date: new Date().toISOString().slice(0, 10),
    pair,
    session: '',
    predictedBias: '',
    actualBias: '',
    dealingRange: '',
    liquidityTarget: '',
    liquidityNote: '',
    narrative: '',
    drHigh: '',
    drEq: '',
    drLow: '',
    breakoutQuality: '',
    fvgLocation: '',
    entryType: '',
    ltfConfirmation: '',
    entryPrice: '',
    stopLoss: '',
    tp1: '',
    tp1Target: '',
    tp2: '',
    tp2Target: '',
    result: '',
    rAchieved: '',
    grade: '',
    emotionalState: '',
    reflectionWentWell: '',
    reflectionToImprove: '',
    reflectionNotes: '',
    reviewFollowedModel: '',
    reviewNarrative: '',
    reviewDifferently: '',
  };
}

export function createStrategy(partial: Partial<Strategy> = {}): Strategy {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: partial.name || 'Untitled Strategy',
    description: partial.description || '',
    type: partial.type || 'Custom',
    icon: partial.icon || '🧪',
    color: partial.color || 'blue',
    status: partial.status || 'Testing',
    pairs: partial.pairs || ['EURUSD', 'GBPUSD', 'XAUUSD'],
    tests: partial.tests || [],
    templateName: partial.templateName,
    createdAt: now,
    updatedAt: now,
  };
}
