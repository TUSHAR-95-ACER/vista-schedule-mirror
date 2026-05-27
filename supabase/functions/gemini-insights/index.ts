// Mentor-style insights — routed through Lovable AI Gateway (Google Gemini).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { aiChat, aiErrorResponse } from "../_shared/lovable-ai.ts";

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

    const sys = `You are a sharp trading coach producing PAGE INTELLIGENCE for the "${String(page).slice(0, 80)}" page.

OUTPUT RULES (STRICT):
- Return EXACTLY 5 bullets. No more, no less.
- Each bullet: ONE short sentence, max ~18 words. No paragraphs, no preamble, no markdown.
- Second person ("you", "your"). Direct, specific, reference real numbers/pairs/sessions from the data.
- The 5 bullets MUST cover, in this order:
  1. What happened (key result/pattern on this page)
  2. Biggest mistake
  3. Strongest behavior
  4. What to avoid next
  5. Next action (one concrete step)
- If data is too thin for a slot, say "Not enough data yet" for that bullet. Never invent.`;

    const userText = `JOURNAL DATA FOR THIS PAGE (JSON):\n${JSON.stringify(payload).slice(0, 12000)}`;

    let result;
    try {
      result = await aiChat({
        tier: "haiku",
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_insights",
            description: "Return exactly 5 concise page-intelligence bullets.",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Slot label: What happened | Biggest mistake | Strongest behavior | What to avoid | Next action" },
                      body: { type: "string", description: "ONE short sentence, max ~18 words." },
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
      return aiErrorResponse(e, corsHeaders);
    }

    const argsStr = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(argsStr); } catch { parsed = {}; }
    let insights = Array.isArray(parsed?.insights) ? parsed.insights : [];

    insights = insights
      .filter((i: any) => i && typeof i.title === "string" && typeof i.body === "string")
      .slice(0, 5)
      .map((i: any) => ({
        title: String(i.title).slice(0, 60),
        body: String(i.body).slice(0, 220),
        description: String(i.body).slice(0, 220),
        severity: ["info", "good", "warn", "critical"].includes(i.severity) ? i.severity : "info",
      }));

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-insights error", e);
    return new Response(JSON.stringify({ error: "Internal server error", insights: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
