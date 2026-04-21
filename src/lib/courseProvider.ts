import taltech from "@/data/taltech_courses.json";
import euroteq from "@/data/euroteq_courses.json";
import paths from "@/data/career_paths.json";
import syllabi from "@/data/syllabi.json";
import uniEvents from "@/data/uni_events.json";

export type Course = {
  code: string;
  name: string;
  ects: number;
  semester?: string;
  required?: boolean;
  day?: number;
  start?: string;
  end?: string;
  prerequisites?: string[];
  skills: string[];
  university?: string;
  format?: string;
  source: "taltech" | "euroteq";
};

export type CareerPath = {
  id: string;
  name: string;
  description: string;
  skills: string[];
  recommended_courses: string[];
  euroteq: string[];
};

export type SyllabusAssignment = { title: string; due: string; weight: number };
export type Syllabus = { topics: string[]; assignments: SyllabusAssignment[] };
export type UniEvent = {
  id: string;
  title: string;
  tags: string[];
  starts_at: string;
  location: string;
  kind: string;
};

const tagged = (arr: any[], source: "taltech" | "euroteq"): Course[] =>
  arr.map((c) => ({ ...c, source }));

export const courseProvider = {
  taltech: (): Course[] => tagged(taltech as any[], "taltech"),
  euroteq: (): Course[] => tagged(euroteq as any[], "euroteq"),
  all: (): Course[] => [...tagged(taltech as any[], "taltech"), ...tagged(euroteq as any[], "euroteq")],
  byCode: (code: string): Course | undefined =>
    courseProvider.all().find((c) => c.code === code),
  paths: (): CareerPath[] => paths as CareerPath[],
  pathById: (id: string): CareerPath | undefined =>
    (paths as CareerPath[]).find((p) => p.id === id),
  pathByName: (name: string): CareerPath | undefined =>
    (paths as CareerPath[]).find((p) => p.name === name),
  electives: (): Course[] =>
    [
      ...tagged((taltech as any[]).filter((c) => !c.required), "taltech"),
      ...tagged(euroteq as any[], "euroteq"),
    ],
  syllabusFor: (code: string): Syllabus | undefined =>
    (syllabi as Record<string, Syllabus>)[code],
  uniEvents: (): UniEvent[] => uniEvents as UniEvent[],
  eventsForPath: (pathName: string | null): UniEvent[] => {
    const path = pathName ? courseProvider.pathByName(pathName) : undefined;
    const list = uniEvents as UniEvent[];
    if (!path) return list;
    const skills = new Set(path.skills.map((s) => s.toLowerCase()));
    return [...list]
      .map((e) => ({ e, score: e.tags.filter((t) => skills.has(t.toLowerCase())).length }))
      .sort((a, b) => b.score - a.score)
      .map(({ e }) => e);
  },
  clashesWith: (
    course: Course,
    events: { day_of_week?: number | null; start_time?: string | null; end_time?: string | null; title?: string }[],
  ): { title: string } | null => {
    if (course.day == null || !course.start) return null;
    const cStart = parseInt(course.start);
    const cEnd = course.end ? parseInt(course.end) : cStart + 2;
    for (const ev of events) {
      if (ev.day_of_week !== course.day || !ev.start_time) continue;
      const eStart = parseInt(ev.start_time);
      const eEnd = ev.end_time ? parseInt(ev.end_time) : eStart + 2;
      if (cStart < eEnd && eStart < cEnd) return { title: ev.title ?? "another class" };
    }
    return null;
  },
};