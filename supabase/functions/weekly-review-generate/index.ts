// Auto-generate a complete Weekly Review from the week's Daily Plans + Trades.
// Returns structured JSON consumed by the Weekly Review page.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { aiChat, aiErrorResponse } from "../_shared/lovable-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmt(d: string) { try { return new Date(d).toISOString().split("T")[0]; } catch { return d; } }
function safe(v: any) { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { weekStart } = await req.json();
    if (!weekStart) {
      return new Response(JSON.stringify({ error: "weekStart required (YYYY-MM-DD)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const start = new Date(weekStart);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const startStr = fmt(start.toISOString()); const endStr = fmt(end.toISOString());

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: dailyPlans }, { data: trades }, { data: weeklyPlan }] = await Promise.all([
      supabase.from("daily_plans").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr).order("date"),
      supabase.from("trades").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr).order("date"),
      supabase.from("weekly_plans").select("*").eq("user_id", userId).eq("week_start", startStr).maybeSingle(),
    ]);

    const days = (dailyPlans || []).map((p: any) => ({
      date: p.date,
      bias: p.daily_bias,
      session_focus: p.session_focus,
      max_trades: p.max_trades,
      risk_limit: p.risk_limit,
      took_trades: p.took_trades,
      day_summary: safe(p.day_summary),
      notes: p.note || safe(p.notes_journal),
      result_narrative: p.result_narrative,
      pairs: safe(p.pairs),
      checklist: safe(p.checklist),
    }));

    const tradesLite = (trades || []).map((t: any) => ({
      date: t.date, pair: t.asset, dir: t.direction, setup: t.setup, grade: t.grade,
      result: t.result, pnl: t.profit_loss, rr: t.actual_rr, planned_rr: t.planned_rr,
      session: t.session, mistakes: safe(t.mistakes), psychology: safe(t.psychology), notes: t.notes,
    }));

    const wins = tradesLite.filter(t => t.result === "Win").length;
    const losses = tradesLite.filter(t => t.result === "Loss").length;
    const pnl = tradesLite.reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0);

    const sys = `You are a professional institutional trading coach writing a weekly review for a trader's journal.
You will receive ALL data from a single trading week (Mon–Fri daily plans, all trades, plus the weekly plan).
Read everything carefully, find recurring patterns, and write a complete, mentor-grade review.

OUTPUT RULES (STRICT JSON via tool call):
- Write in second person ("you", "your"). Direct, calm, specific, reference real pairs/dates/RR/mistake tags.
- Each long field should be 2–5 short paragraphs of plain prose (no markdown headings, no bullets unless listing 3+ items).
- Cite actual numbers from the data — never invent.
- If a section has no data, say "Not enough data this week to call this out."
- Tone: senior fund mentor reviewing a junior trader. Strict, fair, actionable.`;

    const userText = `WEEK: ${startStr} → ${endStr}
WIN/LOSS: ${wins}W / ${losses}L · NET P/L: ${pnl.toFixed(2)} · TRADES: ${tradesLite.length}

WEEKLY PLAN:
${JSON.stringify(weeklyPlan || {}, null, 0).slice(0, 4000)}

DAILY PLANS (Mon–Fri):
${JSON.stringify(days, null, 0).slice(0, 12000)}

TRADES TAKEN THIS WEEK:
${JSON.stringify(tradesLite, null, 0).slice(0, 10000)}`;

    const result = await aiChat({
      tier: "sonnet",
      max_tokens: 3200,
      temperature: 0.5,
      messages: [{ role: "system", content: sys }, { role: "user", content: userText }],
      tools: [{
        type: "function",
        function: {
          name: "emit_weekly_review",
          description: "Emit a complete structured weekly review.",
          parameters: {
            type: "object",
            properties: {
              weekly_narrative: { type: "string", description: "Market story of the week, plan vs execution, key themes" },
              reflection: { type: "string", description: "How you executed this week, emotional state, discipline" },
              lessons: { type: "string", description: "What to carry forward into next week" },
              mistakes: { type: "string", description: "Recurring mistakes detected across days/trades" },
              improvements: { type: "string", description: "Concrete process improvements to implement" },
              ai_review: { type: "string", description: "Senior-coach summary: patterns, strengths, missed opportunities, best & worst decision of the week, execution quality" },
            },
            required: ["weekly_narrative", "reflection", "lessons", "mistakes", "improvements", "ai_review"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_weekly_review" } },
    });

    const call = result?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) {
      return new Response(JSON.stringify({ error: "AI returned no review" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      weeklyNarrative: args.weekly_narrative || "",
      reflection: args.reflection || "",
      lessons: args.lessons || "",
      mistakes: args.mistakes || "",
      improvements: args.improvements || "",
      aiReview: args.ai_review || "",
      meta: { weekStart: startStr, weekEnd: endStr, trades: tradesLite.length, wins, losses, pnl },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return aiErrorResponse(e, corsHeaders);
  }
});
