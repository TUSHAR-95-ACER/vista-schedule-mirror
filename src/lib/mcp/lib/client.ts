import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Per-request Supabase client that forwards the caller's verified OAuth token,
 * so RLS runs as the signed-in user. Never uses a service-role key.
 */
type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function publishableKey(): string {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)].find(
          (value): value is string => typeof value === "string" && value.trim().startsWith("sb_publishable_"),
        );
        if (key) return key.trim();
      }
    } catch {
      // Try the legacy public key names when the dictionary is malformed.
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("A public database key is required.");
}

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const token = ctx.getToken();
  if (!ctx.isAuthenticated() || !token) throw new Error("Verified OAuth identity required.");
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("Database URL is required.");
  return createClient(url, publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Sign in to TG Master Journal first." }],
    isError: true,
  };
}

export function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function ok(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

/** Normalized result buckets — stored values are capitalized ("Win", "Loss"). */
export const isWin = (r: unknown) => String(r ?? "").toLowerCase() === "win";
export const isLoss = (r: unknown) => String(r ?? "").toLowerCase() === "loss";
export const isBreakeven = (r: unknown) => String(r ?? "").toLowerCase() === "breakeven";
/** Trades that actually executed (exclude untriggered/cancelled and non-complete rows). */
export const isExecuted = (row: { result?: unknown; status?: unknown }) =>
  (isWin(row.result) || isLoss(row.result) || isBreakeven(row.result)) &&
  String(row.status ?? "Complete").toLowerCase() !== "draft";

export const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const round = (v: number, d = 2) => +v.toFixed(d);
