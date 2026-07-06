import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRecentTrades from "./tools/list-recent-trades";
import getTradeStats from "./tools/get-trade-stats";
import getDailyPlan from "./tools/get-daily-plan";

// Build the OAuth issuer from the project ref (Vite inlines this literal at
// build time, so it stays import-safe — no runtime env reads at module top
// level). Must be the direct supabase.co host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tg-master-journal-mcp",
  title: "TG Master Journal",
  version: "0.1.0",
  instructions:
    "Read-only tools for TG Master Journal, a professional trading operating system. " +
    "Use `list_recent_trades` to browse recent trades, `get_trade_stats` for aggregate " +
    "performance (win rate, total P/L, average R), and `get_daily_plan` to fetch a day's " +
    "trading plan. All tools are scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRecentTrades, getTradeStats, getDailyPlan],
});
