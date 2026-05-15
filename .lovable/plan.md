# Macro Intelligence v2 — Monthly Cycle System

This is a large multi-area request. Breaking it into 4 focused workstreams.

## 1. Sidebar reorder
- Move **Macro Intelligence** above **Weekly Plan** and **Daily Plan** in `Sidebar.tsx`.

## 2. Market Sentiment cleanup
- Remove DXY from sentiment slider lists (DXY is an index, not a tradable pair) in `MarketSentimentSlider.tsx` consumers + `DailyPlan.tsx` / `TradeFormDialog.tsx` filter.

## 3. Add 4 new fonts
- Add 4 new monospace/display font presets selectable via `html[data-journal-font]` in `index.html` + journal font picker in Settings.
- Suggest: JetBrains Mono, IBM Plex Mono, Geist Mono, Space Grotesk (or similar). Confirm with user later if needed but default add: `JetBrains Mono`, `IBM Plex Mono`, `Geist Mono`, `Space Grotesk`.

## 4. Macro Intelligence — full rebuild

### 4a. Database (migration)
- New table `macro_cycles`:
  - `id uuid pk`, `user_id uuid`, `cycle_month text` (e.g. `2026-05`), `label text`, `status text` (`active`|`archived`), `dominant_narrative text`, `narrative_drivers jsonb`, `current_story jsonb`, `forward_expectation jsonb`, `market_focus text`, `timeline jsonb`, `created_at`, `archived_at`.
  - RLS: own-rows only.
- Extend `macro_events`: add `cycle_id uuid`, `category text` (Inflation/Labor/Growth/Fed/Manufacturing).
- Extend `macro_analyses`: add `cycle_id uuid`, `outcome_status text` (`worked`|`not_worked`|null) — replace boolean usage.
- Unique `(user_id, cycle_id, analysis_date)` so re-saving updates rather than duplicates.

### 4b. Edge function `macro-intelligence` rewrite
- Accept `cycle_id`, fetch all events for cycle + last 3 cycles' analyses for historical memory.
- Tool schema additions: `dominant_narrative`, `narrative_drivers[]`, `current_story[]` (short bullets), `forward_expectation` `{if_high, if_low}`, `market_focus`, `coaching[]`, `historical_shift`.
- New simple-language rules in system prompt: short sentences, swap "Hot/Cooling Inflation" → "High/Low/Neutral Inflation".
- Upsert analysis (don't insert duplicates) — keyed on `(cycle_id, analysis_date)`.

### 4c. UI rewrite (`MacroIntelligence.tsx`)
- Cycle switcher header with **Start New Macro Cycle** button + confirm dialog.
- Archived cycles read-only.
- Layered hierarchy:
  - **Primary:** Dominant Narrative hero + USD/Gold/Fed/Environment/Next-Focus chips.
  - **Current Story:** simple bullets.
  - **Forward Expectation Engine:** two outcome cards (If High / If Low) with arrows + probability bars.
  - **Fed spectrum bars:** Dovish↔Hawkish, Cuts↔Hikes (replace probability rings).
  - **Smart Money / Conflict / Pricing / Positioning:** compact cards.
  - **Coaching layer:** mentor cautions.
  - **Economic Table:** grouped collapsible by category, compact mode, dynamic add/remove.
  - **Timeline:** vertical macro timeline of cycle events.
  - **Prediction History:** compact list, `Worked` / `Not Worked` toggle (no Hit/Miss buttons).
- Executive summary default; "Deep Dive" expandable for full reasoning.
- Glassmorphism, dark, terminal aesthetic — keep existing tokens.

## Technical notes
- All AI text constrained via tool schema with `maxLength` hints in prompt; system prompt enforces "simple language, short sentences".
- Save Events upserts — uses `onConflict: 'cycle_id,analysis_date'` to prevent duplicates.
- Outcome tracking via single `outcome_status` field with two-state toggle.
- Cycle creation: archive current `active` row, insert new with status `active` for current `YYYY-MM`.

## Out of scope (will not touch)
- AI Coach / AI Insights pages (already rebuilt earlier).
- Trade/Plan flows beyond DXY removal.

After approval I will execute in this order: migration → edge function → fonts/sidebar/sentiment → MacroIntelligence UI.
