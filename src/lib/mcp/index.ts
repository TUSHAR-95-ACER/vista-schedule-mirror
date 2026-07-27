import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRecentTrades from "./tools/list-recent-trades";
import listTrades from "./tools/list-trades";
import getTrade from "./tools/get-trade";
import searchTrades from "./tools/search-trades";
import getTradeStats from "./tools/get-trade-stats";
import getPerformanceMetrics from "./tools/get-performance-metrics";
import getDashboardSummary from "./tools/get-dashboard-summary";
import getEquityCurve from "./tools/get-equity-curve";
import getPeriodStats from "./tools/get-period-stats";
import getDailyPlan from "./tools/get-daily-plan";
import listDailyPlans from "./tools/list-daily-plans";
import getWeeklyPlan from "./tools/get-weekly-plan";
import getChecklist from "./tools/get-checklist";
import searchNotebook from "./tools/search-notebook";

// Build the OAuth issuer from the project ref (Vite inlines this literal at
// build time, so it stays import-safe — no runtime env reads at module top
// level). Must be the direct supabase.co host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tg-master-journal-mcp",
  title: "TG Master Journal",
  version: "0.2.0",
  instructions:
    "Read-only tools for TG Master Journal, a professional trading operating system. " +
    "Dashboard & analytics: `get_dashboard_summary`, `get_performance_metrics` (win rate, profit factor, " +
    "expectancy, optional breakdown by session/asset/setup/grade), `get_equity_curve`, `get_period_stats` " +
    "(monthly or weekly), `get_trade_stats`. " +
    "Trades: `list_trades` (filter by pair, session, setup, grade, result, direction, date range, min RR; " +
    "sorted and paginated), `search_trades` (free text), `get_trade` (full record by id), `list_recent_trades`. " +
    "Planning: `get_daily_plan`, `list_daily_plans`, `get_weekly_plan`. " +
    "Routine & journal: `get_checklist` (progress, history, streaks), `search_notebook`. " +
    "All tools are scoped to the signed-in user and enforce row-level security; no tool can read another " +
    "user's data or execute SQL. Prefer filtered, paginated calls over fetching everything.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getDashboardSummary,
    getPerformanceMetrics,
    getEquityCurve,
    getPeriodStats,
    getTradeStats,
    listTrades,
    searchTrades,
    getTrade,
    listRecentTrades,
    getDailyPlan,
    listDailyPlans,
    getWeeklyPlan,
    getChecklist,
    searchNotebook,
  ],
});
