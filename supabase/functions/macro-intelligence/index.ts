import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL = {
  type: "function",
  function: {
    name: "emit_macro_intelligence",
    description: "Return a structured institutional macro intelligence snapshot.",
    parameters: {
      type: "object",
      properties: {
        macro_theme: { type: "string", description: "e.g. Inflation Cooling, Growth Slowdown" },
        fed_cycle: { type: "string", description: "Hike Cycle, Pause Cycle, Cut Cycle, Late Cycle, etc." },
        environment: { type: "string", description: "Risk-On, Risk-Off, Soft Landing, Stagflation, Recessionary, Late Cycle, Liquidity Stress, Inflationary" },
        narrative: { type: "string", description: "Current dominant institutional narrative, 1-2 sentences." },
        narrative_shift: { type: "string", description: "What changed vs prior snapshot. Empty string if first analysis." },
        interpretation: { type: "string", description: "Mentor-style paragraph: what happened, why it matters, fed implication, what may happen next. Probability language only." },
        fed_bias: { type: "string", enum: ["Hawkish", "Dovish", "Neutral", "Lean Hawkish", "Lean Dovish"] },
        usd_bias: { type: "string", enum: ["Bullish", "Bearish", "Neutral", "Lean Bullish", "Lean Bearish"] },
        gold_bias: { type: "string", enum: ["Bullish", "Bearish", "Neutral", "Lean Bullish", "Lean Bearish"] },
        fed_confidence: { type: "number", description: "0-100" },
        usd_confidence: { type: "number", description: "0-100" },
        gold_confidence: { type: "number", description: "0-100" },
        hawkish_probability: { type: "number" },
        dovish_probability: { type: "number" },
        rate_cut_probability: { type: "number" },
        rate_hike_probability: { type: "number" },
        recession_risk: { type: "number" },
        inflation_pressure: { type: "string", enum: ["Low", "Medium", "High", "Very High", "Cooling"] },
        market_focus: { type: "string", description: "What macro factor markets currently prioritize most." },
        smart_money_view: { type: "string", description: "Institutional interpretation paragraph." },
        expectation_pricing: { type: "string", description: "How much was already priced in; asymmetric reaction commentary." },
        positioning_risk: { type: "string", description: "Crowded long/short USD or Gold, squeeze risk, etc." },
        conflict_signals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conflict: { type: "string" },
              dominant_signal: { type: "string" },
              severity: { type: "string", enum: ["Low", "Medium", "High"] },
            },
            required: ["conflict", "dominant_signal", "severity"],
            additionalProperties: false,
          },
        },
        future_probabilities: {
          type: "array",
          description: "Forward-looking probabilistic outcomes.",
          items: {
            type: "object",
            properties: {
              outcome: { type: "string" },
              probability: { type: "number" },
              rationale: { type: "string" },
            },
            required: ["outcome", "probability", "rationale"],
            additionalProperties: false,
          },
        },
        trade_filter: { type: "string", description: "Actionable macro environment summary for trading." },
        confidence_level: { type: "string", enum: ["Low", "Medium", "High"] },
        per_event_analysis: {
          type: "array",
          description: "For each input event: surprise, trend, impact, brief reasoning.",
          items: {
            type: "object",
            properties: {
              event: { type: "string" },
              surprise: { type: "string", enum: ["Bullish USD", "Bearish USD", "Neutral", "Hot Inflation", "Cooling Inflation"] },
              trend: { type: "string", enum: ["Improving", "Weakening", "Stable"] },
              impact: { type: "string", enum: ["Low", "Medium", "High", "Very High"] },
              reasoning: { type: "string" },
            },
            required: ["event", "surprise", "trend", "impact", "reasoning"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "macro_theme", "fed_cycle", "environment", "narrative", "interpretation",
        "fed_bias", "usd_bias", "gold_bias", "fed_confidence", "usd_confidence", "gold_confidence",
        "hawkish_probability", "dovish_probability", "rate_cut_probability", "rate_hike_probability",
        "recession_risk", "inflation_pressure", "market_focus", "smart_money_view",
        "expectation_pricing", "positioning_risk", "conflict_signals", "future_probabilities",
        "trade_filter", "confidence_level", "per_event_analysis", "narrative_shift",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI Gateway not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseService);

    const { events = [], context = "" } = await req.json();
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: "events array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull last 3 prior analyses for narrative continuity
    const { data: priorAnalyses } = await supabase
      .from("macro_analyses")
      .select("analysis_date, macro_theme, fed_cycle, environment, narrative, fed_bias, usd_bias, gold_bias")
      .eq("user_id", userId)
      .order("analysis_date", { ascending: false })
      .limit(3);

    const today = new Date().toISOString().slice(0, 10);
    const eventsForAi = events.slice(0, 30).map((e: any) => ({
      event: String(e.event || "").slice(0, 80),
      previous: e.previous,
      forecast: e.forecast,
      actual: e.actual,
      unit: e.unit || "",
      release_date: e.release_date || today,
      notes: String(e.notes || "").slice(0, 300),
    }));

    const systemPrompt = `You are an institutional macro strategist for a hedge-fund-style trading terminal. Analyze the supplied US macro data points and emit a structured macro intelligence snapshot via the emit_macro_intelligence tool.

RULES:
- Always speak in probability language ("may", "likely", "probability increasing", "markets may interpret"). Never use "will", "guaranteed", "certain".
- Analyze BOTH Forecast vs Actual (surprise) AND Previous vs Actual (trend) — explain them separately in interpretation and per_event_analysis.reasoning.
- Separate ECONOMIC interpretation from MARKET PRICING interpretation (expectation_pricing).
- Detect macro conflicts (strong labor vs weak consumption, hot wages vs cooling CPI, etc.) and surface them in conflict_signals.
- Reference prior snapshots to detect narrative shifts. If first run, narrative_shift = "".
- Probabilities are 0-100 numbers. Confidences are 0-100.
- Focus: USD, Gold (XAUUSD), Fed expectations, macro cycle.
- Keep paragraphs concise, intelligent, institutional tone.`;

    const userMsg = `TODAY: ${today}

PRIOR SNAPSHOTS (most recent first, may be empty):
${JSON.stringify(priorAnalyses || [], null, 2)}

INPUT EVENTS:
${JSON.stringify(eventsForAi, null, 2)}

ADDITIONAL CONTEXT:
${String(context || "").slice(0, 1500)}

Emit the structured macro intelligence snapshot now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_macro_intelligence" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `AI service error (${response.status})` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(data).slice(0, 800));
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let parsed: any;
    try { parsed = JSON.parse(toolCall.function.arguments); }
    catch { return new Response(JSON.stringify({ error: "Malformed AI output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    return new Response(JSON.stringify({ analysis: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("macro-intelligence error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
