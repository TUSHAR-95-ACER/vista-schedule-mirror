# Research Lab status timeline alignment

## Scope
- Preserve the existing eight Testing Status cards, their single-row layout, sizing, colors, data, and behavior.
- Rebuild only the timeline beneath them with the same eight-column grid and the same gap as the cards.
- Align every timeline dot to the exact left edge of its corresponding status icon; keep each line segment inside its own column.
- Preserve the existing status color mapping with muted opacity and restrained glow.
- Normalize typography within Testing Status Overview and the right-side Insights, Recent Tests, Validation Tracker, and Quick Actions panels to the Research Lab KPI hierarchy.
- Leave the top seven KPI cards and all unrelated page content unchanged.

## Technical details
- Share explicit grid column and gap rules between the status-card row, timeline row, and timeline-label row.
- Match the timeline dot offset to the status card’s horizontal padding, accounting for the dot radius so its center lands on the icon’s left-edge guide.
- Draw each segment from its dot to the end of its own grid cell without crossing the inter-card gap.
- Verify alignment and horizontal overflow at representative desktop and laptop widths, then confirm type and build health.
