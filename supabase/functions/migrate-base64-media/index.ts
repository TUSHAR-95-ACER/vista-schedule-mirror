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
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

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

// Normalize a jsonb column that may have been stored as a JSON-encoded string
// (so the actual array/object lives inside a string). Returns { parsed, wasString }.
function normalizeJsonbColumn(value: any): { parsed: any; wasString: boolean } {
  if (typeof value === "string") {
    try {
      return { parsed: JSON.parse(value), wasString: true };
    } catch {
      return { parsed: value, wasString: false };
    }
  }
  return { parsed: value, wasString: false };
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
    const { parsed } = normalizeJsonbColumn(row[col]);
    await walkJson(parsed, (val) => {
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
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const adminHeader = req.headers.get("x-admin-token") ?? "";

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = body.dryRun !== false; // default DRY RUN
    const batchSize: number = Math.min(Math.max(Number(body.batchSize) || 25, 1), 100);

    let callerId: string | null = null;

    // Service-mode: requires LOVABLE_API_KEY match AND explicit userId.
    if (LOVABLE_KEY && adminHeader && adminHeader === LOVABLE_KEY && body.userId) {
      callerId = String(body.userId);
    } else {
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
      callerId = userData.user.id;
    }

    const targetUserId: string = body.userId || callerId!;
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

    const tableFilter: string | null = body.table ?? null;
    const maxRows: number = Math.max(0, Number(body.maxRows) || 0); // 0 = no cap
    let processedTotal = 0;
    let exhausted = false;

    for (const cfg of TABLES) {
      if (tableFilter && cfg.table !== tableFilter) continue;
      if (exhausted) break;

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
            if (row[col] == null) continue;
            const { parsed, wasString } = normalizeJsonbColumn(row[col]);
            const clone = JSON.parse(JSON.stringify(parsed));
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
            // Re-serialize back as a JSON string when the column was stored that way,
            // to preserve the existing on-disk format used by the app.
            if (mutated) update[col] = wasString ? JSON.stringify(clone) : clone;
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
          if (!dryRun && Object.keys(update).length > 0) {
            processedTotal++;
            if (maxRows > 0 && processedTotal >= maxRows) {
              exhausted = true;
              break;
            }
          }
        }

        log(`${cfg.table}: scanned ${tStats.rowsScanned} so far`);
        if (exhausted) break;
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
