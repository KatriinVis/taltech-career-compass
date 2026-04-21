import taltech from "@/data/taltech_courses.json";
import euroteq from "@/data/euroteq_courses.json";
import paths from "@/data/career_paths.json";

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
};