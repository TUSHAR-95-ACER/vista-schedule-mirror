import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("read-only MCP release", () => {
  const manifest = JSON.parse(readFileSync(resolve(".lovable/mcp/manifest.json"), "utf8"));

  it("advertises only the 23 read-only tools", () => {
    expect(manifest.mcp.tools).toHaveLength(23);
    for (const tool of manifest.mcp.tools) {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.name).not.toMatch(/^(create|update|delete|upsert|execute|place)_/);
    }
  });

  it("contains no database mutations in MCP sources", () => {
    for (const directory of ["src/lib/mcp/tools", "src/lib/mcp/lib"]) {
      for (const file of readdirSync(resolve(directory))) {
        if (!file.endsWith(".ts")) continue;
        const source = readFileSync(resolve(directory, file), "utf8");
        expect(source).not.toMatch(/\.(insert|update|delete|upsert|rpc)\s*\(/);
        expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      }
    }
  });

  it("keeps OAuth enabled and the caller token required", () => {
    const entry = readFileSync(resolve("src/lib/mcp/index.ts"), "utf8");
    const factory = readFileSync(resolve("src/lib/mcp/lib/client.ts"), "utf8");
    expect(entry).toContain("auth.oauth.issuer(");
    expect(entry).not.toContain("requireOAuthClientClaim: false");
    expect(factory).toContain("!ctx.isAuthenticated() || !token");
    expect(factory).toContain("Authorization: `Bearer ${token}`");
  });
});