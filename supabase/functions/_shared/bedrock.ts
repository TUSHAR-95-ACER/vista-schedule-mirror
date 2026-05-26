// Shared AWS Bedrock (Anthropic Claude) client for all journal AI features.
// Provides an OpenAI-Chat-Completions-compatible shim so existing call sites
// (system/user/assistant messages, image_url parts, tools, tool_choice, stream)
// keep working with minimal changes.
//
// Auth: BEDROCK_API_KEY (Bedrock long-lived bearer token).
// Region: BEDROCK_REGION (default us-east-1).
//
// Routing:
//   tier "haiku"  -> Claude 3.5 Haiku   (cheap/fast: quick chips, panels)
//   tier "sonnet" -> Claude 3.5 Sonnet  (default: insights, mentor, vision, brief, macro)
//   tier "opus"   -> Claude Opus 4      (deep / full-journal only)

export type ClaudeTier = "haiku" | "sonnet" | "opus";

const RAW_REGION = (Deno.env.get("BEDROCK_REGION") || "").trim().toLowerCase();
// Guard against invalid values like "global" / empty — Bedrock needs a real AWS region.
const REGION = /^[a-z]{2}-[a-z]+-\d+$/.test(RAW_REGION) ? RAW_REGION : "us-east-1";
const BEDROCK_API_KEY = Deno.env.get("BEDROCK_API_KEY");

// Pick a cross-region inference profile prefix matching the region.
// Bedrock inference profiles are region-grouped: us.*, eu.*, apac.*
function regionPrefix(): "us" | "eu" | "apac" {
  if (REGION.startsWith("eu-")) return "eu";
  if (REGION.startsWith("ap-")) return "apac";
  return "us";
}
const P = regionPrefix();

// Current-generation Anthropic models on Bedrock (3.5/3.7 reached EOL).
const MODEL_BY_TIER: Record<ClaudeTier, string> = {
  haiku:  `${P}.anthropic.claude-haiku-4-5-20251001-v1:0`,
  sonnet: `${P}.anthropic.claude-sonnet-4-5-20250929-v1:0`,
  opus:   `${P}.anthropic.claude-opus-4-1-20250805-v1:0`,
};

// ---------- OpenAI-shape input types we accept ----------
export type OAITextPart  = { type: "text"; text: string };
export type OAIImagePart = { type: "image_url"; image_url: { url: string } };
export type OAIPart      = OAITextPart | OAIImagePart;
export type OAIMessage   = { role: "system" | "user" | "assistant"; content: string | OAIPart[] };

export interface OAITool {
  type: "function";
  function: { name: string; description?: string; parameters: any };
}
export type OAIToolChoice =
  | "auto" | "none"
  | { type: "function"; function: { name: string } };

export interface BedrockChatRequest {
  tier: ClaudeTier;
  messages: OAIMessage[];
  tools?: OAITool[];
  tool_choice?: OAIToolChoice;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

// ---------- Helpers: convert OpenAI -> Anthropic ----------
function dataUrlToImageBlock(url: string) {
  // data:image/png;base64,XXXX
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
  if (!m) return null;
  return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
}
function httpUrlToImageBlock(url: string) {
  return { type: "image", source: { type: "url", url } };
}

function toAnthropicContent(content: string | OAIPart[]): any[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  const out: any[] = [];
  for (const p of content) {
    if (p.type === "text") {
      if (p.text) out.push({ type: "text", text: p.text });
    } else if (p.type === "image_url") {
      const url = p.image_url?.url;
      if (!url) continue;
      if (url.startsWith("data:")) {
        const b = dataUrlToImageBlock(url);
        if (b) out.push(b);
      } else if (/^https?:\/\//i.test(url)) {
        out.push(httpUrlToImageBlock(url));
      }
    }
  }
  return out.length ? out : [{ type: "text", text: "" }];
}

function buildAnthropicBody(req: BedrockChatRequest) {
  // Split system out
  const systemParts: string[] = [];
  const msgs: any[] = [];
  for (const m of req.messages) {
    if (m.role === "system") {
      systemParts.push(typeof m.content === "string" ? m.content : m.content.map(p => (p.type === "text" ? p.text : "")).join(""));
    } else {
      msgs.push({ role: m.role, content: toAnthropicContent(m.content) });
    }
  }

  const body: any = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: req.max_tokens ?? 2000,
    messages: msgs,
  };
  if (systemParts.length) body.system = systemParts.join("\n\n");
  if (typeof req.temperature === "number") body.temperature = req.temperature;

  if (req.tools && req.tools.length) {
    body.tools = req.tools.map(t => ({
      name: t.function.name,
      description: t.function.description || "",
      input_schema: t.function.parameters,
    }));
    if (req.tool_choice && typeof req.tool_choice === "object" && req.tool_choice.type === "function") {
      body.tool_choice = { type: "tool", name: req.tool_choice.function.name };
    } else if (req.tool_choice === "none") {
      // omit tools when explicitly "none"
      delete body.tools;
    } else {
      body.tool_choice = { type: "auto" };
    }
  }
  return body;
}

// ---------- Convert Anthropic response -> OpenAI shape ----------
function anthropicToOAIResponse(data: any) {
  const blocks: any[] = Array.isArray(data?.content) ? data.content : [];
  let text = "";
  const tool_calls: any[] = [];
  for (const b of blocks) {
    if (b.type === "text") text += b.text || "";
    else if (b.type === "tool_use") {
      tool_calls.push({
        id: b.id || `call_${tool_calls.length}`,
        type: "function",
        function: {
          name: b.name,
          arguments: JSON.stringify(b.input ?? {}),
        },
      });
    }
  }
  return {
    id: data?.id,
    model: data?.model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: text || null,
        ...(tool_calls.length ? { tool_calls } : {}),
      },
      finish_reason: data?.stop_reason || "stop",
    }],
    usage: data?.usage,
  };
}

// ---------- Public API ----------
export class BedrockError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function endpoint(modelId: string) {
  return `https://bedrock-runtime.${REGION}.amazonaws.com/model/${encodeURIComponent(modelId)}`;
}

export async function bedrockChat(req: BedrockChatRequest) {
  if (!BEDROCK_API_KEY) throw new BedrockError(500, "BEDROCK_API_KEY not configured");
  const modelId = MODEL_BY_TIER[req.tier];
  const body = buildAnthropicBody(req);
  const resp = await fetch(`${endpoint(modelId)}/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BEDROCK_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Bedrock error", resp.status, text.slice(0, 800));
    throw new BedrockError(resp.status, text);
  }
  const data = await resp.json();
  return anthropicToOAIResponse(data);
}

/**
 * Streaming version. Returns an SSE ReadableStream emitting OpenAI-style chunks:
 *   data: {"choices":[{"delta":{"content":"hello"}}]}\n\n
 *   ...
 *   data: [DONE]\n\n
 * so existing OpenAI-compatible client parsers keep working unchanged.
 */
export async function bedrockStream(req: BedrockChatRequest): Promise<Response> {
  if (!BEDROCK_API_KEY) throw new BedrockError(500, "BEDROCK_API_KEY not configured");
  const modelId = MODEL_BY_TIER[req.tier];
  const body = buildAnthropicBody(req);

  const upstream = await fetch(`${endpoint(modelId)}/invoke-with-response-stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BEDROCK_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.amazon.eventstream",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error("Bedrock stream error", upstream.status, text.slice(0, 600));
    throw new BedrockError(upstream.status, text || "stream failed");
  }

  // Bedrock returns AWS event-stream framing. Each frame contains a JSON
  // payload whose "bytes" field is base64-encoded Anthropic stream JSON.
  // We scan the raw bytes for {"bytes":"..."} occurrences — robust enough
  // without implementing full eventstream framing.
  const reader = upstream.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: false });

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        // Find every "bytes":"..." occurrence
        const re = /"bytes":"([A-Za-z0-9+/=]+)"/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(chunk)) !== null) {
          let inner: any;
          try {
            const decoded = atob(m[1]);
            inner = JSON.parse(decoded);
          } catch { continue; }
          // Anthropic event types of interest
          if (inner.type === "content_block_delta") {
            const d = inner.delta;
            if (d?.type === "text_delta" && typeof d.text === "string" && d.text.length) {
              const payload = { choices: [{ delta: { content: d.text } }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          } else if (inner.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          } else if (inner.type === "error") {
            const msg = inner.error?.message || "stream error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
        }
      } catch (e) {
        console.error("bedrockStream pull error", e);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// Helper to translate BedrockError into a user-friendly edge response payload.
export function bedrockErrorResponse(e: unknown, corsHeaders: Record<string, string>) {
  const status = e instanceof BedrockError ? e.status : 500;
  let msg = "AI service error";
  if (e instanceof BedrockError) {
    console.error("Bedrock error detail", status, e.message?.slice(0, 1200));
    if (status === 401 || status === 403) msg = "AI service unavailable.";
    else if (status === 404) msg = "AI model unavailable.";
    else if (status === 429) msg = "AI service is busy. Try again shortly.";
    else if (status >= 500) msg = "AI service temporarily unavailable.";
    else msg = "AI service error.";
  } else if (e instanceof Error) {
    console.error("Bedrock non-BedrockError", e.message);
  }
  return new Response(JSON.stringify({ error: msg }), {
    status: status >= 400 && status < 600 ? status : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
