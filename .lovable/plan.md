Three coordinated passes. Each is independent so I can verify between them.

## Pass 1 — Global Typography (Sora + Inter)

**index.html**
- Add `<link rel="preconnect">` for fonts.gstatic.com
- Preload Sora (400/500/600/700) and Inter (400/500/600/700) from Google Fonts

**tailwind.config.ts**
- `fontFamily.heading: ['Sora', ...sans]`
- `fontFamily.sans: ['Inter', ...system]` (becomes the new body default)
- Keep mono available but no longer the default

**src/index.css**
- Set `body { font-family: Inter, ... }`
- Set `h1,h2,h3,h4,h5,h6,[data-heading] { font-family: Sora; font-weight: 600 }`
- Tighten letter-spacing on display sizes; bump base line-height to 1.6 for body
- Slightly larger sidebar label (`.sidebar-label { font-size: 0.875rem; font-weight: 500 }`)
- Larger metric value class (`.metric-value { font-family: Sora; font-weight: 600; font-size: 1.875rem }`)

**Sidebar / card headers**
- Add `font-heading` class on `Sidebar.tsx` nav labels and `CardTitle` (shadcn) via globals — done with a CSS rule on `[data-slot="card-title"]` to avoid touching every component

**Journal Font setting**
- Keep the existing `data-journal-font` switcher but make Inter+Sora the default; the existing mono presets remain user-selectable

## Pass 2 — AI Insights Rewrite (mentor voice)

**supabase/functions/gemini-insights/index.ts**
- Rewrite system prompt: "You are an elite institutional trading psychologist & prop-firm performance coach. Speak directly to the trader in second person. No labels like RISK/EDGE/LEAK. No bullet dashboards. Output 3–5 long-form paragraphs. Each paragraph: observation → behavioral cause → journal evidence (cite setups/sessions/RR/dates) → correction → future focus."
- Switch model to `google/gemini-2.5-pro` via Lovable AI Gateway (no GEMINI_API_KEY dependency, more reliable for nuanced prose)
- Use tool-calling for structured output: `{ insights: [{ title: string, body: string }] }` — titles must be sentence-form (e.g. "Your execution is better than your patience")
- Pipe full journal context (existing aggregation already in the function)

**src/components/shared/AIInsightsPanel.tsx** (and consumers)
- Replace small label-cards with paragraph blocks: title (Sora 600, lg) + body (Inter 400, prose-base, max-w-2xl, leading-relaxed)
- Add smooth fade-in (`animate-in fade-in duration-500`)
- Skeleton loader using new typography

## Pass 3 — Fix AI Coach "Chat failed"

**Diagnose**
- Check `supabase/functions/ai-coach/index.ts` — read current implementation, verify it uses LOVABLE_API_KEY (not raw GEMINI_API_KEY which can fail), verify response parsing, verify CORS, verify it consumes streaming response correctly
- Check the frontend `pages/AICoach.tsx` for how it surfaces errors

**Fix**
- Migrate ai-coach to Lovable AI Gateway streaming pattern (SSE) using `LOVABLE_API_KEY`, model `google/gemini-2.5-flash` for speed
- System prompt loads journal context (trades summary, recent psychology, plans, mistakes, notebook titles)
- Surface real error text from edge function (`error.message`) instead of generic "Chat failed"
- Handle 429/402 with friendly toasts
- Frontend: token-by-token streaming, auto-scroll, typing indicator, markdown rendering via `react-markdown` (add if missing), retry button on failed message, persist messages to localStorage keyed by user_id

**Verify**
- Use `supabase--curl_edge_functions` to POST a sample message and confirm 200 + stream
- Open browser preview, send a message, confirm streamed reply renders

## Order of work
1. Typography (touches CSS/html only — low risk, instantly visible)
2. AI Coach fix (highest user pain — "Chat failed")
3. AI Insights rewrite (largest prompt + UI surgery)

I'll deliver pass 1 first, verify, then continue.
