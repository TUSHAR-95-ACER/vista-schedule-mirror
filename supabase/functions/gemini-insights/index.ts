import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const DEFAULT_MODEL = "gemini-2.5-flash";

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      description: { type: "STRING" },
      severity: { type: "STRING", enum: ["info", "good", "warn", "critical"] },
    },
    required: ["title", "description"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { page, payload, model } = await req.json();
    if (!page || !payload) {
      return new Response(JSON.stringify({ error: "page and payload required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const useModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    const sys = `You are a senior trading performance analyst reviewing a trader's "${String(page).slice(0, 80)}" page.
Return 3 to 5 SHORT, SPECIFIC, ACTIONABLE insights grounded ONLY in the provided JSON data.
- No fluff, no motivational filler, no generic advice.
- Reference real numbers, pairs, sessions, setups when available.
- Each "description" max 2 sentences.
- "severity": "good" for edges/strengths, "warn" for leaks, "critical" for serious risk, "info" otherwise.`;

    const userText = `PAGE DATA (JSON):\n${JSON.stringify(payload).slice(0, 12000)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${KEY}`;
    const body = {
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Gemini error", r.status, text);
      return new Response(JSON.stringify({ error: `Gemini ${r.status}` }), {
        status: r.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let insights: any[] = [];
    try {
      insights = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try { insights = JSON.parse(match[0]); } catch { insights = []; }
      }
    }
    if (!Array.isArray(insights)) insights = [];
    insights = insights
      .filter((i) => i && typeof i.title === "string" && typeof i.description === "string")
      .slice(0, 5)
      .map((i) => ({
        title: String(i.title).slice(0, 80),
        description: String(i.description).slice(0, 280),
        severity: ["info", "good", "warn", "critical"].includes(i.severity) ? i.severity : "info",
      }));

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
