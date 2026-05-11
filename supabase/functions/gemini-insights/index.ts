import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI Gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { page, payload } = await req.json();
    if (!page || !payload) {
      return new Response(JSON.stringify({ error: "page and payload required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are an elite institutional trading mentor — part performance coach, part trading psychologist, part prop-firm risk manager. The user is reviewing their "${String(page).slice(0, 80)}" page and wants you to read their journal data like a real coach would.

VOICE
- Talk to the trader directly, second person ("you", "your"). Calm, strict, deeply observant.
- No corporate dashboard tone, no motivational filler, no emoji headers, no labels like RISK/EDGE/LEAK.
- Write like a mentor reviewing their journal aloud — psychologically aware, emotionally intelligent, brutally honest, never robotic.

WHAT TO PRODUCE
- 3 to 4 long-form insights. Each one is a meaningful paragraph (4 to 7 sentences), not a one-liner.
- Each insight has:
  • a "title": a sentence-form human observation, e.g. "Your execution is better than your patience", "Most losses started after emotional urgency", "You already know your edge but ignore it". Never use single-word labels.
  • a "body": flowing paragraph that does five things in order — observation, behavioural cause, evidence cited from the journal data (real numbers, pairs, sessions, dates, setups, mistakes, psychology entries), correction, future focus.
- Reference real data: pairs, sessions, RR, dates, setup names, recurring mistakes, plan-vs-execution gaps. Never invent.
- If the data is too thin for an insight, write fewer insights rather than padding.
- Severity is internal only: "good" for genuine strengths, "warn" for leaks, "critical" for serious risk, "info" otherwise.`;

    const userText = `JOURNAL DATA FOR THIS PAGE (JSON):\n${JSON.stringify(payload).slice(0, 14000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_insights",
              description: "Return mentor-style insights about the trader's journal.",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Sentence-form observation, never a single label." },
                        body: { type: "string", description: "Long-form paragraph: observation, cause, evidence, correction, future focus." },
                        severity: { type: "string", enum: ["info", "good", "warn", "critical"] },
                      },
                      required: ["title", "body"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await response.json();
    const argsStr = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(argsStr); } catch { parsed = {}; }
    let insights = Array.isArray(parsed?.insights) ? parsed.insights : [];

    // Backward compatibility for older clients reading "description"
    insights = insights
      .filter((i: any) => i && typeof i.title === "string" && typeof i.body === "string")
      .slice(0, 4)
      .map((i: any) => ({
        title: String(i.title).slice(0, 140),
        body: String(i.body).slice(0, 1400),
        description: String(i.body).slice(0, 1400), // legacy field name
        severity: ["info", "good", "warn", "critical"].includes(i.severity) ? i.severity : "info",
      }));

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
