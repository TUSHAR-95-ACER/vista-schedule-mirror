# Research Lab desktop layout correction

## Scope
- Keep all seven top KPI cards in one equal-width desktop row.
- Keep the first seven Testing Status cards in one desktop row.
- Place Rejected deterministically at the start of the next status row while preserving the adjacent Insights column.
- Preserve all existing data, styling, interactions, and the status timeline.

## Technical details
- Replace wrapping grid rules with explicit `repeat(7, minmax(0, 1fr))` desktop tracks.
- Apply `min-width: 0` through the affected containers and cards.
- Separate Rejected from the first seven status cards without changing its content.
- Retain responsive stacking only below desktop widths.
- Verify the rendered desktop page has no horizontal overflow, then confirm type and build health.
