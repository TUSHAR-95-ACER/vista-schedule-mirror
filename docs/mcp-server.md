# TG Master Journal — MCP Server

Version **0.2.0** · Phase 1 (authentication + read-only tools)

The server exposes TG Master Journal as standard MCP tools so ChatGPT, Claude
Desktop, VS Code / Copilot and any other MCP-compatible client can read the
signed-in user's journal.

## Endpoint

```
https://<project-ref>.supabase.co/functions/v1/mcp
```

Transport: MCP Streamable HTTP. The exact URL is shown in the app under
**Settings → AI**.

## Authentication

- OAuth 2.1 against the app's own auth server (`/auth/v1`), audience
  `authenticated`. Dynamic client registration is enabled, so compatible
  clients self-register.
- The user signs in and approves the client on the in-app consent page
  (`/.lovable/oauth/consent`).
- Every tool call verifies the bearer token, derives the user from the token's
  `sub` claim (never from tool input), and forwards the raw token to the
  database so row-level security runs as that user.
- Unauthenticated calls return an MCP error result, never data.

## Tools

### Dashboard & analytics

| Tool | Input | Returns |
| --- | --- | --- |
| `get_dashboard_summary` | — | All-time and last-30-day metrics, top sessions/pairs, accounts, 10 most recent trades |
| `get_performance_metrics` | `from?`, `to?`, `days?`, `group_by?` (`session`\|`asset`\|`setup`\|`grade`) | Win rate, net P/L, gross profit/loss, profit factor, expectancy, avg win/loss, avg R, best/worst trade, optional breakdown |
| `get_equity_curve` | `from?`, `to?`, `starting_balance?` | Cumulative equity points, ending/peak equity, max drawdown |
| `get_period_stats` | `period?` (`month`\|`week`), `from?`, `to?`, `limit?` | Per-period metric buckets, most recent first |
| `get_trade_stats` | `days?` | Compact count / win rate / P/L / average R |

### Trades

| Tool | Input | Returns |
| --- | --- | --- |
| `list_trades` | `asset?`, `session?`, `setup?`, `grade?`, `result?`, `direction?`, `market?`, `from?`, `to?`, `min_rr?`, `sort?`, `order?`, `limit?`, `offset?` | Filtered, sorted, paginated trades + pagination block |
| `search_trades` | `query`, `limit?`, `offset?` | Trades matching notes / setup / asset / session / grade |
| `get_trade` | `id` | One full trade record |
| `list_recent_trades` | `limit?` | Most recent trades, core fields |

### Planning

| Tool | Input | Returns |
| --- | --- | --- |
| `get_daily_plan` | `date?` | Full daily plan for a date (defaults to today) |
| `list_daily_plans` | `from?`, `to?`, `reviewed?`, `limit?`, `offset?` | Daily plan index with bias, focus, risk, review status |
| `get_weekly_plan` | `week_start?` | Weekly plan, pair analyses, news, goals and review notes |

### Routine & journal

| Tool | Input | Returns |
| --- | --- | --- |
| `get_checklist` | `date?`, `history_days?` | Checklist for the day, per-section progress, history, current/longest streak |
| `search_notebook` | `query?`, `pair?`, `category?`, `from?`, `to?`, `limit?`, `offset?` | Notebook/journal entries matching filters and text |

## Conventions

- **Dates** are `YYYY-MM-DD` strings.
- **Pagination**: `limit` + `offset`; responses include
  `pagination: { limit, offset, returned, total, has_more }`.
- **Sorting**: `list_trades` accepts `sort` (`date`, `profit_loss`,
  `actual_rr`, `planned_rr`) and `order` (`asc` \| `desc`).
- **Executed trades** for metrics = results `Win` / `Loss` / `Breakeven`,
  excluding drafts, untriggered setups and cancellations.
- Every response also carries `structuredContent` alongside the text block.

## Error handling

Errors come back as normal MCP results with `isError: true` and a short text
message:

| Situation | Message |
| --- | --- |
| Missing/invalid token | `Not authenticated. Sign in to TG Master Journal first.` |
| Database or RLS denial | The database error message (no credentials, no SQL) |
| Unknown id | `No trade found with id "…".` |
| Empty search term | `Query must not be empty.` |

## Security

- No SQL execution, no arbitrary filesystem access, no service-role key.
- All queries are typed client calls scoped to `user_id = token.sub` and
  additionally protected by row-level security.
- Tokens are never logged or returned; secrets are never exposed to the model.
- All Phase 1 tools are read-only (`readOnlyHint: true`).

## Versioning

Semantic version on the MCP server (`defineMcp.version`). Tool inputs are
additive within a major version; removals or renames bump the major.

## Roadmap

- **Phase 1 (done)** — auth + read-only dashboard, trades, planning, checklist,
  notebook, analytics.
- **Phase 2** — richer semantic search and AI analysis tools (recurring
  mistakes, monthly summary, weekly report, strongest/weakest setup,
  psychology / discipline / consistency reports).
- **Phase 3** — write tools (create/update trades, journals, plans, checklist).
- **Phase 4** — media access via short-lived signed URLs, plus streaming and
  caching.

## Adding a tool

1. Create `src/lib/mcp/tools/<name>.ts` with `defineTool` (use the helpers in
   `src/lib/mcp/lib/client.ts`).
2. Register it in `src/lib/mcp/index.ts`.
3. Regenerate the manifest and deploy the `mcp` function.
