

# Timetable: week navigation + monthly overview

Add week-by-week paging and a separate monthly view to `/timetable`.

## What changes

**1. View switcher at the top of `/timetable`**
A `Tabs` control with two tabs: **Week** (default) and **Month**. State held locally; no URL changes.

**2. Week view — paginated by week**
- Add a header bar above the weekly grid with `← Prev week`, a label like `Mon 21 Apr – Sun 27 Apr 2026`, `Next week →`, and a `This week` reset button.
- Track `weekStart` (Monday) in state. `Prev`/`Next` shift it by 7 days.
- The existing **"This week" agenda strip** is renamed to **"This week's items"** and filters one-off `schedule_events` (assignments, deadlines, uni events) whose `starts_at` falls inside `[weekStart, weekStart+7d)` — not just "next 7 days from today".
- The weekly grid (Mon–Fri × 8:00–18:00) keeps showing recurring `kind: "class"` rows (they repeat every week), but each cell that overlaps the current week also renders one-off items at the matching hour with their `kindColor` badge so classes + assignments + events sit side-by-side.
- Day column headers show the actual date (e.g. `Mon 21`) for the visible week.

**3. Month view — calendar grid**
- A 7-column × 5–6 row month grid (Mon-first), built with plain divs + Tailwind (no new deps). Header bar mirrors the week view: `← Prev month`, `April 2026`, `Next month →`, `Today`.
- Each day cell shows the date number plus up to 3 stacked chips for items on that day:
  - Recurring classes (expanded onto every matching weekday in the month) — chip uses `kindColor.class` + course code.
  - One-off `schedule_events` (assignments, uni events, Moodle deadlines) — chip uses the matching `kindColor` and shows a short title.
  - If more than 3 items on a day, append a `+N more` chip.
- Click a day → opens a `Sheet` (right-side drawer) listing **all items for that day** with: time, title, source badge, `kind` badge, and — for assignments tied to a `course_code` — the course's **objectives/topics** pulled from `syllabi.json` via `courseProvider.syllabusFor(code)`. Each item has a `Remove` button (same as the existing list rows).
- Today's cell gets a subtle ring; days outside the current month are muted.

**4. Course objectives surfaced in both views**
- Week view: in the renamed "This week's items" list, each assignment row with a `course_code` shows a one-line "Objectives: topic1 · topic2 · topic3" pulled from `syllabi.json` (truncated).
- Month view: full objectives list inside the day-detail drawer.

## Files touched

- `src/pages/Timetable.tsx` — add `Tabs` switcher, `weekStart`/`monthStart` state, week navigation header, dated day columns, month grid, day-detail `Sheet`, objectives line.

No new files, no schema changes, no new dependencies (we already have `Tabs`, `Sheet`, `Button`, `lucide-react` icons, and `syllabi.json`). Existing helpers `daysFromNow`, `kindColor`, `sourceLabel`, and `courseProvider.syllabusFor` are reused.

## Out of scope (defer)

- Drag-to-reschedule
- Editing recurring class times from the calendar
- Year view / agenda export

