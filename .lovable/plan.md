

# Voice + chat assistant for MESA.I

Add a single AI assistant the user can talk to (mic) or type to, that can read their data and take actions: check calendar, list deadlines, add CV info, search/add courses.

## Decision: support BOTH, default to text

- **Text** is the primary input — faster, more accurate, works in lectures/libraries, easier to edit, works for course codes ("ITI0102" is hard to dictate).
- **Voice** is a quality-of-life add-on via a mic button on the same input. Good for quick check-ins ("what's due this week?") and CV dictation. Uses ElevenLabs Scribe (already a strong fit) for speech-to-text — voice is just transcribed into the text box, then the same agent runs.

Single interface, two ways in. No separate "voice mode."

## What the assistant can do (tools)

The agent runs server-side (edge function) with tool-calling. Tools map to existing tables:

1. **`get_schedule`** `(from, to)` → reads `schedule_events` for the user. Powers "what's on my calendar today/this week?"
2. **`get_deadlines`** `(from, to)` → reads `schedule_events` where `kind='deadline'` (or syllabus assignments). Powers "what homework is due this week?"
3. **`search_courses`** `(query, faculty?, level?)` → wraps `searchCatalog`. Powers "find me a machine learning course."
4. **`add_course_to_plan`** `(code)` → inserts into `user_courses` (with conflict check via `checkFit`). Confirms before inserting.
5. **`append_to_cv`** `(section, text)` → updates latest `cv_uploads.raw_text` (appends a new bullet to experience/skills/etc.) and re-runs `analyze-cv` so extracted skills update. Powers "add that I did a Python internship at Bolt last summer."
6. **`get_career_status`** → reads latest `career_plans` so the assistant can answer "what's my recommended path?"

All tools are user-scoped (server uses the caller's JWT → RLS does the rest).

## UI

- **Floating assistant button** (bottom-right, all app pages) → opens a side drawer.
- **Drawer contents**: message history (markdown rendered), text input with send button, mic button next to send.
- **Mic button**: tap to start, tap to stop. Transcribed text fills the input — user can edit before sending. Visual recording indicator (pulsing red dot + waveform).
- **Tool actions** appear inline as confirmation cards: "Add *Distributed Systems (ITC8030)* to your plan? [Confirm] [Cancel]" — destructive/data-changing tools never auto-execute.

## Architecture

```text
User (text or transcribed voice)
        │
        ▼
  Assistant Drawer (React)
        │  POST /assistant (SSE stream)
        ▼
  Edge function: assistant
   ├─ Lovable AI Gateway (gemini-3-flash-preview, streaming, tools)
   ├─ Tool dispatch → Supabase queries (uses user JWT)
   └─ Streams tokens + tool-call events back
        │
        ▼
  Renders message + tool confirmation cards
```

Voice path:
```text
Mic → MediaRecorder → /transcribe edge function
                           │
                           ▼
                  ElevenLabs Scribe (scribe_v2)
                           │
                           ▼
                  text → fills input box
```

## New files / changes

- `supabase/functions/assistant/index.ts` — streaming chat with tool-calling (Lovable AI). Tools listed above.
- `supabase/functions/transcribe/index.ts` — accepts audio blob, calls ElevenLabs Scribe, returns `{ text }`. Requires `ELEVENLABS_API_KEY` secret.
- `src/components/app/AssistantDrawer.tsx` — drawer UI with message list, input, mic button, tool-confirmation cards.
- `src/components/app/AssistantButton.tsx` — floating launcher; mounted in `AppLayout`.
- `src/lib/voiceCapture.ts` — small helper around `MediaRecorder` for capturing webm audio.
- `src/components/app/AppLayout.tsx` — mount the floating button.
- `supabase/config.toml` — add `[functions.assistant]` and `[functions.transcribe]` blocks.

No DB schema changes. CV append reuses `cv_uploads`; course add reuses `user_courses`.

## Secret needed

`ELEVENLABS_API_KEY` for transcription. Lovable AI gateway uses the existing `LOVABLE_API_KEY` (already provisioned). I'll request the ElevenLabs key when we start building.

## Out of scope

- Voice **output** (TTS reading replies aloud) — not requested; can add later.
- Background "always listening" — privacy + cost; explicit tap-to-record only.
- Editing/deleting calendar items via voice — read-only for schedule in v1; only CV and course-plan are write-enabled.
- Multi-turn voice ping-pong without tapping mic again.

