

# Translate gap pill contents to short English skill names

The "You're missing:" pills under each ranked path still contain long Estonian sentences (e.g. *"puudub CV-s selge tooteanalüütika/metrics…"*) instead of short English skill labels like "Product analytics", "UX design".

Root cause: even though `match-career`'s prompt asks for short English gap names, the model occasionally returns full Estonian sentences. The schema description doesn't enforce it strongly enough, and there's no client-side guard.

## Changes

### `supabase/functions/match-career/index.ts`
- Tighten the `gaps` schema:
  - Add per-item `description`: *"Short English skill label (e.g. 'SQL', 'Public speaking', 'Distributed systems'). Never use Estonian, never full sentences."*
  - Update outer `gaps` description: *"Skills you still need to build, as short English skill names."*
- Reinforce in system prompt: *"Each gap MUST be 1–4 English words naming a skill or topic. Never write a sentence. Never write Estonian. If unsure, output the closest English skill name."*

### Deploy
- Redeploy `match-career`.

## How to verify
1. Open `/career`.
2. Click **Run AI analysis** again.
3. Pills under "You're missing:" should now read like *"Product analytics"*, *"UX design"*, *"Conversion metrics"* — short English phrases, not Estonian sentences.

## Out of scope
- Backfilling old `career_plans` rows (newest insert wins).
- UI/layout changes.

