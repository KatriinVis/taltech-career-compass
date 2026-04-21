

# AI Mobility Agent — TalTech Career Driver

A pilot-ready web app that helps 2nd-year TalTech students align their courses, schedule, and career path using an AI agent.

## Stack
- React + Tailwind (existing Lovable starter)
- Lovable Cloud (Postgres + Auth + Edge Functions)
- Lovable AI Gateway (Gemini 2.5 Flash default, Pro for CV/career reasoning)

## Core data (mock, v1)
- `taltech_courses.json` — ~40 realistic 2nd-year IT/Engineering courses (code, name, ECTS, semester, schedule slot, prerequisites, required/elective, skills tags)
- `euroteq_courses.json` — ~20 EuroTeQ cross-university electives
- `career_paths.json` — ~15 paths (Software Eng, Data Sci, Robotics, Product, Cybersec, etc.) with required skills + linked courses
- All loaded via a `courseProvider` interface so real APIs can plug in later

## Auth & onboarding
- Email + password (Lovable Cloud)
- `profiles` table: name, program, year, interests
- `cv_uploads`, `study_plans`, `career_plans`, `schedule_events` tables (RLS: user owns their rows)
- 3-step onboarding: account → program/year/interests → upload CV (PDF/text)

## Features

**1. Smart Timetable**
- Visual weekly grid (Mon–Fri, time slots)
- Auto-generates schedule from selected required + suggested elective courses, resolving conflicts
- Add assignments + study blocks; drag to reschedule
- **Moodle iCal import**: paste `.ics` URL or upload file → parses deadlines into the schedule
- Adaptive workload: agent reduces suggested study hours when too many deadlines cluster, flags retention risk (low logged activity, missed self-check-ins)

**2. Career Alignment Engine**
- Edge function `analyze-cv`: parses uploaded CV via Lovable AI → extracts skills, experience, interests
- Edge function `match-career`: maps profile → ranked career paths with explainable reasoning ("You have Python + stats → Data Science: 87% match because…")
- Suggests specific TalTech + EuroTeQ courses and skills to close gaps
- Recommends events (mock seeded list, extensible)

**3. Bottle Diagram Visualization**
- SVG funnel: CV skills (wide top) → interests filter → candidate paths (narrowing) → chosen goal (bottle neck)
- Interactive: click a layer to see what was filtered and why

**4. Adaptive Agent Loop**
- Daily check-in widget: "How did this week go?" → adjusts plan
- Performance signals (self-rated course difficulty, completion of study blocks) feed back into workload + course suggestions
- Rule-based retention risk score + AI-generated coaching message

## Demo flow (judge-ready)
Sign up → onboarding → upload CV → see extracted skills → view 3 ranked career paths with reasoning → accept one → auto-generated timetable + study plan appears → import Moodle iCal → adaptive recommendations update

## Pages
- `/` — Landing + sign in/up
- `/onboarding`
- `/dashboard` — overview, retention risk, next actions
- `/timetable`
- `/career` — Bottle Diagram + path details
- `/courses` — browse TalTech + EuroTeQ catalog with AI recommendations
- `/settings`

## Design
- Clean academic feel: TalTech-inspired navy + cyan accent, light background, Inter font, generous spacing, card-based layout, subtle motion on agent updates

## Out of scope (v1, deferred)
- Real TalTech/EuroTeQ live API scraping
- Native Moodle plugin (using iCal import instead)
- Mobile native app

