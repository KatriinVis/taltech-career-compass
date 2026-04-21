

# Iterate: progress, syllabi, smarter timetable & courses

Five connected changes across Dashboard, Career, Timetable, and Courses.

## 1. Dashboard — replace "Retention risk" with "Program progress"

Drop the deadline-clustering risk metric. Replace the first stat card with **Program progress**:

- Numerator = ECTS of courses currently in `schedule_events` where `course_code` matches a TalTech catalog entry (dedupe by code).
- Denominator = 180 ECTS (3-year BSc default; configurable later).
- Show `XX / 180 ECTS` + a progress bar + a small line "Required courses completed: N/M" (counted via `courseProvider.taltech()` where `required: true`).
- Remove the upcoming-deadlines × low-check-ins risk math from `Dashboard.tsx`.

## 2. Bottle Diagram — only skills that apply to the chosen goal

In `BottleDiagram.tsx`, filter the `skills` layer:

- If `goal` is set, look up that path via `courseProvider.paths()` and intersect `skills` with `path.skills` (case-insensitive, normalize hyphens/spaces).
- Show `matched / total` in the count line ("8 of 14 skills apply").
- Add a second muted row of "Other skills" beneath the active list when the user clicks Skills, so nothing is hidden — just visually de-emphasized.
- If no goal yet, behave as today (show all).

`Career.tsx` already passes `selected` as `goal` — no caller changes needed.

## 3. New "Syllabi" section under Timetable

Add a **Syllabi** card on `/timetable` (below the weekly grid, above Moodle import):

- For each course currently in the user's `schedule_events` (dedupe by `course_code`), render a collapsible row.
- Each row shows: course name + code, weekly slot, **Assignments & deadlines** list, and **Suggested events/seminars**.
- Data source: a new mock `src/data/syllabi.json` keyed by course code with `{ assignments: [{title, due, weight}], topics: [...] }`. Realistic mock data for the ~25 TalTech courses.
- "Add to timetable" button on each assignment → inserts a `schedule_events` row with `kind: "assignment"`, `starts_at = due`, `source: "syllabus"`.
- **University events feed**: a sibling card "Recommended events & seminars" driven by a new `src/data/uni_events.json` (10–15 mock seminars, hackathons, career fairs with `tags: string[]`, `starts_at`, `location`). Filter/rank by overlap between event tags and the selected career path's `skills`. Each event has "Add to calendar" → inserts as `kind: "event"`, `source: "uni"`.

## 4. Timetable grid shows classes + assignments + events together

Currently the grid only renders recurring `class` events. Extend it:

- Keep the recurring weekly grid for `kind: "class"` (as today).
- Add a new **"This week" agenda strip** above the grid: list of one-off `schedule_events` (assignments + events + deadlines) for the next 7 days, color-coded by `kind` using the existing `kindColor` map, sorted by date, with the source badge ("Moodle", "Syllabus", "Uni event").
- The existing "Upcoming deadlines" card stays but is renamed "All upcoming items" and shows everything one-off (assignments + events + Moodle imports), not just Moodle.

## 5. Courses page — electives + clash detection

Two upgrades to `/courses`:

**A. "Recommended electives" card at top**
- Pulls the user's selected career path from `career_plans.selected_path`.
- Ranks elective TalTech courses (`required: false`) + EuroTeQ courses by skill overlap with the path's `skills` array.
- Shows top 6 with a "Why" chip (matched skills) and an "Add to timetable" button.

**B. Clash badge on every course card**
- Compute a `Set` of `{day_of_week, start_time}` from current `schedule_events` of `kind: "class"`.
- For each TalTech course with `day` + `start`, mark it red **"Clashes with [course title]"** if its slot collides; otherwise green **"Free slot"**.
- EuroTeQ courses (no day/start) get a neutral "Online/hybrid" badge.
- The "Add to timetable" button is disabled when clashing, with a tooltip explaining why.

**C. Optional "Match to job description" textarea**
- A small input above the elective list: paste a job description; on submit, call the existing `match-career` edge function with `paths` swapped for the elective course list (or a new edge function `suggest-electives` if cleaner). For v1, do this client-side: tokenize the JD, intersect tokens with each course's `skills`, rank top 6. Keeps it free and instant.

## Files touched

- `src/pages/Dashboard.tsx` — swap risk → progress card
- `src/components/app/BottleDiagram.tsx` — goal-aware skill filter
- `src/pages/Timetable.tsx` — agenda strip, syllabi card, events card, rename deadlines
- `src/pages/Courses.tsx` — electives panel, clash detection, JD input, add-to-timetable
- `src/data/syllabi.json` — NEW, mock syllabus per course
- `src/data/uni_events.json` — NEW, mock university events
- `src/lib/courseProvider.ts` — small helpers: `electives()`, `clashesWith(course, events)`, `syllabusFor(code)`, `eventsForPath(pathId)`

No schema changes — all new items reuse `schedule_events` with appropriate `kind`/`source` values.

## Out of scope (defer)

- Live Moodle/TalTech API scraping (still iCal + mock JSON)
- Persisting user-dismissed event suggestions
- Multi-program ECTS targets (hardcoded 180 for now)

