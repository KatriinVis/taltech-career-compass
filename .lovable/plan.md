

# Connect MESA.I to live TalTech & EuroTeQ course data

Replace the static JSON catalogs with real data scraped from the two sources you specified, stored in Lovable Cloud, and refreshed on demand.

## Sources

- **TalTech** — `https://tunniplaan.taltech.ee/#/public` (public timetable). Unlike ÕIS, this one exposes real **scheduled slots** (day, start, end, room), which is exactly what powers the timetable + clash detection.
- **EuroTeQ** — `https://eduxchange.eu/euroteq/for-students-taltech/explore` (official EduXchange portal for TalTech students). Provides title, host university, ECTS, format, and description.

## Architecture

```text
[ tunniplaan.taltech.ee ]      [ eduxchange.eu/euroteq ]
            \                          /
             \                        /
        ┌─────────────────────────────┐
        │  edge fn: sync-courses      │  ← Firecrawl (JS-rendered scrape)
        │  - parses both sources      │
        │  - normalises to Course     │
        │  - upserts to DB            │
        └─────────────┬───────────────┘
                      │
              ┌───────▼────────┐
              │ courses (DB)   │  ← public read, service-role write
              │ course_skills  │
              └───────┬────────┘
                      │
        ┌─────────────▼──────────────┐
        │ src/lib/courseProvider.ts  │  ← same API: taltech(), euroteq(),
        │   (DB-backed, React Query) │     electives(), byCode(), clashesWith()
        └─────────────┬──────────────┘
                      │
   Courses · Career · Timetable · Dashboard (no changes)
```

## Why we need Firecrawl

Both URLs are **JavaScript-rendered single-page apps** (`tunniplaan.taltech.ee` is a hash-routed Vue app; EduXchange is a React app). A plain `fetch` returns an empty HTML shell. We need a JS-capable scraper. Firecrawl is the cleanest fit, available as a Lovable connector, and we already have the integration pattern.

You'll be prompted to connect Firecrawl on first sync. No API key from you — the connector handles it.

## Database

New tables (RLS: public read, service-role write):

- **`courses`** — `code` (PK), `name`, `ects`, `semester`, `required`, `day`, `start`, `end`, `room`, `format`, `university`, `source` (`'taltech'` | `'euroteq'`), `description`, `url`, `last_synced_at`
- **`course_skills`** — `(course_code, skill)` composite PK, many-to-many for matching against `career_paths.skills`
- **`sync_runs`** — `id`, `source`, `status`, `inserted`, `updated`, `failed`, `error`, `finished_at` — so the Settings page can show "Last sync: 12 min ago, 247 courses"

## Edge function: `sync-courses`

`supabase/functions/sync-courses/index.ts` does:

1. **TalTech**: Firecrawl `scrape` on `https://tunniplaan.taltech.ee/#/public` with `waitFor: 3000` and `formats: ['html', 'links']`. Parse the rendered course list — each entry yields `code`, `name`, `day`, `start`, `end`, `room`. For courses with multiple weekly slots we keep the first occurrence (the timetable view groups by week).
2. **EuroTeQ**: Firecrawl `crawl` on `https://eduxchange.eu/euroteq/for-students-taltech/explore` with `limit: 200` and `includePaths: ['/euroteq/.*course.*']` to follow each course detail page. Extract title, host university, ECTS, format (online/hybrid/on-site), description.
3. **Skill derivation**: tokenize the description against the controlled vocabulary built from `src/data/career_paths.json` (so `cv_extract` / bottle diagram / JD search keep working unchanged).
4. **Upsert** to `courses` + `course_skills`. Log to `sync_runs`.
5. Return `{ taltech: {inserted, updated}, euroteq: {...}, durationMs }`.

Triggered by:
- Manual "Re-sync course catalog" button on `/settings` (calls `supabase.functions.invoke('sync-courses')`)
- Optional nightly cron via `pg_cron` (deferred to phase 2)

## Frontend changes

- **`src/lib/courseProvider.ts`** — replace JSON imports with a React-Query-backed loader that selects from `courses` + `course_skills`. Public API (`taltech()`, `euroteq()`, `all()`, `byCode()`, `electives()`, `clashesWith()`, `paths()`, `pathByName()`, `eventsForPath()`, `syllabusFor()`) stays identical, so `Courses.tsx`, `Career.tsx`, `Timetable.tsx`, `Dashboard.tsx` need **zero changes**.
- **`src/pages/Courses.tsx`** — add a small loading skeleton + an empty-state ("No courses synced yet — go to Settings → Re-sync") for first run.
- **`src/pages/Settings.tsx`** — new "Course catalog" card showing last sync timestamp, total courses per source, and a "Re-sync now" button (with toast feedback).
- **JSON files** — keep `src/data/taltech_courses.json` and `src/data/euroteq_courses.json` as a one-time seed for the first sync (so the app isn't empty between connecting Firecrawl and finishing the first scrape). Deletable later.

## Limitations to flag

- **TalTech timetable changes weekly** — we sync the *current* week's slots and label them as the canonical class time. For multi-week schedules use the existing Moodle iCal import (already shipped on `/timetable`).
- **EduXchange listings update mid-semester** — the nightly re-sync handles this; manual re-sync is always available.
- **Scraper fragility** — if either site changes its DOM, the scraper breaks. We log to `sync_runs.error` and keep the last successful snapshot live so the app never goes blank.
- **Firecrawl credits** — each full sync uses ~50–100 credits. Manual button is rate-limited to 1/hour per user.

## Files touched

- **New**: `supabase/functions/sync-courses/index.ts`, migrations for `courses` / `course_skills` / `sync_runs`
- **Edited**: `src/lib/courseProvider.ts` (DB-backed, same exports), `src/pages/Settings.tsx` (sync card), `src/pages/Courses.tsx` (loading/empty states)
- **Connector**: Firecrawl (you'll be prompted to connect on first sync)

## Out of scope

- Per-user TalTech login (no public OAuth — keep Moodle iCal for personal schedules)
- Estonian-language UI (we prefer English titles, fall back to Estonian)
- Grades / transcript ingestion
- Nightly cron (phase 2 once manual sync is proven stable)

