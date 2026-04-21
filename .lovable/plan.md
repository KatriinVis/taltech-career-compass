

# Tick off completed assignments in Timetable

Add a checkbox next to each item in the "All upcoming items" list on `/timetable`, so the user can mark assignments (and any other event) as done. Done items show with a strikethrough and dimmed text, and stay in the list (so they can be unchecked) but are visually de-emphasized.

## Changes

### 1. Database
Migration on `schedule_events`:
- Add `completed_at timestamptz NULL` (nullable; `NULL` = not done, timestamp = done at that time)

Existing RLS (`events_own_all`) already covers updates — no policy changes needed.

### 2. UI — `src/pages/Timetable.tsx`
In the "All upcoming items" list:
- Add a `<Checkbox>` (already in `src/components/ui/checkbox.tsx`) on the left of each row
- Checked state = `event.completed_at !== null`
- On toggle: `supabase.from("schedule_events").update({ completed_at: checked ? new Date().toISOString() : null }).eq("id", id)`, then refresh local state optimistically
- When done: apply `line-through text-muted-foreground` to the title/meta
- Keep the existing delete button

### 3. Week & month grid
Items already rendered in the week grid and month drawer get the same treatment: completed items render with strikethrough + reduced opacity so the user sees progress at a glance. No checkbox in the grid cells (too cramped) — only in the list and drawer.

### 4. Types
`src/integrations/supabase/types.ts` regenerates automatically after the migration; no manual edit.

## Out of scope
- Filtering completed items out of the list (kept visible, just dimmed)
- Streaks / completion stats on Dashboard (can be a follow-up)
- Bulk "mark all done" actions

