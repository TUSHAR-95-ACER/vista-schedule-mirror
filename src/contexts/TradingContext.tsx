import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CONFLUENCE_OPTIONS, SETUPS, Trade, TradingAccount, Transaction, ScaleEvent, WeeklyPlan, DailyPlan } from '@/types/trading';
import { supabase } from '@/integrations/supabase/client';

// Cast supabase client to bypass empty generated types (tables created via migration)
const db = supabase as any;
import { useAuth } from '@/contexts/AuthContext';
import {
  tradeToDb, dbToTrade, accountToDb, dbToAccount,
  txToDb, dbToTx, scaleToDb, dbToScale,
  weeklyPlanToDb, dbToWeeklyPlan, dailyPlanToDb, dbToDailyPlan
} from '@/lib/dbMappers';

interface TradingContextType {
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
  loading: boolean;
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
  deleteWeeklyPlan: (id: string) => void;
  addDailyPlan: (plan: DailyPlan) => void;
  updateDailyPlan: (plan: DailyPlan) => void;
  deleteDailyPlan: (id: string) => void;
  addCustomSetup: (setup: string) => void;
  updateCustomSetup: (previous: string, next: string) => void;
  deleteCustomSetup: (setup: string) => void;
  deleteCustomAsset: (asset: string) => void;
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

const DEFAULT_MARKETS = ['Forex', 'Crypto', 'Commodities', 'Indices', 'Stocks', 'Futures'];
const DEFAULT_SESSIONS = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];
const DEFAULT_CONDITIONS = ['Trending', 'Ranging', 'Volatile'];
const DEFAULT_GRADES = ['A+', 'A', 'B', 'C'];
const DEFAULT_MANAGEMENT = ['Moved SL to Breakeven', 'Partial TP', 'Trailing Stop', 'Closed Early', 'Held Full Position', 'Scaled In', 'Scaled Out'];
const DEFAULT_PSYCH = ['Confident', 'Fearful', 'Greedy', 'Neutral', 'Anxious', 'Calm'];
const DEFAULT_VIOLATIONS = ['FOMO', 'Early Entry', 'Overtrading', 'Emotional', 'Ignored SL'];
const DEFAULT_NOTEBOOK_CATS = ['Pattern', 'Missed Trade', 'Opportunity Not Taken', 'Observation', 'News Reaction'];

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scaleEvents, setScaleEvents] = useState<ScaleEvent[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
  const [customSetups, setCustomSetups] = useState<string[]>([...SETUPS]);
  const [customAssets, setCustomAssets] = useState<string[]>([]);
  const [customConfluences, setCustomConfluences] = useState<string[]>([...CONFLUENCE_OPTIONS]);
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS);
  const [sessions, setSessions] = useState<string[]>(DEFAULT_SESSIONS);
  const [conditions, setConditions] = useState<string[]>(DEFAULT_CONDITIONS);
  const [gradesList, setGradesList] = useState<string[]>(DEFAULT_GRADES);
  const [managementOptions, setManagementOptions] = useState<string[]>(DEFAULT_MANAGEMENT);
  const [psychTags, setPsychTags] = useState<string[]>(DEFAULT_PSYCH);
  const [violations, setViolations] = useState<string[]>(DEFAULT_VIOLATIONS);
  const [notebookCategories, setNotebookCategories] = useState<string[]>(DEFAULT_NOTEBOOK_CATS);
  const [loading, setLoading] = useState(true);

  const resetState = useCallback(() => {
    setTrades([]);
    setAccounts([]);
    setTransactions([]);
    setScaleEvents([]);
    setWeeklyPlans([]);
    setDailyPlans([]);
    setCustomSetups([...SETUPS]);
    setCustomAssets([]);
    setCustomConfluences([...CONFLUENCE_OPTIONS]);
    setMarkets(DEFAULT_MARKETS);
    setSessions(DEFAULT_SESSIONS);
    setConditions(DEFAULT_CONDITIONS);
    setGradesList(DEFAULT_GRADES);
    setManagementOptions(DEFAULT_MANAGEMENT);
    setPsychTags(DEFAULT_PSYCH);
    setViolations(DEFAULT_VIOLATIONS);
    setNotebookCategories(DEFAULT_NOTEBOOK_CATS);
  }, []);

  // Load all data from Supabase when user changes
  useEffect(() => {
    resetState();

    if (!user) {
      setLoading(false);
      return;
    }

    const uid = user.id;
    setLoading(true);

    Promise.all([
      db.from('trades').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      db.from('trading_accounts').select('*').eq('user_id', uid),
      db.from('transactions').select('*').eq('user_id', uid),
      db.from('scale_events').select('*').eq('user_id', uid),
      db.from('weekly_plans').select('*').eq('user_id', uid),
      db.from('daily_plans').select('*').eq('user_id', uid),
      db.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
    ]).then(([tradesRes, accountsRes, txRes, scaleRes, wpRes, dpRes, settingsRes]) => {
      if (tradesRes.data) setTrades(tradesRes.data.map(dbToTrade));
      if (accountsRes.data) setAccounts(accountsRes.data.map(dbToAccount));
      if (txRes.data) setTransactions(txRes.data.map(dbToTx));
      if (scaleRes.data) setScaleEvents(scaleRes.data.map(dbToScale));
      if (wpRes.data) setWeeklyPlans(wpRes.data.map(dbToWeeklyPlan));
      if (dpRes.data) setDailyPlans(dpRes.data.map(dbToDailyPlan));

      if (settingsRes.data) {
        const s = settingsRes.data;
        const parse = (v: any, def: string[]) => {
          if (!v) return def;
          const arr = typeof v === 'string' ? JSON.parse(v) : v;
          return Array.isArray(arr) && arr.length > 0 ? arr : def;
        };
        setCustomSetups(parse(s.custom_setups, [...SETUPS]));
        setCustomAssets(parse(s.custom_assets, []));
        setCustomConfluences(parse(s.custom_confluences, [...CONFLUENCE_OPTIONS]));
        setMarkets(parse(s.markets, DEFAULT_MARKETS));
        setSessions(parse(s.sessions, DEFAULT_SESSIONS));
        setConditions(parse(s.conditions, DEFAULT_CONDITIONS));
        setGradesList(parse(s.grades_list, DEFAULT_GRADES));
        setManagementOptions(parse(s.management_options, DEFAULT_MANAGEMENT));
        setPsychTags(parse(s.psych_tags, DEFAULT_PSYCH));
        setViolations(parse(s.violations, DEFAULT_VIOLATIONS));
        setNotebookCategories(parse(s.notebook_categories, DEFAULT_NOTEBOOK_CATS));
      } else if (user) {
        // Create default settings row
        db.from('user_settings').insert({
          user_id: uid,
          custom_setups: [...SETUPS], custom_assets: [], custom_confluences: [...CONFLUENCE_OPTIONS],
          markets: DEFAULT_MARKETS, sessions: DEFAULT_SESSIONS, conditions: DEFAULT_CONDITIONS,
          grades_list: DEFAULT_GRADES, management_options: DEFAULT_MANAGEMENT,
          psych_tags: DEFAULT_PSYCH, violations: DEFAULT_VIOLATIONS,
          notebook_categories: DEFAULT_NOTEBOOK_CATS,
        }).then(() => {});
      }
      setLoading(false);
    });
  }, [user, resetState]);

  // Helper: save settings to Supabase
  const saveSettings = useCallback((updates: Record<string, any>) => {
    if (!user) return;
    db.from('user_settings').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Trades CRUD ──
  const addTrade = useCallback((trade: Trade) => {
    setTrades(s => [trade, ...s]);
    if (user) db.from('trades').insert(tradeToDb(trade, user.id) as any).then(() => {});
  }, [user]);

  const updateTrade = useCallback((trade: Trade) => {
    setTrades(s => s.map(t => t.id === trade.id ? trade : t));
    if (user) {
      const { id, ...rest } = tradeToDb(trade, user.id);
      db.from('trades').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteTrade = useCallback((id: string) => {
    setTrades(s => s.filter(t => t.id !== id));
    if (user) db.from('trades').delete().eq('id', id).eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Accounts CRUD ──
  const addAccount = useCallback((account: TradingAccount) => {
    setAccounts(s => [account, ...s]);
    if (user) db.from('trading_accounts').insert(accountToDb(account, user.id) as any).then(() => {});
  }, [user]);

  const updateAccount = useCallback((account: TradingAccount) => {
    setAccounts(s => s.map(a => a.id === account.id ? account : a));
    if (user) {
      const { id, ...rest } = accountToDb(account, user.id);
      db.from('trading_accounts').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(s => s.filter(a => a.id !== id));
    if (user) db.from('trading_accounts').delete().eq('id', id).eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Transactions ──
  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(s => [...s, tx]);
    if (user) db.from('transactions').insert(txToDb(tx, user.id) as any).then(() => {});
  }, [user]);

  // ── Scale Events ──
  const addScaleEvent = useCallback((event: ScaleEvent) => {
    setScaleEvents(s => [...s, event]);
    if (user) db.from('scale_events').insert(scaleToDb(event, user.id) as any).then(() => {});
  }, [user]);

  // ── Weekly Plans ──
  const addWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    setWeeklyPlans(s => [...s, plan]);
    if (user) db.from('weekly_plans').insert(weeklyPlanToDb(plan, user.id) as any).then(() => {});
  }, [user]);

  const updateWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    setWeeklyPlans(s => s.map(p => p.id === plan.id ? plan : p));
    if (user) {
      const { id, ...rest } = weeklyPlanToDb(plan, user.id);
      db.from('weekly_plans').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteWeeklyPlan = useCallback((id: string) => {
    setWeeklyPlans(s => s.filter(p => p.id !== id));
    if (user) db.from('weekly_plans').delete().eq('id', id).eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Daily Plans ──
  const addDailyPlan = useCallback((plan: DailyPlan) => {
    setDailyPlans(s => [...s, plan]);
    if (user) db.from('daily_plans').insert(dailyPlanToDb(plan, user.id) as any).then(() => {});
  }, [user]);

  const updateDailyPlan = useCallback((plan: DailyPlan) => {
    setDailyPlans(s => s.map(p => p.id === plan.id ? plan : p));
    if (user) {
      const { id, ...rest } = dailyPlanToDb(plan, user.id);
      db.from('daily_plans').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteDailyPlan = useCallback((id: string) => {
    setDailyPlans(s => s.filter(p => p.id !== id));
    if (user) db.from('daily_plans').delete().eq('id', id).eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Settings list CRUD factory ──
  function makeSettingsCRUD(
    stateKey: string,
    dbKey: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    const add = (v: string) => {
      const val = v.trim();
      if (!val) return;
      setter(prev => {
        const next = [...new Set([...prev, val])];
        saveSettings({ [dbKey]: next });
        return next;
      });
    };
    const update = (prev: string, next: string) => {
      const val = next.trim();
      if (!val || prev === val) return;
      setter(items => {
        const updated = [...new Set(items.filter(i => i !== prev).concat(val))];
        saveSettings({ [dbKey]: updated });
        return updated;
      });
    };
    const remove = (v: string) => {
      setter(items => {
        const updated = items.filter(i => i !== v);
        saveSettings({ [dbKey]: updated });
        return updated;
      });
    };
    return { add, update, remove };
  }

  const setupsCRUD = makeSettingsCRUD('customSetups', 'custom_setups', setCustomSetups);
  const assetsCRUD = makeSettingsCRUD('customAssets', 'custom_assets', setCustomAssets);
  const confluencesCRUD = makeSettingsCRUD('customConfluences', 'custom_confluences', setCustomConfluences);
  const marketsCRUD = makeSettingsCRUD('markets', 'markets', setMarkets);
  const sessionsCRUD = makeSettingsCRUD('sessions', 'sessions', setSessions);
  const conditionsCRUD = makeSettingsCRUD('conditions', 'conditions', setConditions);
  const gradesCRUD = makeSettingsCRUD('gradesList', 'grades_list', setGradesList);
  const mgmtCRUD = makeSettingsCRUD('managementOptions', 'management_options', setManagementOptions);
  const psychCRUD = makeSettingsCRUD('psychTags', 'psych_tags', setPsychTags);
  const violCRUD = makeSettingsCRUD('violations', 'violations', setViolations);
  const notebookCRUD = makeSettingsCRUD('notebookCategories', 'notebook_categories', setNotebookCategories);

  return (
    <TradingContext.Provider value={{
      trades, accounts, transactions, scaleEvents, weeklyPlans, dailyPlans,
      customSetups, customAssets, customConfluences, markets, sessions, conditions,
      gradesList, managementOptions, psychTags, violations, notebookCategories, loading,
      addTrade, updateTrade, deleteTrade,
      addAccount, updateAccount, deleteAccount,
      addTransaction, addScaleEvent,
      addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan,
      addDailyPlan, updateDailyPlan, deleteDailyPlan,
      addCustomSetup: setupsCRUD.add, updateCustomSetup: setupsCRUD.update, deleteCustomSetup: setupsCRUD.remove,
      addCustomAsset: assetsCRUD.add, deleteCustomAsset: assetsCRUD.remove,
      addCustomConfluence: confluencesCRUD.add, updateCustomConfluence: confluencesCRUD.update, deleteCustomConfluence: confluencesCRUD.remove,
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
