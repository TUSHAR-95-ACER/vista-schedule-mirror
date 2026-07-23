## Goal
Connect TG Master Journal to ChatGPT via MCP, and add a native in-app ChatGPT assistant with threaded conversations persisted to the database.

## Plan

### 1. MCP → ChatGPT connection
- The app already exposes an MCP server (`src/lib/mcp/index.ts`) with OAuth and three tools: `list_recent_trades`, `get_trade_stats`, `get_daily_plan`.
- Refresh and validate the MCP manifest (done).
- Add a small "Agent Integrations" section in Settings that shows the MCP endpoint URL and copy-to-clipboard so the user can paste it into ChatGPT/Cursor.

### 2. Database schema for in-app chat
Create a migration with two tables:
- `chat_threads` (id, user_id, title, created_at, updated_at)
- `chat_messages` (id, thread_id, role, content, parts, created_at)
- RLS policies scoped to `auth.uid()`.
- Add both tables to the `supabase_realtime` publication for live thread/message sync.

### 3. Backend streaming edge function
Create `supabase/functions/chatgpt-assistant/index.ts`:
- Validates JWT.
- Reads `messages` from request body.
- Calls Lovable AI Gateway with an OpenAI chat model (`openai/gpt-5.4-mini` or `openai/gpt-5.5`) using the AI SDK.
- Streams response back with `toUIMessageStreamResponse`.
- Persists user + assistant messages in `onFinish`.

### 4. Frontend chat UI
Install AI Elements primitives (`conversation`, `message`, `prompt-input`, `shimmer`).
Create:
- `src/pages/ChatGPTAssistant.tsx` — main chat page with thread sidebar and conversation area.
- `src/components/chat/ThreadList.tsx` — list of threads, new thread button.
- `src/components/chat/ChatWindow.tsx` — AI Elements-based conversation + prompt input.
- Add route `/chat/:threadId` and `/chat` (redirects to newest thread or creates one).
- Add "AI Assistant" item to the sidebar.

### 5. Wiring
- Update `src/App.tsx` with new routes.
- Update `src/components/layout/Sidebar.tsx` with the new navigation item.
- Update `src/contexts/RealtimeSyncContext.tsx` to listen for `chat_threads` and `chat_messages` changes.

### 6. Verification
- Typecheck and build.
- Run a quick Playwright check that the chat page loads, a thread can be created, and a message can be sent (we may mock the assistant response if credits are low).

## Notes
- No extra AI provider keys needed; this uses Lovable AI Gateway and the existing `LOVABLE_API_KEY`.
- The MCP server remains read-only and OAuth-protected as already implemented.
- The in-app assistant will use OpenAI GPT models via the gateway, not Gemini.