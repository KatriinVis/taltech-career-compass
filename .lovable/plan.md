

# Apply MESA.I brand: colors, voice, and copy

Align the entire app with the MESA.I pitch deck — visual palette, headline voice, and feature wording.

## Brand foundations (from the deck)

- **Name**: MESA.I
- **Tagline**: "From curriculum blindness to a career-driven smart timetable"
- **Promise**: "Your academic-to-career operating system — connecting what you study to what you actually achieve"
- **Three pillars**: **Degree** · **Skills** · **Career**
- **Voice**: warm, direct, student-first; short sentences; verbs over jargon; no "retention risk"-style corporate speak

## Color palette (HSL tokens)

| Token | Value | Use |
|---|---|---|
| `--primary` | `224 60% 15%` | Deep navy — wordmark, headings, primary buttons |
| `--primary-foreground` | `0 0% 100%` | White on navy |
| `--primary-glow` | `250 50% 78%` | Lavender bubble accent |
| `--accent` | `32 55% 58%` | Warm wood-tan (mascot) — chips, highlights |
| `--accent-foreground` | `224 60% 15%` | Navy on tan |
| `--secondary` | `250 45% 96%` | Soft lavender wash — cards, hover states |
| `--background` | `0 0% 100%` | True white |
| `--foreground` | `224 60% 15%` | Navy text |
| `--muted` | `250 30% 97%` | Surface fills |
| `--muted-foreground` | `224 20% 45%` | Secondary text |
| `--success` | `145 50% 50%` | Mint — "Free slot", completed |
| `--warning` | `38 92% 58%` | Amber — clashes, deadlines soon |
| `--destructive` | `0 75% 58%` | Red — hard clash, errors |
| `--border` / `--input` | `250 30% 90%` | Lavender-tinted borders |
| `--ring` | `224 60% 15%` | Focus ring navy |
| `--radius` | `0.75rem` | Friendlier rounded corners |

Gradients & shadows:
- `--gradient-primary: linear-gradient(135deg, hsl(224 60% 15%), hsl(250 50% 70%))`
- `--gradient-soft: linear-gradient(180deg, hsl(0 0% 100%), hsl(250 45% 97%))`
- `--shadow-card: 0 1px 3px hsl(224 60% 15% / 0.06), 0 4px 12px hsl(250 50% 70% / 0.10)`
- `--shadow-elegant: 0 10px 30px -10px hsl(224 60% 15% / 0.20)`

Fonts: keep Inter for body; add **Nunito** (700/800/900) via Google Fonts as `.font-display` for headings to match the deck's bold rounded look.

## Logo & mascot

- Save the MESA.I mascot from the pitch deck as `src/assets/mesai-logo.png` and `public/mesai-favicon.png`.
- New `src/components/MesaLogo.tsx` — renders mascot + "MESA.I" wordmark in navy. Props: `size?: "sm" | "md" | "lg"`, `wordmark?: boolean`. Used in landing header, sidebar, mobile bar, auth.

## Copy rewrite (every "Career Driver" → MESA.I voice)

**Landing (`Index.tsx`)**
- Eyebrow: "AI mobility agent for TalTech & EuroTeQ"
- H1: "From curriculum blindness to a **career-driven** smart timetable."
- Sub: "MESA.I connects what you study to what you actually achieve — your courses, deadlines, and career goals in one adaptive plan."
- CTAs: "Start free" / "I already have an account"
- Three feature cards aligned with the deck's pillars:
  - **Degree** — "See your full program at a glance. Track ECTS, required courses, and what's left."
  - **Skills** — "Grow beyond the syllabus. MESA.I surfaces seminars, hackathons, and electives that build the skills you need."
  - **Career** — "Pick courses that lead somewhere. Upload your CV, set a goal, get a ranked plan."
- Footer: "Built with TalTech & EuroTeQ students · MESA.I pilot v1"

**App chrome (`AppLayout.tsx`)**
- Sidebar header: `<MesaLogo />` + tagline "Career-driven smart timetable"
- Active nav: lavender `secondary` background + navy text + 2px navy left bar (replaces the heavy solid-navy block)
- Mobile top bar: small `<MesaLogo />`

**Auth (`Auth.tsx`)**
- Header: `<MesaLogo />`
- Sign-in: "Welcome back to MESA.I" / "Pick up where you left off."
- Sign-up: "Join MESA.I" / "Let's connect your studies to your career."

**Onboarding (`Onboarding.tsx`)**
- Step 1 heading: "Welcome to MESA.I"
- Sub: "Three quick steps and we'll build your career-driven timetable."
- Final CTA stays "Generate my plan"

**Dashboard (`Dashboard.tsx`)**
- Page H1: "Your week, your way"
- Sub: "Everything MESA.I is tracking for you right now."
- Keep the existing **Program progress** card; rename labels in MESA.I voice ("ECTS earned", "Required courses done").

**Settings (`Settings.tsx`)**
- H1: "Your profile" / Sub: "MESA.I uses this to tune your plan."

**Browser tab (`index.html`)**
- `<title>`: "MESA.I — Career-driven smart timetable"
- `<meta description>`: "MESA.I connects your TalTech & EuroTeQ studies to your career goals."
- `<link rel="icon">` → `/mesai-favicon.png` (delete `public/favicon.ico` so it doesn't override)
- Add Nunito to the existing Google Fonts `<link>`

## Files touched

- **New**: `src/components/MesaLogo.tsx`, `src/assets/mesai-logo.png`, `public/mesai-favicon.png`
- **Edited**: `src/index.css`, `src/pages/Index.tsx`, `src/components/app/AppLayout.tsx`, `src/pages/Auth.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`, `index.html`
- **Deleted**: `public/favicon.ico`

No schema, routing, edge function, or feature-logic changes — this is identity, color tokens, and copy only. Existing semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, etc.) automatically pick up the new palette across every component, so cards, buttons, badges, the timetable grid, and the bottle diagram all rebrand without per-component edits.

## Out of scope (defer)

- Custom illustrated empty-states / onboarding art
- Dark-mode rebalance
- Animated mascot reactions

