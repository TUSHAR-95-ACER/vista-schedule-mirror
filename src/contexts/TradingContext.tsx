import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  // Per-resource loading flags so pages can render their own data without waiting on others.
  loadingTrades: boolean;
  loadingDailyPlans: boolean;
  loadingWeeklyPlans: boolean;
  loadingAccounts: boolean;
  loadingSettings: boolean;
  /** Fetches a single trade (incl. heavy media columns) on demand. */
  hydrateTradeMedia: (id: string) => Promise<Trade | null>;
  /** Fetches a single daily plan with full media on demand. */
  hydrateDailyPlanMedia: (id: string) => Promise<DailyPlan | null>;
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
  addCustomAsset: (asset: string) => void;
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

// PERFORMANCE: Initial trade fetch excludes heavy base64 image columns
// (prediction_image, execution_image). They're hydrated on demand via
// hydrateTradeMedia(id) when the user opens the gallery card or detail sheet.
const TRADE_LITE_COLUMNS = [
  'id','user_id','date','entry_time','exit_time','market','asset','direction','session',
  'market_condition','setup','quantity','entry_price','stop_loss','take_profit','exit_price','order_type',
  'result','planned_rr','actual_rr','max_rr_reached','max_adverse_move','pips','profit_loss',
  'fees','notes','accounts','management','confluences','entry_confluences','target_confluences',
  'chart_link','psychology','mistakes','grade','timeframe','trend','trade_journey','day_tags',
  'curve','trade_analysis','market_sentiment','status','created_at',
].join(',');

// Same idea for daily plans — drop result_chart_image (often base64) from list fetch.
const DAILY_PLAN_LITE_COLUMNS = [
  'id','user_id','date','daily_bias','session_focus','max_trades','risk_limit','pairs',
  'news_items','took_trades','result_narrative','analysis_video_url','note','reviewed',
  'day_summary','notes_journal','created_at',
].join(',');

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

  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingDailyPlans, setLoadingDailyPlans] = useState(true);
  const [loadingWeeklyPlans, setLoadingWeeklyPlans] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Aggregate loading: any resource still loading.
  const loading =
    loadingTrades || loadingAccounts || loadingDailyPlans || loadingWeeklyPlans || loadingSettings;

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

  // Track current load to ignore stale responses on rapid user switches.
  const loadIdRef = useRef(0);

  // Stream-load: each query fires independently and updates its own slice the moment it returns.
  // No Promise.all → a slow trade fetch never blocks Daily Plan rendering.
  useEffect(() => {
    resetState();

    if (!user) {
      setLoadingTrades(false);
      setLoadingAccounts(false);
      setLoadingDailyPlans(false);
      setLoadingWeeklyPlans(false);
      setLoadingSettings(false);
      return;
    }

    loadIdRef.current += 1;
    const myLoadId = loadIdRef.current;
    const uid = user.id;

    setLoadingTrades(true);
    setLoadingAccounts(true);
    setLoadingDailyPlans(true);
    setLoadingWeeklyPlans(true);
    setLoadingSettings(true);

    const isStale = () => loadIdRef.current !== myLoadId;

    // Trades — lite (no base64 images).
    db.from('trades').select(TRADE_LITE_COLUMNS).eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        if (isStale()) return;
        if (data) setTrades(data.map(dbToTrade));
        setLoadingTrades(false);
      });

    // Daily plans — lite. THIS is what was getting blocked behind the giant trade fetch.
    db.from('daily_plans').select(DAILY_PLAN_LITE_COLUMNS).eq('user_id', uid)
      .order('date', { ascending: false })
      .then(({ data }: any) => {
        if (isStale()) return;
        if (data) setDailyPlans(data.map(dbToDailyPlan));
        setLoadingDailyPlans(false);
      });

    db.from('weekly_plans').select('*').eq('user_id', uid)
      .order('week_start', { ascending: false })
      .then(({ data }: any) => {
        if (isStale()) return;
        if (data) setWeeklyPlans(data.map(dbToWeeklyPlan));
        setLoadingWeeklyPlans(false);
      });

    db.from('trading_accounts').select('*').eq('user_id', uid)
      .then(({ data }: any) => {
        if (isStale()) return;
        if (data) setAccounts(data.map(dbToAccount));
        setLoadingAccounts(false);
      });

    db.from('transactions').select('*').eq('user_id', uid)
      .then(({ data }: any) => { if (!isStale() && data) setTransactions(data.map(dbToTx)); });

    db.from('scale_events').select('*').eq('user_id', uid)
      .then(({ data }: any) => { if (!isStale() && data) setScaleEvents(data.map(dbToScale)); });

    db.from('user_settings').select('*').eq('user_id', uid).maybeSingle()
      .then(({ data }: any) => {
        if (isStale()) return;
        if (data) {
          const s = data;
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
        } else {
          db.from('user_settings').insert({
            user_id: uid,
            custom_setups: [...SETUPS], custom_assets: [], custom_confluences: [...CONFLUENCE_OPTIONS],
            markets: DEFAULT_MARKETS, sessions: DEFAULT_SESSIONS, conditions: DEFAULT_CONDITIONS,
            grades_list: DEFAULT_GRADES, management_options: DEFAULT_MANAGEMENT,
            psych_tags: DEFAULT_PSYCH, violations: DEFAULT_VIOLATIONS,
            notebook_categories: DEFAULT_NOTEBOOK_CATS,
          }).then(() => {});
        }
        setLoadingSettings(false);
      });
  }, [user, resetState]);

  // ── On-demand media hydration ──
  // Cache so opening the same trade detail twice doesn't refetch.
  const tradeMediaCache = useRef<Map<string, Trade>>(new Map());
  const dailyPlanMediaCache = useRef<Map<string, DailyPlan>>(new Map());

  const hydrateTradeMedia = useCallback(async (id: string): Promise<Trade | null> => {
    if (!user) return null;
    const cached = tradeMediaCache.current.get(id);
    if (cached) return cached;
    const { data } = await db.from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return null;
    const full = dbToTrade(data);
    tradeMediaCache.current.set(id, full);
    // Also patch the in-memory list so the row picks up images without a re-fetch.
    setTrades(s => s.map(t => t.id === id ? { ...t, ...full } : t));
    return full;
  }, [user]);

  const hydrateDailyPlanMedia = useCallback(async (id: string): Promise<DailyPlan | null> => {
    if (!user) return null;
    const cached = dailyPlanMediaCache.current.get(id);
    if (cached) return cached;
    const { data } = await db.from('daily_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return null;
    const full = dbToDailyPlan(data);
    dailyPlanMediaCache.current.set(id, full);
    setDailyPlans(s => s.map(p => p.id === id ? { ...p, ...full } : p));
    return full;
  }, [user]);

  // Helper: save settings to Supabase
  const saveSettings = useCallback((updates: Record<string, any>) => {
    if (!user) return;
    db.from('user_settings').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id).then(() => {});
  }, [user]);

  // ── Trades CRUD ──
  const addTrade = useCallback((trade: Trade) => {
    setTrades(s => [trade, ...s]);
    tradeMediaCache.current.set(trade.id, trade);
    if (user) db.from('trades').insert(tradeToDb(trade, user.id) as any).then(() => {});
  }, [user]);

  const updateTrade = useCallback((trade: Trade) => {
    setTrades(s => s.map(t => t.id === trade.id ? trade : t));
    tradeMediaCache.current.set(trade.id, trade);
    if (user) {
      const { id, ...rest } = tradeToDb(trade, user.id);
      db.from('trades').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteTrade = useCallback((id: string) => {
    setTrades(s => s.filter(t => t.id !== id));
    tradeMediaCache.current.delete(id);
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
    dailyPlanMediaCache.current.set(plan.id, plan);
    if (user) db.from('daily_plans').insert(dailyPlanToDb(plan, user.id) as any).then(() => {});
  }, [user]);

  const updateDailyPlan = useCallback((plan: DailyPlan) => {
    setDailyPlans(s => s.map(p => p.id === plan.id ? plan : p));
    dailyPlanMediaCache.current.set(plan.id, plan);
    if (user) {
      const { id, ...rest } = dailyPlanToDb(plan, user.id);
      db.from('daily_plans').update(rest as any).eq('id', id).eq('user_id', user.id).then(() => {});
    }
  }, [user]);

  const deleteDailyPlan = useCallback((id: string) => {
    setDailyPlans(s => s.filter(p => p.id !== id));
    dailyPlanMediaCache.current.delete(id);
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
      loadingTrades, loadingDailyPlans, loadingWeeklyPlans, loadingAccounts, loadingSettings,
      hydrateTradeMedia, hydrateDailyPlanMedia,
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
