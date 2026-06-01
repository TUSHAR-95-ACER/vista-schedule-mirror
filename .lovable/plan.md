## Research Lab Redesign

Transform Research Lab from a notes page into a strategy R&D platform with a clear workflow: **Research → Testing → Validation → Playbook**.

### 1. Data Model (localStorage, user-scoped — same pattern as today)

Storage key: `ef_research_strategies` (replaces `ef_research_lab` + `ef_tool_testing`, old keys kept readable for migration only).

```ts
Strategy {
  id, name, description, type, icon, color,
  status: 'Testing'|'Promising'|'Validated'|'Failed'|'Archived',
  pairs: string[],            // user-editable pair list (add/delete)
  templateFields?: FieldSet,  // saved template structure
  tests: Test[],
  createdAt, updatedAt
}

Test {
  id, date, pair, session,
  predictedBias, actualBias,
  dealingRange, liquidityTarget, liquidityNote, narrative,
  drHigh, drEq, drLow,
  breakoutQuality, fvgLocation, entryType, ltfConfirmation,
  entryPrice, stopLoss, tp1, tp1Target, tp2, tp2Target,
  result: 'Win'|'Loss'|'Scratch', rAchieved,
  grade: 'A'|'B'|'C', emotionalState,
  predictedScreenshot, actualScreenshot,
  reflection: { wentWell, toImprove, notes },   // rich text
  modelReview: { followedModel, narrative, differently }  // rich text
}
```

### 2. Pages & Routes

- `/research-lab` — strategy gallery (cards)
- `/research-lab/:strategyId` — strategy dashboard + tests list
- `/research-lab/:strategyId/test/:testId` — single test detail/editor

### 3. Research Lab Home (gallery)

- Header actions: **New Strategy**, **Import Strategy**, **Research Analytics**, **Archive**
- Grid of strategy cards showing: name, tests completed, win rate, avg RR, bias accuracy, validation score, status pill
- Status colors via design tokens (blue/green/emerald/red/gray)
- Card actions: Open, Edit, Duplicate, Archive, Delete + `...` menu (Rename/Duplicate/Archive/Delete)
- Empty state with seeded suggestions (ICT Session Narrative, EBP Candle, SMT Divergence, AMD, London Reversal)

### 4. New Strategy Modal

Fields: Name, Description, Type (Session/Liquidity/SMT/PO3/Custom), Icon picker, Color picker, Status.

### 5. Strategy Dashboard (`/research-lab/:strategyId`)

- KPI row: Total Tests, Wins, Losses, Win Rate, Avg RR, Bias Accuracy, Best Session, Best Pair, A-Grade %, Validation Score (computed)
- Charts (Recharts): Win Rate by Session, Win Rate by Pair, Grade Distribution, Bias Accuracy, Emotional State Distribution
- **Pair manager** card: add/delete pairs for this strategy
- Top-right actions: New Test, Edit Strategy, Save Template, Export Data, Archive, Promote to Playbook
- Tests table below dashboard

### 6. Test Entry Form (sectioned, single page)

Sections with clear visual hierarchy:
1. Basic Info (date, pair pill, session pill)
2. HTF Bias (predicted vs actual pills)
3. Dealing Range (Premium/Discount/EQ)
4. Liquidity (BSL/SSL/Both/None + note)
5. Session Narrative (textarea)
6. DR Levels (High/EQ/Low)
7. Breakout Quality, FVG Location, Entry Type, LTF Confirmation (pill groups)
8. Trade Execution (entry, SL, TP1+target, TP2+target)
9. Result + R Achieved
10. Process Grade (large A/B/C cards)
11. Emotional State (Process/Flow/Foggy/Revenge)
12. Screenshots (predicted + actual, preview/zoom/fullscreen via existing image lightbox pattern)
13. Reflection (rich text x3) using existing `RichTextEditor`
14. **Model Review** highlighted block (3 large rich text answers)

### 7. Auto-Analytics (computed, not stored)

Pure functions over `tests[]`: bias accuracy, win rate by session/pair/grade/emotion/entry/liquidity. Surfaced in dashboard charts and per-test detail.

### 8. Templates

- "Save Template" snapshots current field config to the strategy
- "New Strategy → Use Existing Template" copies fields from selected strategy

### 9. Autosave

Reuse existing `useAutosave` hook. Saves on type, blur, tab switch, beforeunload. Status pill via `SaveStatusIndicator`. No manual Save button.

### 10. Design

- Reuse design tokens, MetricCard, Card, Badge, Tabs from existing system
- Status badges use semantic tokens (success/primary/destructive/muted)
- Dark mode compatible
- Mobile-responsive grid (1 col mobile, 2 tablet, 3 desktop)
- Smooth hover (existing transition utilities), no new animation libs

### Files

**New:**
- `src/types/research.ts` — Strategy/Test types
- `src/lib/researchAnalytics.ts` — pure analytics fns
- `src/lib/researchStorage.ts` — load/save/migrate
- `src/components/research/StrategyCard.tsx`
- `src/components/research/StrategyDialog.tsx` (new/edit modal)
- `src/components/research/StrategyDashboard.tsx`
- `src/components/research/TestEditor.tsx`
- `src/components/research/PillGroup.tsx` (shared selector)

**Edited:**
- `src/pages/ResearchLab.tsx` — gallery only
- `src/App.tsx` — add `/research-lab/:strategyId` and `/research-lab/:strategyId/test/:testId` routes

**Out of scope (this round):**
- Server-side persistence (stays localStorage to match other settings-like data; can migrate to Supabase in a follow-up)
- Actual "Promote to Playbook" wiring beyond a stub action (will hook into existing SetupPlaybook in a follow-up)
- Import Strategy from file (button + JSON import only)
