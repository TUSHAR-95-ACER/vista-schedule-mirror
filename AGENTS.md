# Architecture rules

- The MCP catalog exposes read-only journal, analytics, planning, checklist, notebook, and media tools only; this prevents external assistants from changing records or executing trades.
- MCP data access uses the shared lazy runtime client in `src/lib/mcp/lib/client.ts` with a verified OAuth caller token and public key; this preserves user-scoped RLS and import-safe manifest extraction.
- The Vite MCP plugin owns the generated edge function, and MCP releases require manifest extraction followed by application publish; this keeps the advertised catalog and hosted revision consistent.