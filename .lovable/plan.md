# Master Journal – Phase Next Fixes

This is a large multi-area change. I'll ship it in **3 batches** so each batch can be verified visually before the next. Nothing existing is removed — only added, restructured, or fixed.

---

## Batch A — Core fixes (blockers you listed at the bottom)

These are the 6 verification items you require for "completed".

1. **Universal Text Editor first-click fix**
   - Root cause: selection toolbar listens to `mouseup`, but the editor only mounts the listener after `focus`, so the first selection is missed.
   - Fix once in `RichTextEditor.tsx` (used by Daily Plan, Weekly Review, Macro, Notebook, Trade Notes, Research Lab) → toolbar attaches on mount via `selectionchange` on `document`, scoped to editor ref.

2. **Setup Performance chart (Analytics) – real data**
   - Repoint chart to grouped trades by `setup` field, compute Trades / Win Rate / Avg RR / Profit Factor / Total PnL.
   - Render bars even when only some setups have data; empty state only when zero trades.

3. **Setup Rating logic rebuild**
   - Replace `0.00` with composite score: `0.4·winRate + 0.3·normRR + 0.2·normPF + 0.1·(1−normDD)` → 0–100.
   - Map to letter grade A+/A/B+/B/C+/C/D and display `★ Setup Score: NN/100`.

4. **Universal AI Insights block at bottom of every page**
   - Reuse existing `AIInsightsPanel` (offline stats-based; no edge function).
   - Add to: Dashboard, Trades, Analytics, Research Lab, Macro Intelligence, Behavior, Trade Quality, Weekly Review, Daily Plan, Notebook.
   - On pages that already have one mid-page, move to the bottom.

5. **Weekly Review auto-generation (Sunday)**
   - New edge function `weekly-review-generate` that pulls all 5 daily plans + week's trades + psychology + macro notes for the active week and returns: Narrative, Reflection, Lessons, Mistakes, Improvements, Best/Worst Decision, Patterns, AI Review.
   - "Generate with AI" button on Weekly Review + auto-trigger on first Weekly Review load on Sunday (client-side check, idempotent — won't overwrite if user edited).
   - User can still edit every field afterward.

6. **Page-connection verification**
   - Confirm Daily Plan → Weekly Review (via shared week selector + data fetch in #5).
   - Confirm Trades → Trade Quality / Analytics (already linked, just verify).
   - Confirm Macro Intelligence → Daily Plan macro notes display.
   - Add lightweight "Connected sources" footer line on each page listing the data inputs.

---

## Batch B — Behavior + Trade Quality redesigns

7. **Behavior page redesign**
   - Keep all existing calcs.
   - Add cards: Most Emotional Day, Best/Worst Discipline Day, Most Common Mistake, Most Profitable / Most Dangerous Emotional State.
   - Add charts: Mistakes by Session, by Pair, by Time; Discipline Trend, Emotion Trend, Weekly Discipline Trend, Behavior Score Trend.
   - Emerald + Gold styling, card-based hierarchy.

8. **Trade Quality redesign**
   - Add: A+/A/B/C %, Quality Distribution, Quality vs PnL, Quality vs RR, Quality vs Win Rate.
   - Add: Avg Grade per Week / Month, Best / Worst Grade, AI Findings panel.
   - Institutional layout (Emerald + Gold).

---

## Batch C — Macro + AI Coach context

9. **Macro Timeline cleanup**
   - Filter timeline so only the `2026-06-12` "Core CPI Cools, PPI Surges, NFP Strong" entry shows (single curated entry).
   - Keep underlying event records; the change is display-only so analytics aren't affected.

10. **AI Coach full-journal memory**
    - Extend `ai-coach` edge function payload to include compact snapshots of: Trades, Behavior, Weekly Reviews, Daily Plans, Macro Intelligence, Research Lab, Trade Quality, Analytics.
    - Reuse `aiInsightAdapters.ts` adapters; cap each at ~2KB to stay under token limits.
    - Coach replies cite cross-page patterns.

---

## Technical Details (for reference)

- **Editor fix**: switch from `editor.addEventListener('mouseup', ...)` to a single `document.addEventListener('selectionchange', ...)` guarded by `editorRef.current?.contains(selection.anchorNode)`. One change in `RichTextEditor.tsx` propagates to all consumers.
- **Setup rating**: pure function `computeSetupScore(stats) → { score: 0-100, grade: 'A+'|...|'D' }` in `src/lib/calculations.ts`. Reused by Analytics + Trade Quality.
- **Weekly review edge function**: `supabase/functions/weekly-review-generate/index.ts` using shared `lovable-ai.ts` at `sonnet` tier. Returns structured JSON; client maps into existing Weekly Review fields.
- **Auto-Sunday trigger**: on Weekly Review mount, if `weekday===0` AND review fields are empty AND week has ≥1 daily plan → auto-invoke once, gated by `localStorage[user_id + ':wr-auto:' + weekStart]`.
- **AI Insights placement**: add `<AIInsightsPanel page="..." payload={adapted} />` as last child of each page's main column.
- **No schema changes** required for Batch A. Batch C may not need any either.

---

## Delivery order

I'll start **Batch A** now, post visual proof after each batch, and only proceed once you confirm. Reply "go" to start, or tell me to reorder.