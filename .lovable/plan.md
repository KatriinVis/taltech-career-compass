

# Show calendar-fit indicator on Course catalog

When browsing `/courses`, each course card should tell the user whether the course's recurring class time conflicts with anything already in their schedule (other classes, deadlines, events).

## How "fit" is computed

A course in the `courses` table has `day` (1–7), `start` (e.g. "10:00"), `end` (e.g. "12:00"). A conflict exists when the user has an existing `schedule_events` row that overlaps:

- **Recurring class conflict**: another row with the same `day_of_week` whose `[start_time, end_time)` overlaps `[start, end)`.
- **One-off conflict**: a `starts_at`/`ends_at` row whose weekday + time window overlaps (only flagged if it's a future occurrence).

Result per course → one of:
- ✅ **Fits** (green badge "Fits your schedule") — no overlap, time data is present
- ⚠️ **Conflicts** (amber badge "Conflicts with X") — lists the conflicting item title(s) in tooltip
- ⏱️ **No time set** (muted badge "Time TBD") — course has no `day`/`start`/`end`, can't check

## Changes

### `src/lib/scheduleFit.ts` (new)
Pure helper:
```ts
export type FitResult =
  | { status: "fits" }
  | { status: "conflicts"; with: string[] }
  | { status: "unknown" };

export function checkFit(
  course: { day?: number|null; start?: string|null; end?: string|null },
  events: Array<{ day_of_week?: number|null; start_time?: string|null; end_time?: string|null; starts_at?: string|null; ends_at?: string|null; title: string }>
): FitResult
```
- Parses `"HH:MM"` to minutes
- Overlap test: `aStart < bEnd && bStart < aEnd`
- Returns conflict titles deduped

### `src/pages/Courses.tsx`
- On mount (already authenticated), fetch the user's `schedule_events` once into state `userEvents`.
- For each rendered course card, call `checkFit(course, userEvents)` and render a `<Badge>` next to the existing meta row (ECTS, semester, etc.).
- Tooltip on amber badge lists up to 3 conflicting items ("Conflicts with: Algorithms, Thesis seminar").
- Add a top-of-page filter toggle: **"Hide conflicts"** (default off) — when on, filters out courses where status is "conflicts".

### `src/pages/Courses.tsx` — "Add to plan" button
- If the course conflicts, the Add button stays enabled but shows a confirm dialog: "This course overlaps with X. Add anyway?" → Continue / Cancel.

## Out of scope
- Conflict detection between two not-yet-added catalog courses (only checks against user's existing schedule).
- Semester-aware logic (assumes all events are concurrent — fine for MVP since most users plan one semester at a time).
- Editing the conflicting item from the courses page.

