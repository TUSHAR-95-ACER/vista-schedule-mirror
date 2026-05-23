// Mentor-style insights — now routed through AWS Bedrock Claude Sonnet via the
// shared bedrock helper. Replaces previous Lovable AI Gateway dependency.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { bedrockChat, bedrockErrorResponse } from "../_shared/bedrock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  • a "title": a sentence-form human observation, e.g. "Your execution is better than your patience". Never use single-word labels.
  • a "body": flowing paragraph that does five things in order — observation, behavioural cause, evidence cited from the journal data (real numbers, pairs, sessions, dates, setups, mistakes, psychology entries), correction, future focus.
- Reference real data. Never invent. If data is too thin for an insight, write fewer insights rather than padding.
- Severity is internal only: "good" for genuine strengths, "warn" for leaks, "critical" for serious risk, "info" otherwise.`;

    const userText = `JOURNAL DATA FOR THIS PAGE (JSON):\n${JSON.stringify(payload).slice(0, 14000)}`;

    let result;
    try {
      result = await bedrockChat({
        tier: "sonnet",
        max_tokens: 2500,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
        tools: [{
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
                  },
                },
              },
              required: ["insights"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      });
    } catch (e) {
      return bedrockErrorResponse(e, corsHeaders);
    }

    const argsStr = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(argsStr); } catch { parsed = {}; }
    let insights = Array.isArray(parsed?.insights) ? parsed.insights : [];

    insights = insights
      .filter((i: any) => i && typeof i.title === "string" && typeof i.body === "string")
      .slice(0, 4)
      .map((i: any) => ({
        title: String(i.title).slice(0, 140),
        body: String(i.body).slice(0, 1400),
        description: String(i.body).slice(0, 1400),
        severity: ["info", "good", "warn", "critical"].includes(i.severity) ? i.severity : "info",
      }));

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-insights error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error", insights: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
