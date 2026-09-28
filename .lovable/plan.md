# Research Lab desktop layout correction

## Scope
- Keep all seven top KPI cards in one equal-width desktop row.
- Restructure Testing Status Overview so seven statuses occupy its first row.
- Place Rejected at the start of the second row without changing data, colors, typography, icons, or behavior.
- Preserve the existing status timeline and stack only on smaller screens.

## Technical details
- Replace auto-fit and 4/8-column rules with explicit responsive seven-column grids using `minmax(0, 1fr)`.
- Add `min-width: 0` constraints to the relevant wrappers and cards.
- Render the first seven status cards separately from Rejected so its desktop placement is deterministic.
- Verify at desktop width and confirm the project build remains clean.
