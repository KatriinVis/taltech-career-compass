

# Text-only AI assistant for MESA.I (voice deferred)

Drop the voice path entirely for v1. Ship the same assistant as a **text-only** chat the user can open from anywhere in the app. Voice can be added later by wiring a mic button into the same input.

## What the assistant can do (tools)

Server-side agent (edge function) with tool-calling. All tools are user-scoped via the caller's JWT → RLS enforces access.

1. **`get_schedule(from, to)`** — reads `schedule_events`. Powers "what's on my calendar today/this week?"
2. **`get_deadlines(from, to)`** — reads `schedule_events` filtered to deadlines/assignments. Powers "what homework is due this week?"
3. **`search_courses(query, faculty?, level?)`** — wraps `searchCatalog`. Powers "find me a machine learning course."
4. **`add_course_to_plan(code)`** — inserts into `user_courses`, runs `checkFit` first, surfaces conflicts. Requires user confirmation in UI before executing.
5. **`append_to_cv(section, text)`** — appends a bullet to latest `cv_uploads.raw_text`, re-runs `analyze-cv` so extracted skills update. Powers "add that I did a Python internship at Bolt."
6. **`get_career_status()`** — reads latest `career_plans` row. Powers "what's my recommended path and what's my biggest skill gap?"

Read-only tools auto-execute. Write tools (`add_course_to_plan`, `append_to_cv`) render an inline confirmation card and only run on **Confirm**.

## UI

- **Floating assistant button** (bottom-right, all app pages) → opens a side `Sheet`.
- **Drawer contents**:
  - Scrolling message list (markdown rendered)
  - Text input + Send button at the bottom
  - Inline tool-confirmation cards: "Add *Distributed Systems (ITC8030)* to your plan? [Confirm] [Cancel]"
  - Empty-state suggestions: "What's due this week?" · "Find a machine learning elective" · "Add Python internship to my CV"
- No mic button yet. Layout leaves room next to Send so voice can slot in later without redesign.

## Architecture

```text
User types message
        │
        ▼
  Assistant Drawer (React, in AppLayout)
        │  POST /assistant (SSE stream)
        ▼
  Edge function: assistant
   ├─ Lovable AI Gateway (google/gemini-3-flash-preview, streaming, tool-calling)
   ├─ Tool dispatch → Supabase queries (uses user JWT)
   └─ Streams text tokens + tool-call events back
        │
        ▼
  Renders streamed message + confirmation cards for write tools
```

Conversation state lives in component state for v1 (no DB persistence — fresh thread per drawer open). Easy to add a `chat_messages` table later.

## New files / changes

- `supabase/functions/assistant/index.ts` — streaming chat endpoint with the 6 tools above. Uses Lovable AI Gateway (`LOVABLE_API_KEY`, already provisioned).
- `src/components/app/AssistantDrawer.tsx` — `Sheet`-based drawer with message list, input, confirmation cards, SSE consumer.
- `src/components/app/AssistantButton.tsx` — floating launcher (fixed bottom-right, `MessageCircle` icon).
- `src/components/app/AppLayout.tsx` — mount the floating button so it appears on every authenticated page.
- `supabase/config.toml` — add `[functions.assistant]` block with `verify_jwt = true` (we want the user JWT for RLS).

No DB schema changes. No new secrets needed. No voice code.

## Out of scope (deferred)

- Voice input (mic + transcription edge function + ElevenLabs key) — revisit after text version ships.
- Voice output / TTS replies.
- Persisting chat history across sessions.
- Editing/deleting calendar items via the assistant (read-only for schedule in v1).

