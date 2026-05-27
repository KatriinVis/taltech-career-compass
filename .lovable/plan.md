## Career-table — quirky youthful redesign

Rename the product from MESA.I to **Career-table** and reskin with a Vapor Chrome / Y2K iridescent aesthetic plus Bebas Neue display type. Replace the static logo with an animated emoji-style icon (spinning graduation cap with sparkles), and dial up interactivity to a medium level (3/5) — hover tilts, gradient shimmer, animated blobs, subtle confetti on key actions.

### Rename
- Site name everywhere: **MESA.I → Career-table**
- Files touched: `index.html` (title, meta, OG), `src/components/MesaLogo.tsx` → new `src/components/CareerTableLogo.tsx`, `src/components/app/AppLayout.tsx`, `src/pages/Index.tsx`, `src/pages/Auth.tsx`, `README.md`, footer text.
- Keep route paths and Supabase project names unchanged.

### Design system (`src/index.css` + `tailwind.config.ts`)
- New HSL tokens reflecting Vapor Chrome palette:
  - `--background`: near-white with lavender tint
  - `--primary`: indigo `#818cf8`
  - `--primary-glow`: cyan `#67e8f9`
  - `--accent`: lavender `#c4b5fd`
  - `--secondary`: pale cyan `#a5f3fc`
- New gradient tokens: `--gradient-vapor` (lavender → indigo → cyan), `--gradient-chrome` (iridescent shimmer), `--shadow-glow` (soft cyan halo).
- Add Bebas Neue + Barlow via Google Fonts in `index.html` (replace Nunito/Inter). `.font-display` → Bebas Neue, body → Barlow.
- New keyframes/animations in `tailwind.config.ts`: `wiggle`, `float`, `spin-slow`, `shimmer`, `pop`, `blob`. Plus utility classes `.hover-tilt`, `.hover-glow`, `.chrome-text`.

### Animated logo (`src/components/CareerTableLogo.tsx`)
- SVG-based emoji-style graduation cap 🎓 with:
  - Continuous gentle bob (`float`)
  - Tassel sway
  - Sparkle dots that twinkle around it (staggered opacity/scale)
  - Hover: tilt + faster spin of the tassel
- Wordmark "Career-table" in Bebas Neue with chrome gradient text fill.
- Sizes sm/md/lg preserved so AppLayout/Auth/Index drop-in works.

### Page-level interactivity (medium — level 3)
- **Landing (`Index.tsx`)**: 
  - Animated gradient blob background (two blurred shapes drifting with `blob` keyframe).
  - Hero headline gets chrome-shimmer gradient on the highlighted word.
  - Feature cards: `hover-tilt` + glow ring, icons wiggle on hover.
  - CTA buttons: gradient fill + shine sweep on hover.
- **Auth (`Auth.tsx`)**: soft floating blob behind card, animated logo at top.
- **AppLayout sidebar**: active nav item gets gradient pill + small bounce on hover; logo at top uses the animated component.
- No cursor followers, no sound, no confetti spam — keeps it at "3/5".

### Out of scope
- Career page logic, edge functions, data, schema.
- Dark mode tuning (will inherit but not redesigned).
- Replacing the existing `mesai-logo.png` / `mesai-favicon.png` asset files (logo becomes pure SVG component; favicon stays for now).

### How to verify
1. Open `/` — see new Career-table name, animated cap logo, vapor gradient background, Bebas Neue headlines.
2. Hover feature cards and CTAs — tilt + shimmer.
3. Open `/auth` and `/dashboard` — same logo animating in header/sidebar, consistent palette.