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

// Strip base64 images and large binary data from records
function stripBinaryData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.startsWith("data:image/") || obj.length > 500) return "[image_data]";
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(stripBinaryData);
  if (typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip known image/binary fields entirely
      if (["prediction_image", "execution_image", "result_chart_image", "chartImage", "analysis_video_url"].includes(key)) {
        continue;
      }
      cleaned[key] = stripBinaryData(value);
    }
    return cleaned;
  }
  return obj;
}

function summarizeIfLarge(context: Record<string, any>): string {
  // First strip all binary/image data
  const cleaned = stripBinaryData(context);

  const summarized: Record<string, any> = {};
  for (const [table, data] of Object.entries(cleaned)) {
    if (!Array.isArray(data)) { summarized[table] = data; continue; }
    if (table === "trades") {
      summarized[table] = data.slice(0, 30);
      summarized[`${table}_total_count`] = data.length;
    } else if (table === "weekly_plans" || table === "daily_plans") {
      summarized[table] = data.slice(0, 5);
      summarized[`${table}_total_count`] = data.length;
    } else {
      summarized[table] = data;
    }
  }

  let json = JSON.stringify(summarized);
  // If still too large, further reduce
  if (json.length > 30000) {
    for (const [table, data] of Object.entries(summarized)) {
      if (Array.isArray(data) && data.length > 10) {
        summarized[table] = data.slice(0, 10);
      }
    }
    json = JSON.stringify(summarized);
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

    // Fetch all user data
    const userData = await fetchAllUserData(supabase, userId);
    const dataContext = summarizeIfLarge(userData);

    const systemPrompt = `You are an advanced trading performance coach and AI mentor.
You have access to the user's FULL trading journal database. Here is their complete data:

${dataContext}

YOUR ROLE:
- Understand user's trading behavior deeply
- Analyze performance across all dimensions (trades, psychology, plans, mistakes, backtesting)
- Detect patterns, mistakes, and strengths
- Give actionable improvements

RULES:
- DO NOT assume or invent data that isn't provided
- Use ONLY the provided data for trading-related questions
- If question is general (not about their trading) → answer normally as a helpful coach
- If question is about their trading → MUST reference their actual data
- If insufficient data exists → say "Not enough data yet to analyze this"

RESPONSE FORMAT (for trading analysis):
📊 **Insight**: [what you found]
🔍 **Reason**: [why this matters]
🎯 **Action**: [what to do about it]

For general questions, respond naturally without this format.

Be concise, data-driven, and supportive. Use numbers and specifics from their data.`;

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
