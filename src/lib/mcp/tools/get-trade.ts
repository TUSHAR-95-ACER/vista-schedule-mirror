import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../lib/client";

export default defineTool({
  name: "get_trade",
  title: "Get a trade by ID",
  description:
    "Fetch one full trade record (including notes, confluences, psychology, management and analysis) by its ID, scoped to the signed-in user.",
  inputSchema: {
    id: z.string().describe("The trade ID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("trades")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .eq("id", id)
      .maybeSingle();
    if (error) return failure(error.message);
    if (!data) return failure(`No trade found with id "${id}".`);
    return ok({ trade: data });
  },
});
