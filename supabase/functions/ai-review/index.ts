// AWS Bedrock Claude integration for trading journal AI reviews.
// Multi-model routing:
//   - mode "quick" | "summary" | "psychology"  -> Claude Haiku (cheap, fast)
//   - mode "review" | "mentor"                  -> Claude Sonnet (balanced)
//   - mode "deep" | "full-journal"              -> Claude Opus (premium, deep)
//
// Auth: Bedrock long-lived API key (bearer token) via BEDROCK_API_KEY secret.
// Region via BEDROCK_REGION (default us-east-1).
// API key NEVER leaves the edge function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Inference profile IDs (cross-region). Use prefixed IDs for broader availability.
const _RAW_REGION = (Deno.env.get("BEDROCK_REGION") || "").trim().toLowerCase();
const REGION_FOR_PREFIX = /^[a-z]{2}-[a-z]+-\d+$/.test(_RAW_REGION) ? _RAW_REGION : "us-east-1";
const PREFIX = REGION_FOR_PREFIX.startsWith("eu-") ? "eu"
  : REGION_FOR_PREFIX.startsWith("ap-") ? "apac" : "us";

const MODEL_MAP: Record<"haiku" | "sonnet" | "opus", string> = {
  haiku:  `${PREFIX}.anthropic.claude-haiku-4-5-20251001-v1:0`,
  sonnet: `${PREFIX}.anthropic.claude-sonnet-4-5-20250929-v1:0`,
  opus:   `${PREFIX}.anthropic.claude-opus-4-1-20250805-v1:0`,
};

function pickModel(mode: Mode): { id: string; tier: string; maxTokens: number } {
  switch (mode) {
    case "deep":
    case "full-journal":
      return { id: MODEL_MAP.opus, tier: "opus", maxTokens: 4000 };
    case "review":
    case "mentor":
      return { id: MODEL_MAP.sonnet, tier: "sonnet", maxTokens: 2000 };
    default:
      return { id: MODEL_MAP.haiku, tier: "haiku", maxTokens: 1200 };
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
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      token,
    );
    if (claimsErr || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── Secrets ─────────────────────────────────────────────────────────
    const BEDROCK_API_KEY = Deno.env.get("BEDROCK_API_KEY");
    const REGION = REGION_FOR_PREFIX;
    if (!BEDROCK_API_KEY) {
      return json({ error: "Bedrock not configured" }, 500);
    }

    // ── Input ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const mode: Mode = body.mode || "review";
    const prompt: string = (body.prompt || "").toString().slice(0, 16000);
    const payload = body.payload ?? null;

    if (!prompt) {
      return json({ error: "prompt is required" }, 400);
    }

    const { id: modelId, tier, maxTokens } = pickModel(mode);

    // ── Build messages ──────────────────────────────────────────────────
    const userContent = payload
      ? `${prompt}\n\nJOURNAL DATA (JSON):\n${
        JSON.stringify(payload).slice(0, 14000)
      }`
      : prompt;

    // System prompt is server-controlled only; never honor client overrides.
    const bedrockBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    };

    // ── Call Bedrock InvokeModel ────────────────────────────────────────
    const url = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${
      encodeURIComponent(modelId)
    }/invoke`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BEDROCK_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bedrockBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Bedrock error", resp.status, "model=", modelId, "region=", REGION, errText);
      return json({
        error: `Bedrock error (${resp.status})`,
        detail: errText.slice(0, 1500),
        model: modelId,
        region: REGION,
        hint: resp.status === 403 || resp.status === 401
          ? "Verify BEDROCK_API_KEY is valid and model access is granted in this region. For eu-north-1 use the 'eu.' inference profile prefix."
          : resp.status === 404
          ? "Model/profile not available in this region. Check BEDROCK_REGION and model availability."
          : undefined,
      }, resp.status >= 400 && resp.status < 600 ? resp.status : 502);
    }

    const data = await resp.json();
    // Anthropic-on-Bedrock response shape: { content: [{type:"text", text:"..."}], usage: {...} }
    const text = Array.isArray(data?.content)
      ? data.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim()
      : "";

    return json({
      text,
      model: modelId,
      tier,
      mode,
      usage: data?.usage ?? null,
    }, 200);
  } catch (e) {
    console.error("ai-review error", e);
    return json(
      { error: e instanceof Error ? e.message : "Internal error" },
      500,
    );
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
