

# Translate gap/skill labels to English, second-person

The "Gaps you should close" pills and other dynamic skill/interest text on the Career page currently show raw values from the AI/data that may be in Estonian or impersonal. Convert all user-facing labels in this section to English, "you" form.

## Changes

### `src/pages/Career.tsx`
- Section sub-labels under each ranked path:
  - "Gaps you should close" → **"What you still need"**
  - "Courses we recommend for you" → keep (already good).
- Add a short lead line above the gap pills, e.g. *"You're missing:"* so each pill reads naturally as something *you* lack.

### `src/components/app/BottleDiagram.tsx`
- Right-side panel headings (currently layer labels like "skills", "interests", "paths", "goal") → second-person English:
  - skills → **"What you have"**
  - interests → **"What you're into"**
  - paths → **"Paths that fit you"**
  - goal → **"Your goal"**
- "Other skills (not in current goal)" → **"Other skills you have (not needed for this goal)"**
- Matched/total counter label stays numeric.

### `supabase/functions/match-career/index.ts`
- Update the system/user prompt so the model returns `reasoning` and `gaps` in **English, second-person** ("You already have…", "You still need…", gap items as short English skill names like "SQL", "Statistics").
- Add an explicit instruction: *"Always write in English. Address the user as 'you'. Gaps must be short English skill names."*
- No schema change — same `{ ranked: [{ id, name, score, reasoning, gaps[] }] }` shape.

After deploy, click **Run AI analysis** again to regenerate `ranked` so existing Estonian/impersonal text is replaced. Old saved `career_plans` rows won't be rewritten — newest insert wins on load.

## Out of scope
- Backfilling/rewriting historical `career_plans` rows.
- Changing the underlying skill taxonomy in `career_paths.json`.

