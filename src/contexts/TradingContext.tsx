import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CONFLUENCE_OPTIONS, SETUPS, Trade, TradingAccount, Transaction, ScaleEvent, WeeklyPlan, DailyPlan } from '@/types/trading';
import { generateSampleTrades, generateSampleWeeklyPlans, generateSampleDailyPlans } from '@/lib/sampleData';

interface ListCRUD {
  items: string[];
  add: (item: string) => void;
  update: (prev: string, next: string) => void;
  remove: (item: string) => void;
}

interface TradingState {
  trades: Trade[];
  accounts: TradingAccount[];
  transactions: Transaction[];
  scaleEvents: ScaleEvent[];
  weeklyPlans: WeeklyPlan[];
  dailyPlans: DailyPlan[];
  customSetups: string[];
  customAssets: string[];
  customConfluences: string[];
  markets: string[];
  sessions: string[];
  conditions: string[];
  gradesList: string[];
  managementOptions: string[];
  psychTags: string[];
  violations: string[];
  notebookCategories: string[];
  optionsVersion: number;
}

interface TradingContextType extends TradingState {
  addTrade: (trade: Trade) => void;
  updateTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => void;
  addAccount: (account: TradingAccount) => void;
  updateAccount: (account: TradingAccount) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (tx: Transaction) => void;
  addScaleEvent: (event: ScaleEvent) => void;
  addWeeklyPlan: (plan: WeeklyPlan) => void;
  updateWeeklyPlan: (plan: WeeklyPlan) => void;
  addDailyPlan: (plan: DailyPlan) => void;
  updateDailyPlan: (plan: DailyPlan) => void;
  addCustomSetup: (setup: string) => void;
  updateCustomSetup: (previous: string, next: string) => void;
  deleteCustomSetup: (setup: string) => void;
  addCustomAsset: (asset: string) => void;
  addCustomConfluence: (c: string) => void;
  updateCustomConfluence: (previous: string, next: string) => void;
  deleteCustomConfluence: (c: string) => void;
  addMarket: (v: string) => void; updateMarket: (p: string, n: string) => void; deleteMarket: (v: string) => void;
  addSession: (v: string) => void; updateSession: (p: string, n: string) => void; deleteSession: (v: string) => void;
  addCondition: (v: string) => void; updateCondition: (p: string, n: string) => void; deleteCondition: (v: string) => void;
  addGrade: (v: string) => void; updateGrade: (p: string, n: string) => void; deleteGrade: (v: string) => void;
  addManagement: (v: string) => void; updateManagement: (p: string, n: string) => void; deleteManagement: (v: string) => void;
  addPsychTag: (v: string) => void; updatePsychTag: (p: string, n: string) => void; deletePsychTag: (v: string) => void;
  addViolation: (v: string) => void; updateViolation: (p: string, n: string) => void; deleteViolation: (v: string) => void;
  addNotebookCategory: (v: string) => void; updateNotebookCategory: (p: string, n: string) => void; deleteNotebookCategory: (v: string) => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

const STORAGE_KEY = 'quantedge_data';
const OPTIONS_VERSION = 8;

const normalizeOptions = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];

const DEFAULT_MARKETS = ['Forex', 'Crypto', 'Commodities', 'Indices', 'Stocks', 'Futures'];
const DEFAULT_SESSIONS = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];
const DEFAULT_CONDITIONS = ['Trending', 'Ranging', 'Volatile'];
const DEFAULT_GRADES = ['A+', 'A', 'B', 'C'];
const DEFAULT_MANAGEMENT = ['Moved SL to Breakeven', 'Partial TP', 'Trailing Stop', 'Closed Early', 'Held Full Position', 'Scaled In', 'Scaled Out'];
const DEFAULT_PSYCH = ['Confident', 'Fearful', 'Greedy', 'Neutral', 'Anxious', 'Calm'];
const DEFAULT_VIOLATIONS = ['FOMO', 'Early Entry', 'Overtrading', 'Emotional', 'Ignored SL'];
const DEFAULT_NOTEBOOK_CATS = ['Pattern', 'Missed Trade', 'Opportunity Not Taken', 'Observation', 'News Reaction'];

const defaultState: TradingState = {
  trades: [],
  accounts: [],
  transactions: [],
  scaleEvents: [],
  weeklyPlans: [],
  dailyPlans: [],
  customSetups: [...SETUPS],
  customAssets: [],
  customConfluences: [...CONFLUENCE_OPTIONS],
  markets: DEFAULT_MARKETS,
  sessions: DEFAULT_SESSIONS,
  conditions: DEFAULT_CONDITIONS,
  gradesList: DEFAULT_GRADES,
  managementOptions: DEFAULT_MANAGEMENT,
  psychTags: DEFAULT_PSYCH,
  violations: DEFAULT_VIOLATIONS,
  notebookCategories: DEFAULT_NOTEBOOK_CATS,
  optionsVersion: OPTIONS_VERSION,
};

function loadState(): TradingState {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<TradingState>;
      if (parsed.optionsVersion !== OPTIONS_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return { ...defaultState, trades: generateSampleTrades(), weeklyPlans: generateSampleWeeklyPlans(), dailyPlans: generateSampleDailyPlans() };
      }
      const hydrated: TradingState = {
        ...defaultState,
        ...parsed,
        customSetups: normalizeOptions(parsed.customSetups ?? [...SETUPS]),
        customConfluences: normalizeOptions(parsed.customConfluences ?? [...CONFLUENCE_OPTIONS]),
        customAssets: normalizeOptions(parsed.customAssets ?? []),
        markets: parsed.markets ?? DEFAULT_MARKETS,
        sessions: parsed.sessions ?? DEFAULT_SESSIONS,
        conditions: parsed.conditions ?? DEFAULT_CONDITIONS,
        gradesList: parsed.gradesList ?? DEFAULT_GRADES,
        managementOptions: parsed.managementOptions ?? DEFAULT_MANAGEMENT,
        psychTags: parsed.psychTags ?? DEFAULT_PSYCH,
        violations: parsed.violations ?? DEFAULT_VIOLATIONS,
        notebookCategories: parsed.notebookCategories ?? DEFAULT_NOTEBOOK_CATS,
        dailyPlans: parsed.dailyPlans ?? [],
        optionsVersion: OPTIONS_VERSION,
      };
      if (hydrated.trades.length > 0) return hydrated;
      return { ...hydrated, trades: generateSampleTrades(), weeklyPlans: generateSampleWeeklyPlans(), dailyPlans: generateSampleDailyPlans() };
    }
  } catch {}
  return { ...defaultState, trades: generateSampleTrades(), weeklyPlans: generateSampleWeeklyPlans(), dailyPlans: generateSampleDailyPlans() };
}

function saveState(state: TradingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Generic list CRUD factory
function makeListCRUD(key: keyof TradingState, setState: React.Dispatch<React.SetStateAction<TradingState>>) {
  const add = (v: string) => {
    const value = v.trim();
    if (!value) return;
    setState(s => ({ ...s, [key]: [...new Set([...(s[key] as string[]), value])] }));
  };
  const update = (prev: string, next: string) => {
    const value = next.trim();
    if (!value || prev === value) return;
    setState(s => ({ ...s, [key]: [...new Set((s[key] as string[]).filter(i => i !== prev).concat(value))] }));
  };
  const remove = (v: string) => {
    setState(s => ({ ...s, [key]: (s[key] as string[]).filter(i => i !== v) }));
  };
  return { add, update, remove };
}

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TradingState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const addTrade = useCallback((trade: Trade) => { setState(s => ({ ...s, trades: [trade, ...s.trades] })); }, []);
  const updateTrade = useCallback((trade: Trade) => { setState(s => ({ ...s, trades: s.trades.map(t => t.id === trade.id ? trade : t) })); }, []);
  const deleteTrade = useCallback((id: string) => { setState(s => ({ ...s, trades: s.trades.filter(t => t.id !== id) })); }, []);
  const addAccount = useCallback((account: TradingAccount) => { setState(s => ({ ...s, accounts: [account, ...s.accounts] })); }, []);
  const updateAccount = useCallback((account: TradingAccount) => { setState(s => ({ ...s, accounts: s.accounts.map(a => a.id === account.id ? account : a) })); }, []);
  const deleteAccount = useCallback((id: string) => { setState(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) })); }, []);
  const addTransaction = useCallback((tx: Transaction) => { setState(s => ({ ...s, transactions: [...s.transactions, tx] })); }, []);
  const addScaleEvent = useCallback((event: ScaleEvent) => { setState(s => ({ ...s, scaleEvents: [...s.scaleEvents, event] })); }, []);
  const addWeeklyPlan = useCallback((plan: WeeklyPlan) => { setState(s => ({ ...s, weeklyPlans: [...s.weeklyPlans, plan] })); }, []);
  const updateWeeklyPlan = useCallback((plan: WeeklyPlan) => { setState(s => ({ ...s, weeklyPlans: s.weeklyPlans.map(p => p.id === plan.id ? plan : p) })); }, []);
  const addDailyPlan = useCallback((plan: DailyPlan) => { setState(s => ({ ...s, dailyPlans: [...s.dailyPlans, plan] })); }, []);
  const updateDailyPlan = useCallback((plan: DailyPlan) => { setState(s => ({ ...s, dailyPlans: s.dailyPlans.map(p => p.id === plan.id ? plan : p) })); }, []);

  // Custom setups
  const addCustomSetup = useCallback((setup: string) => { const v = setup.trim(); if (!v) return; setState(s => ({ ...s, customSetups: [...new Set([...s.customSetups, v])] })); }, []);
  const updateCustomSetup = useCallback((prev: string, next: string) => { const v = next.trim(); if (!v || prev === v) return; setState(s => ({ ...s, customSetups: [...new Set(s.customSetups.filter(i => i !== prev).concat(v))] })); }, []);
  const deleteCustomSetup = useCallback((setup: string) => { setState(s => ({ ...s, customSetups: s.customSetups.filter(i => i !== setup) })); }, []);
  const addCustomAsset = useCallback((asset: string) => { setState(s => ({ ...s, customAssets: [...new Set([...s.customAssets, asset])] })); }, []);
  const addCustomConfluence = useCallback((c: string) => { const v = c.trim(); if (!v) return; setState(s => ({ ...s, customConfluences: [...new Set([...s.customConfluences, v])] })); }, []);
  const updateCustomConfluence = useCallback((prev: string, next: string) => { const v = next.trim(); if (!v || prev === v) return; setState(s => ({ ...s, customConfluences: [...new Set(s.customConfluences.filter(i => i !== prev).concat(v))] })); }, []);
  const deleteCustomConfluence = useCallback((c: string) => { setState(s => ({ ...s, customConfluences: s.customConfluences.filter(i => i !== c) })); }, []);

  // Generic CRUD for new lists
  const marketsCRUD = makeListCRUD('markets', setState);
  const sessionsCRUD = makeListCRUD('sessions', setState);
  const conditionsCRUD = makeListCRUD('conditions', setState);
  const gradesCRUD = makeListCRUD('gradesList', setState);
  const mgmtCRUD = makeListCRUD('managementOptions', setState);
  const psychCRUD = makeListCRUD('psychTags', setState);
  const violCRUD = makeListCRUD('violations', setState);
  const notebookCRUD = makeListCRUD('notebookCategories', setState);

  return (
    <TradingContext.Provider value={{
      ...state, addTrade, updateTrade, deleteTrade,
      addAccount, updateAccount, deleteAccount,
      addTransaction, addScaleEvent,
      addWeeklyPlan, updateWeeklyPlan,
      addDailyPlan, updateDailyPlan,
      addCustomSetup, updateCustomSetup, deleteCustomSetup,
      addCustomAsset,
      addCustomConfluence, updateCustomConfluence, deleteCustomConfluence,
      addMarket: marketsCRUD.add, updateMarket: marketsCRUD.update, deleteMarket: marketsCRUD.remove,
      addSession: sessionsCRUD.add, updateSession: sessionsCRUD.update, deleteSession: sessionsCRUD.remove,
      addCondition: conditionsCRUD.add, updateCondition: conditionsCRUD.update, deleteCondition: conditionsCRUD.remove,
      addGrade: gradesCRUD.add, updateGrade: gradesCRUD.update, deleteGrade: gradesCRUD.remove,
      addManagement: mgmtCRUD.add, updateManagement: mgmtCRUD.update, deleteManagement: mgmtCRUD.remove,
      addPsychTag: psychCRUD.add, updatePsychTag: psychCRUD.update, deletePsychTag: psychCRUD.remove,
      addViolation: violCRUD.add, updateViolation: violCRUD.update, deleteViolation: violCRUD.remove,
      addNotebookCategory: notebookCRUD.add, updateNotebookCategory: notebookCRUD.update, deleteNotebookCategory: notebookCRUD.remove,
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
}
