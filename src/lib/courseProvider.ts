import { supabase } from "@/integrations/supabase/client";
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

export type SyncStatus = {
  totalCourses: number;
  taltechCount: number;
  euroteqCount: number;
  lastSyncAt: string | null;
  lastSource: string | null;
};

export type CatalogCourse = {
  code: string;
  name: string;
  name_en: string | null;
  ects: number | null;
  faculty: string | null;
  level: string | null;
  semester: string | null;
  source: string;
  language: string[] | null;
  day: number | null;
  start: string | null;
  end: string | null;
};

export async function searchCatalog(opts: {
  query?: string;
  faculty?: string | null;
  level?: string | null;
  source?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: CatalogCourse[]; count: number }> {
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 50;
  let q = supabase
    .from("courses")
    .select("code,name,name_en,ects,faculty,level,semester,source,language,day,start,end", { count: "exact" });
  if (opts.query?.trim()) {
    const s = opts.query.trim().replace(/[%]/g, "");
    q = q.or(`code.ilike.%${s}%,name.ilike.%${s}%,name_en.ilike.%${s}%`);
  }
  if (opts.faculty) q = q.eq("faculty", opts.faculty);
  if (opts.level) q = q.eq("level", opts.level);
  if (opts.source) q = q.eq("source", opts.source);
  q = q.order("code").range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data as any) ?? [], count: count ?? 0 };
}

export async function listFaculties(): Promise<string[]> {
  const { data } = await supabase.from("courses").select("faculty").not("faculty", "is", null);
  const set = new Set<string>();
  for (const r of (data as any[]) ?? []) if (r.faculty) set.add(r.faculty);
  return [...set].sort();
}

let cache: Course[] | null = null;
let cachePromise: Promise<Course[]> | null = null;
const subscribers = new Set<() => void>();

export function subscribeCourses(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

async function loadCourses(): Promise<Course[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const [{ data: rows }, { data: skillRows }] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("course_skills").select("course_code, skill"),
    ]);
    const skillMap = new Map<string, string[]>();
    for (const s of skillRows ?? []) {
      const arr = skillMap.get(s.course_code) ?? [];
      arr.push(s.skill);
      skillMap.set(s.course_code, arr);
    }
    const list: Course[] = (rows ?? []).map((r: any) => ({
      code: r.code,
      name: r.name,
      ects: Number(r.ects ?? 0),
      semester: r.semester ?? undefined,
      required: r.required ?? false,
      day: r.day ?? undefined,
      start: r.start ?? undefined,
      end: r.end ?? undefined,
      university: r.university ?? undefined,
      format: r.format ?? undefined,
      source: (r.source as "taltech" | "euroteq") ?? "taltech",
      skills: skillMap.get(r.code) ?? [],
    }));
    cache = list;
    subscribers.forEach((cb) => cb());
    return list;
  })();
  return cachePromise;
}

export function invalidateCourseCache() {
  cache = null;
  cachePromise = null;
  loadCourses().catch(() => {});
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const [{ count: total }, { count: tt }, { count: eq }, { data: last }] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("source", "taltech"),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("source", "euroteq"),
    supabase.from("sync_runs").select("source, finished_at").order("finished_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    totalCourses: total ?? 0,
    taltechCount: tt ?? 0,
    euroteqCount: eq ?? 0,
    lastSyncAt: last?.finished_at ?? null,
    lastSource: last?.source ?? null,
  };
}

// Sync API kept as-is by exposing async-aware helpers. Existing callers using
// the array-returning methods still work because we hydrate on first call.
let warm = false;
function warmSync() {
  if (!warm) {
    warm = true;
    loadCourses().catch(() => { warm = false; });
  }
}

export const courseProvider = {
  loadCourses,
  taltech: (): Course[] => {
    warmSync();
    return (cache ?? []).filter((c) => c.source === "taltech");
  },
  euroteq: (): Course[] => {
    warmSync();
    return (cache ?? []).filter((c) => c.source === "euroteq");
  },
  all: (): Course[] => {
    warmSync();
    return cache ?? [];
  },
  byCode: (code: string): Course | undefined => (cache ?? []).find((c) => c.code === code),
  paths: (): CareerPath[] => paths as CareerPath[],
  pathById: (id: string): CareerPath | undefined =>
    (paths as CareerPath[]).find((p) => p.id === id),
  pathByName: (name: string): CareerPath | undefined =>
    (paths as CareerPath[]).find((p) => p.name === name),
  electives: (): Course[] => {
    warmSync();
    return (cache ?? []).filter((c) => c.source === "euroteq" || !c.required);
  },
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

// Pre-warm on import so first render has data
loadCourses().catch(() => {});
