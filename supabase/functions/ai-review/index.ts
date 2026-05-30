// Lovable AI Gateway (Google Gemini) integration for trading journal AI reviews.
// Multi-model routing:
//   - mode "quick" | "summary" | "psychology"  -> Flash Lite (cheap, fast)
//   - mode "review" | "mentor"                  -> Flash (balanced)
//   - mode "deep" | "full-journal"              -> Pro (premium, deep)
//
// Auth: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { aiChat, aiErrorResponse, type AiTier } from "../_shared/lovable-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Mode =
  | "quick"
  | "summary"
  | "psychology"
  | "review"
  | "mentor"
  | "deep"
  | "full-journal";

function pickTier(mode: Mode): { tier: AiTier; maxTokens: number } {
  switch (mode) {
    case "deep":
    case "full-journal":
      return { tier: "opus", maxTokens: 4000 };
    case "review":
    case "mentor":
      return { tier: "sonnet", maxTokens: 2000 };
    default:
      return { tier: "haiku", maxTokens: 1200 };
  }
}

const SYSTEM_PROMPT = `You are an elite institutional trading mentor for the TG Master Journal.
Voice: second person, calm, strict, analytical, deeply observant. Talk to the trader directly.
Never use corporate dashboard tone, motivational filler, emoji, or labels like RISK/EDGE/LEAK.
Reference real data from the payload (pairs, sessions, RR, dates, setups, mistakes) — never invent.
Keep responses institutional, analytical, and concise. Paragraph-style. If data is too thin, say so plainly.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!Deno.env.get("LOVABLE_API_KEY")) {
      return json({ error: "AI service not configured" }, 500);
    }

    // ── Input ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const mode: Mode = body.mode || "review";
    const prompt: string = (body.prompt || "").toString().slice(0, 16000);
    const payload = body.payload ?? null;

    if (!prompt) {
      return json({ error: "prompt is required" }, 400);
    }

    const { tier, maxTokens } = pickTier(mode);

    const userContent = payload
      ? `${prompt}\n\nJOURNAL DATA (JSON):\n${JSON.stringify(payload).slice(0, 14000)}`
      : prompt;

    let data: any;
    try {
      data = await aiChat({
        tier,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });
    } catch (e) {
      return aiErrorResponse(e, corsHeaders);
    }

    const text = (data?.choices?.[0]?.message?.content || "").trim();
    console.info("ai-review ok", { mode, tier, usage: data?.usage ?? null });
    return json({ text, mode }, 200);
  } catch (e) {
    console.error("ai-review error", e);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
