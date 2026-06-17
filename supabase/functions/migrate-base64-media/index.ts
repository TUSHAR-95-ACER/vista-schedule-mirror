// Migrate base64 image payloads from JSONB / text columns into the
// journal-media storage bucket. Idempotent, batch-safe, retry-safe.
//
// POST body: { dryRun?: boolean, batchSize?: number (default 25), userId?: string }
// - dryRun=true: scan only, report counts. No writes.
// - dryRun=false: upload + rewrite rows in batches.
//
// Scope (per user confirmation):
//   - trades:        prediction_image, execution_image, trade_journey (timeline)
//   - daily_plans:   pairs (jsonb)
//   - weekly_plans:  pair_analyses (jsonb)
//
// Idempotency: rows are only touched when at least one `data:image/...`
// payload is found. Already-URL images are left untouched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "journal-media";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

const BASE64_RE = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/;

interface ScanResult {
  table: string;
  rowsScanned: number;
  rowsWithBase64: number;
  imagesFound: number;
  estimatedBytes: number;
}

interface MigrationStats extends ScanResult {
  rowsMigrated: number;
  imagesMigrated: number;
  errors: string[];
}

function isBase64Image(v: unknown): v is string {
  return typeof v === "string" && BASE64_RE.test(v);
}

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  if (m.includes("webp")) return "webp";
  if (m.includes("svg")) return "svg";
  return "bin";
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Walk arbitrary JSON; call `visit` on every string value with a path setter.
type Visitor = (value: string, setter: (next: string) => void) => Promise<void> | void;

async function walkJson(node: any, visit: Visitor): Promise<void> {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (typeof child === "string") {
        await visit(child, (next) => (node[i] = next));
      } else if (child && typeof child === "object") {
        await walkJson(child, visit);
      }
    }
    return;
  }
  if (typeof node === "object") {
    for (const k of Object.keys(node)) {
      const child = node[k];
      if (typeof child === "string") {
        await visit(child, (next) => (node[k] = next));
      } else if (child && typeof child === "object") {
        await walkJson(child, visit);
      }
    }
  }
}

interface TableConfig {
  table: "trades" | "daily_plans" | "weekly_plans";
  jsonbCols: string[];
  textCols: string[];
}

const TABLES: TableConfig[] = [
  {
    table: "trades",
    jsonbCols: ["trade_journey"],
    textCols: ["prediction_image", "execution_image"],
  },
  { table: "daily_plans", jsonbCols: ["pairs"], textCols: [] },
  { table: "weekly_plans", jsonbCols: ["pair_analyses"], textCols: [] },
];

async function scanRow(
  row: any,
  cfg: TableConfig,
): Promise<{ base64Strings: string[] }> {
  const found: string[] = [];
  for (const col of cfg.textCols) {
    if (isBase64Image(row[col])) found.push(row[col]);
  }
  for (const col of cfg.jsonbCols) {
    await walkJson(row[col], (val) => {
      if (BASE64_RE.test(val)) found.push(val);
    });
  }
  return { base64Strings: found };
}

async function uploadAndSign(
  admin: ReturnType<typeof createClient>,
  userId: string,
  table: string,
  rowId: string,
  b64: string,
  cache: Map<string, string>,
): Promise<string | null> {
  const m = b64.match(BASE64_RE);
  if (!m) return null;
  const mime = `image/${m[1]}`;
  const bytes = base64ToBytes(m[2]);
  const hash = await sha1Hex(bytes);
  const cacheKey = `${userId}:${hash}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const ext = extFromMime(mime);
  const path = `${userId}/migrated/${table}/${rowId}/${hash}.${ext}`;

  // upsert: true makes this retry-safe; same hash → same path → no duplicate.
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true, cacheControl: "31536000" });
  if (upErr && !`${upErr.message}`.toLowerCase().includes("already exists")) {
    throw upErr;
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !signed) throw signErr ?? new Error("sign failed");
  cache.set(cacheKey, signed.signedUrl);
  return signed.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: require a logged-in user.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = body.dryRun !== false; // default DRY RUN
    const batchSize: number = Math.min(Math.max(Number(body.batchSize) || 25, 1), 100);
    const targetUserId: string = body.userId || callerId;

    // Only allow callers to migrate their own data.
    if (targetUserId !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const stats: MigrationStats[] = [];
    const log = (msg: string) => console.log(`[migrate-base64] ${msg}`);
    const uploadCache = new Map<string, string>();

    for (const cfg of TABLES) {
      const cols = ["id", ...cfg.textCols, ...cfg.jsonbCols].join(",");
      const tStats: MigrationStats = {
        table: cfg.table,
        rowsScanned: 0,
        rowsWithBase64: 0,
        imagesFound: 0,
        estimatedBytes: 0,
        rowsMigrated: 0,
        imagesMigrated: 0,
        errors: [],
      };

      let from = 0;
      while (true) {
        const { data: rows, error } = await admin
          .from(cfg.table)
          .select(cols)
          .eq("user_id", targetUserId)
          .range(from, from + batchSize - 1);
        if (error) {
          tStats.errors.push(`fetch: ${error.message}`);
          break;
        }
        if (!rows || rows.length === 0) break;

        for (const row of rows as any[]) {
          tStats.rowsScanned++;
          const { base64Strings } = await scanRow(row, cfg);
          if (base64Strings.length === 0) continue;

          tStats.rowsWithBase64++;
          tStats.imagesFound += base64Strings.length;
          for (const s of base64Strings) {
            // rough decoded size: base64 length * 0.75
            tStats.estimatedBytes += Math.floor(((s.length - s.indexOf(",") - 1) * 3) / 4);
          }

          if (dryRun) continue;

          // Build update payload by re-walking and replacing in place.
          const update: Record<string, any> = {};
          let rowImageCount = 0;

          for (const col of cfg.textCols) {
            if (isBase64Image(row[col])) {
              try {
                const url = await uploadAndSign(admin, targetUserId, cfg.table, row.id, row[col], uploadCache);
                if (url) {
                  update[col] = url;
                  rowImageCount++;
                }
              } catch (e) {
                tStats.errors.push(`${cfg.table}#${row.id}.${col}: ${(e as Error).message}`);
              }
            }
          }

          for (const col of cfg.jsonbCols) {
            const clone = row[col] ? JSON.parse(JSON.stringify(row[col])) : null;
            if (!clone) continue;
            let mutated = false;
            await walkJson(clone, async (val, set) => {
              if (!BASE64_RE.test(val)) return;
              try {
                const url = await uploadAndSign(admin, targetUserId, cfg.table, row.id, val, uploadCache);
                if (url) {
                  set(url);
                  mutated = true;
                  rowImageCount++;
                }
              } catch (e) {
                tStats.errors.push(`${cfg.table}#${row.id}.${col}: ${(e as Error).message}`);
              }
            });
            if (mutated) update[col] = clone;
          }

          if (Object.keys(update).length > 0) {
            const { error: upErr } = await admin
              .from(cfg.table)
              .update(update)
              .eq("id", row.id)
              .eq("user_id", targetUserId);
            if (upErr) {
              tStats.errors.push(`${cfg.table}#${row.id} update: ${upErr.message}`);
            } else {
              tStats.rowsMigrated++;
              tStats.imagesMigrated += rowImageCount;
              log(`migrated ${cfg.table}#${row.id} (${rowImageCount} images)`);
            }
          }
        }

        log(`${cfg.table}: scanned ${tStats.rowsScanned} so far`);
        if (rows.length < batchSize) break;
        from += batchSize;
      }

      stats.push(tStats);
    }

    const summary = {
      dryRun,
      userId: targetUserId,
      batchSize,
      tables: stats,
      totals: stats.reduce(
        (a, s) => ({
          rowsScanned: a.rowsScanned + s.rowsScanned,
          rowsWithBase64: a.rowsWithBase64 + s.rowsWithBase64,
          imagesFound: a.imagesFound + s.imagesFound,
          estimatedBytes: a.estimatedBytes + s.estimatedBytes,
          rowsMigrated: a.rowsMigrated + s.rowsMigrated,
          imagesMigrated: a.imagesMigrated + s.imagesMigrated,
          errors: a.errors + s.errors.length,
        }),
        { rowsScanned: 0, rowsWithBase64: 0, imagesFound: 0, estimatedBytes: 0, rowsMigrated: 0, imagesMigrated: 0, errors: 0 },
      ),
    };

    log(`done: ${JSON.stringify(summary.totals)}`);
    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[migrate-base64] fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
