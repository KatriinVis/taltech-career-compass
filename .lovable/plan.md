

# Force English output in Career path analysis

The `match-career` edge function ranks paths and returns `reasoning` + `gaps` from the LLM. When the CV is in Estonian, the model mirrors the input language and returns Estonian gap labels and reasoning. Fix is to instruct the model explicitly to always respond in English regardless of input language.

## Changes

### `supabase/functions/match-career/index.ts`
Update the system prompt to force English output:

> "You are a TalTech career advisor. Rank the top 3-5 career paths for this student. Use explainable reasoning citing specific CV signals + interests. Be honest about gaps. **Always respond in English, even if the CV, interests, or any other input is written in another language (e.g. Estonian). All `reasoning` text and every item in `gaps` must be written in natural English.**"

Also tighten the tool schema descriptions to reinforce the rule:
- `reasoning.description`: "1-3 sentences in English explaining the match using CV+interests evidence."
- `gaps.items.description` (add): "Short English skill label (e.g. 'SQL', 'Public speaking', 'Distributed systems'). Never use Estonian."

### `supabase/functions/analyze-cv/index.ts`
Same fix on the CV extractor so downstream `summary` and `interests` arrays are also normalized to English (skill tags are already kebab-case English, but `summary`, `experience`, `education`, `interests` can leak Estonian):

> Append to system prompt: "Always write `summary`, `experience`, `education`, and `interests` in English, even if the CV is in another language. Translate Estonian content to English before returning."

### Existing data
Old `career_plans` rows already saved with Estonian text stay as-is (no migration). Next time the user clicks "Run AI analysis" the new English output replaces the displayed ranking. No DB schema changes.

## Out of scope
- Translating already-stored Estonian plans retroactively
- Adding a UI language toggle (EN is the only app language now)

