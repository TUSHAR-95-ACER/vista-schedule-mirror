import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLES = [
  "trades",
  "trading_accounts",
  "transactions",
  "scale_events",
  "weekly_plans",
  "daily_plans",
  "user_settings",
];

async function fetchAllUserData(supabase: any, userId: string) {
  const context: Record<string, any> = {};

  const results = await Promise.all(
    TABLES.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      return { table, data: data || [], error };
    })
  );

  for (const { table, data } of results) {
    context[table] = data;
  }

  return context;
}

// Format date to readable "23 Mar 2026" style
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

// Parse JSON string fields safely
function safeParseJson(val: any): any {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

// Transform raw trade into a human-readable summary object (no IDs, no images)
function transformTrade(trade: any): any {
  const mistakes = safeParseJson(trade.mistakes);
  const psychology = safeParseJson(trade.psychology);
  const management = safeParseJson(trade.management);
  const confluences = safeParseJson(trade.confluences);

  // Build a readable label like "GBPUSD • 01 Apr 2026 • New York KZ • Loss"
  const parts = [trade.asset, formatDate(trade.date)];
  if (trade.session) parts.push(trade.session);
  parts.push(trade.result);
  if (Array.isArray(mistakes) && mistakes.length > 0) {
    parts.push(`(${mistakes.join(", ")})`);
  }
  const label = parts.join(" • ");

  return {
    label,
    direction: trade.direction,
    setup: trade.setup,
    market: trade.market,
    market_condition: trade.market_condition,
    grade: trade.grade || "N/A",
    timeframe: trade.timeframe || "N/A",
    trend: trade.trend || "N/A",
    entry_price: trade.entry_price,
    stop_loss: trade.stop_loss,
    take_profit: trade.take_profit,
    exit_price: trade.exit_price,
    planned_rr: trade.planned_rr,
    actual_rr: trade.actual_rr,
    profit_loss: trade.profit_loss,
    fees: trade.fees,
    entry_time: trade.entry_time,
    exit_time: trade.exit_time,
    max_rr_reached: trade.max_rr_reached,
    max_adverse_move: trade.max_adverse_move,
    confluences: Array.isArray(confluences) ? confluences : [],
    mistakes: Array.isArray(mistakes) ? mistakes : [],
    psychology: Array.isArray(psychology) ? psychology : [],
    management: Array.isArray(management) ? management : [],
    notes: trade.notes || "",
  };
}

// Transform a plan into readable format (strip images/binary)
function transformPlan(plan: any, type: "weekly" | "daily"): any {
  const result: any = {};
  if (type === "daily") {
    result.label = `Daily Plan • ${formatDate(plan.date)} • ${plan.session_focus} • Bias: ${plan.daily_bias}`;
    result.max_trades = plan.max_trades;
    result.risk_limit = plan.risk_limit;
    result.took_trades = plan.took_trades;
    result.reviewed = plan.reviewed;
    result.result_narrative = plan.result_narrative;
    result.note = plan.note;
    // Parse pairs but strip images
    const pairs = safeParseJson(plan.pairs);
    if (Array.isArray(pairs)) {
      result.pairs = pairs.map((p: any) => ({
        pair: p.pair, bias: p.bias, setup: p.setup, keyLevels: p.keyLevels, narrative: p.narrative,
      }));
    }
  } else {
    result.label = `Weekly Plan • Week of ${formatDate(plan.week_start)} • Bias: ${plan.bias || "None"}`;
    result.risk = plan.risk;
    result.goals = plan.goals;
    result.levels = plan.levels;
    result.reviewed = plan.reviewed;
    result.markets = safeParseJson(plan.markets);
    result.setups = safeParseJson(plan.setups);
    // Parse pair analyses but strip images
    const analyses = safeParseJson(plan.pair_analyses);
    if (Array.isArray(analyses)) {
      result.pair_analyses = analyses.map((a: any) => ({
        pair: a.pair, bias: a.bias, keyLevels: a.keyLevels, narrative: a.narrative,
        expectedDirection: a.expectedDirection, actualDirection: a.actualDirection,
        actualResult: a.actualResult, note: a.note,
      }));
    }
  }
  return result;
}

// Transform account to readable format (no IDs)
function transformAccount(acc: any): any {
  return {
    label: `${acc.name} (${acc.broker}) • ${acc.type} • ${acc.currency}`,
    status: acc.status,
    stage: acc.stage,
    starting_balance: acc.starting_balance,
    current_size: acc.current_size,
    initial_size: acc.initial_size,
    target_balance: acc.target_balance,
    target_percent: acc.target_percent,
    daily_drawdown_limit: acc.daily_drawdown_limit,
    daily_drawdown_percent: acc.daily_drawdown_percent,
    max_drawdown_limit: acc.max_drawdown_limit,
    max_drawdown_percent: acc.max_drawdown_percent,
    steps: acc.steps,
  };
}

function buildReadableContext(context: Record<string, any>): string {
  const readable: Record<string, any> = {};

  // Trades — transform to readable labels
  const trades = context.trades || [];
  readable.trades = trades.slice(0, 30).map(transformTrade);
  readable.trades_total_count = trades.length;

  // Accounts
  const accounts = context.trading_accounts || [];
  readable.accounts = accounts.map(transformAccount);

  // Weekly plans
  const weeklyPlans = context.weekly_plans || [];
  readable.weekly_plans = weeklyPlans.slice(0, 5).map((p: any) => transformPlan(p, "weekly"));
  readable.weekly_plans_total_count = weeklyPlans.length;

  // Daily plans
  const dailyPlans = context.daily_plans || [];
  readable.daily_plans = dailyPlans.slice(0, 5).map((p: any) => transformPlan(p, "daily"));
  readable.daily_plans_total_count = dailyPlans.length;

  // Transactions — simplified
  const transactions = context.transactions || [];
  readable.transactions = transactions.slice(0, 20).map((t: any) => ({
    type: t.type, amount: t.amount, date: formatDate(t.date), note: t.note,
  }));

  // Scale events — simplified
  const scaleEvents = context.scale_events || [];
  readable.scale_events = scaleEvents.slice(0, 10).map((s: any) => ({
    date: formatDate(s.date), old_size: s.old_size, new_size: s.new_size, note: s.note,
  }));

  // User settings — pass through (already small)
  readable.user_settings = context.user_settings;

  let json = JSON.stringify(readable);
  // Safety: if still too large, cut trades further
  if (json.length > 30000) {
    readable.trades = readable.trades.slice(0, 15);
    json = JSON.stringify(readable);
  }
  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Groq API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Use service role to fetch all user data (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all user data and build human-readable context
    const userData = await fetchAllUserData(supabase, userId);
    const dataContext = buildReadableContext(userData);

    const systemPrompt = `You are an advanced trading performance coach and AI mentor.
You have access to the user's FULL trading journal database in human-readable format:

${dataContext}

YOUR ROLE:
- Understand user's trading behavior deeply
- Analyze performance across all dimensions (trades, psychology, plans, mistakes, management)
- Detect patterns, mistakes, and strengths
- Give actionable improvements

CRITICAL RULES FOR REFERENCING TRADES:
- ALWAYS reference trades using their human-readable label like "GBPUSD • 1 Apr 2026 • New York Kill Zone • Loss"
- NEVER use or mention any internal IDs, UUIDs, or technical identifiers
- When discussing multiple trades, list them using their readable labels
- When pointing out a specific trade, include the pair, date, session, and result
- If a trade has mistakes tagged, include them in the reference like "GBPUSD • 1 Apr 2026 • Loss (FOMO, Overtrading)"

GENERAL RULES:
- DO NOT assume or invent data that isn't provided
- Use ONLY the provided data for trading-related questions
- If question is general (not about their trading) → answer normally as a helpful coach
- If question is about their trading → MUST reference their actual data with readable labels
- If insufficient data exists → say "Not enough data yet to analyze this"

RESPONSE FORMAT (for trading analysis):
📊 **Insight**: [what you found — reference specific trades by their readable labels]
🔍 **Reason**: [why this matters — use concrete numbers and dates]
🎯 **Action**: [what to do about it — specific, actionable advice]

For general questions, respond naturally without this format.

Be concise, data-driven, and supportive. Use numbers, dates, and specific trade references from their data.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
