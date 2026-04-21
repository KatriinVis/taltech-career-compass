

# Force English + "you" form for CV analysis and career reasoning

The "reasoning" paragraph on each ranked career card is still showing Estonian, third-person text (e.g. *"Katriinil on tugev projektijuhtimise…"*). Root cause: the CV is in Estonian, so `analyze-cv` stores Estonian `summary`/`experience`, and `match-career` then echoes that language back even though its own prompt says English.

Fix both edge functions so all stored + displayed text is English, second-person.

## Changes

### `supabase/functions/analyze-cv/index.ts`
- Update system prompt to require English output regardless of input language:
  - "Always write `summary`, `experience`, `education`, and `interests` in English, even if the CV is in another language. Translate Estonian (or any non-English) content to English before returning."
- No schema change.

### `supabase/functions/match-career/index.ts`
- Strengthen system prompt:
  - "Always write in English, even if the CV, interests, or any other input is in another language (e.g. Estonian)."
  - "Address the user directly as 'you' (e.g. 'You already have…', 'You still need…'). Never use third-person ('the student', 'the candidate', or the user's name)."
  - "Gaps must be short English skill names like 'SQL', 'Statistics', 'Public speaking' — never Estonian, never full sentences."
- No schema change.

### Deploy
- Redeploy both edge functions.

## How the user verifies
1. Open Career page.
2. Click **Run AI analysis** again to regenerate the analysis with the new prompts.
3. The reasoning text and gap pills on each card should now be in English, addressing them as "you".

## Out of scope
- Backfilling old `cv_uploads` / `career_plans` rows (newest insert wins on load, so re-running analysis is enough).
- Changing UI components or schema.

