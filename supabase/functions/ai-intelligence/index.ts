import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = ["trades", "weekly_plans", "daily_plans", "trading_accounts"];

function safeParseJson(v: any) {
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return v; } }
  return v;
}

function fmtDate(d: string) {
  try { const x = new Date(d); return x.toISOString().split("T")[0]; } catch { return d; }
}

async function fetchData(supabase: any, userId: string) {
  const out: Record<string, any> = {};
  await Promise.all(TABLES.map(async (t) => {
    const { data } = await supabase.from(t).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(150);
    out[t] = data || [];
  }));
  return out;
}

function buildContext(d: Record<string, any>): string {
  const trades = (d.trades || []).slice(0, 60).map((t: any) => ({
    date: fmtDate(t.date),
    pair: t.asset, dir: t.direction, session: t.session, setup: t.setup, grade: t.grade,
    result: t.result, pnl: t.profit_loss, rr: t.actual_rr, planned_rr: t.planned_rr,
    mistakes: safeParseJson(t.mistakes) || [], notes: (t.notes || "").slice(0, 200),
  }));
  const weekly = (d.weekly_plans || []).slice(0, 4).map((p: any) => ({
    week: fmtDate(p.week_start), bias: p.bias, goals: (p.goals || "").slice(0, 200),
  }));
  const daily = (d.daily_plans || []).slice(0, 10).map((p: any) => ({
    date: fmtDate(p.date), session: p.session_focus, took: p.took_trades, bias: p.daily_bias,
  }));
  return JSON.stringify({ trades, weekly, daily, total_trades: (d.trades || []).length });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return new Response(JSON.stringify({ error: "AI key missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub;

    const supabase = createClient(url, svc);
    const { mode = "brief", model } = await req.json().catch(() => ({}));
    const data = await fetchData(supabase, userId);
    const context = buildContext(data);

    const briefPrompt = `You are a senior trading performance analyst. Based on this trader's journal data, produce a CONCISE weekly performance brief (5-7 bullet points). Focus on what changed, leaks, edges, behavioral patterns, and the single most important focus. No fluff. Reference real numbers/pairs/sessions when possible. Output as markdown bullets only.\n\nDATA:\n${context}`;

    const panelsPrompt = `You are a trading analyst. From this journal data, produce JSON with exactly these keys, each a SHORT (max 2 sentences) data-grounded insight: biggest_leak, best_edge, behavior_pattern, execution_flaw, risk_profile, this_week_focus. Reference real pairs/sessions/numbers.\n\nDATA:\n${context}`;

    const useModel = model || (mode === "deep" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash");

    if (mode === "panels") {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: useModel,
          messages: [{ role: "user", content: panelsPrompt }],
          tools: [{ type: "function", function: { name: "intelligence_panels", description: "Trading intelligence panels", parameters: { type: "object", properties: {
            biggest_leak: { type: "string" }, best_edge: { type: "string" },
            behavior_pattern: { type: "string" }, execution_flaw: { type: "string" },
            risk_profile: { type: "string" }, this_week_focus: { type: "string" },
          }, required: ["biggest_leak","best_edge","behavior_pattern","execution_flaw","risk_profile","this_week_focus"] } } }],
          tool_choice: { type: "function", function: { name: "intelligence_panels" } },
        }),
      });
      if (!r.ok) {
        const text = await r.text(); console.error(text);
        return new Response(JSON.stringify({ error: r.status === 429 ? "Rate limited" : r.status === 402 ? "Add credits" : "AI error" }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const j = await r.json();
      const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : {};
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // brief (non-streaming, simple)
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: useModel, messages: [{ role: "user", content: briefPrompt }] }),
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.status === 429 ? "Rate limited" : r.status === 402 ? "Add credits" : "AI error" }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ brief: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
