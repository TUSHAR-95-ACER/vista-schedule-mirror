// AI text rewrite for the journal RichTextEditor.
// Two modes only — kept intentionally simple:
//   - "improve" : fix grammar/spelling, keep voice, light emojis allowed.
//   - "polish"  : restructure for readability with headings/bullets when helpful.
// Returns HTML safe to drop back into Tiptap (paragraphs, headings, lists, strong/em).
//
// Auth: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiChat, aiErrorResponse } from "../_shared/lovable-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_IMPROVE = `You are a careful copy editor for a trader's personal journal.
Task: Fix grammar, spelling, and punctuation. Keep the trader's natural voice and tone EXACTLY.
Rules:
- Do NOT rephrase ideas or change meaning.
- Do NOT make it sound corporate, institutional, or AI-generated.
- Preserve every trading term verbatim (FVG, OB, BOS, CHOCH, DR, SMT, RR, SL, TP, SMC, ICT, NY/London/Asia, pair names, dollar amounts).
- You MAY add at most 1-3 small relevant emojis/symbols (📈 ✅ ⚠️ 🎯 💡) where they naturally fit.
- Keep the same paragraph structure.
Output ONLY valid HTML using <p>, <strong>, <em>, <ul>, <li>, <br>. No markdown, no code fences, no commentary.`;

const SYSTEM_POLISH = `You restructure a trader's personal journal note for readability.
Rules:
- Keep the trader's natural personal voice — first person, casual where the original is casual.
- Reorganize into clear paragraphs, and add short headings (<h3>) or bullet lists (<ul><li>) ONLY when it genuinely improves clarity.
- Preserve every trading term verbatim (FVG, OB, BOS, CHOCH, DR, SMT, RR, SL, TP, pair names, prices).
- Do NOT add new analysis, ideas, or facts. Do NOT use corporate or institutional language.
- Keep it concise. Do not pad.
Output ONLY valid HTML using <h3>, <p>, <strong>, <em>, <ul>, <li>, <br>. No markdown, no code fences, no commentary.`;

function stripCodeFence(s: string): string {
  return s.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mode, html } = await req.json();
    if (!html || typeof html !== "string" || !html.trim()) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode !== "improve" && mode !== "polish") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = mode === "polish" ? SYSTEM_POLISH : SYSTEM_IMPROVE;
    const result = await aiChat({
      tier: "sonnet",
      temperature: mode === "improve" ? 0.2 : 0.4,
      max_tokens: 2000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Rewrite the following journal note. Input HTML:\n\n${html}` },
      ],
    });

    const out = result?.choices?.[0]?.message?.content || "";
    const cleaned = stripCodeFence(typeof out === "string" ? out : "");
    return new Response(JSON.stringify({ html: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return aiErrorResponse(e, corsHeaders);
  }
});
