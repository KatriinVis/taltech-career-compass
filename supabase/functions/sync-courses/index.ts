import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

// Controlled vocabulary derived from career_paths.json
const SKILL_VOCAB = [
  "programming","software-engineering","oop","testing","databases","python","statistics",
  "machine-learning","data-science","ai","math","mlops","cybersecurity","cryptography",
  "networking","security","robotics","embedded","control","ros","product","ux","ui",
  "communication","strategy","management","cloud","devops","docker","systems","sql",
  "big-data","data-engineering","design","research","accessibility","mobile","android",
  "swift","kotlin","c","hardware","iot","quantum","physics","algorithms","sustainability",
  "energy","engineering","entrepreneurship","business","leadership","javascript","web",
  "react","html","nlp","blockchain","distributed-systems","computer-vision","graphics",
  "ethics","ml","autonomy","innovation","design-thinking","kubernetes",
];

// Magistri-taseme prefiksid teaduskondade kaupa
const MSC_BATCHES: Record<string, string[]> = {
  it: ["ITI", "ITA", "ITC", "ITV", "ITP"],
  eng: ["MAT", "MEC", "EER", "EMR", "EAA"],
  biz: ["TMJ", "YFR", "EJR"],
};
const ALL_MSC_PREFIXES = Object.values(MSC_BATCHES).flat();

const FACULTY_MAP: Record<string, string> = {
  IT: "IT-teaduskond", ITI: "IT-teaduskond", ITA: "IT-teaduskond",
  ITC: "IT-teaduskond", ITV: "IT-teaduskond", ITP: "IT-teaduskond",
  MAT: "Loodusteadused", MEC: "Inseneriteadused", EER: "Inseneriteadused",
  EMR: "Inseneriteadused", EAA: "Inseneriteadused",
  TMJ: "Majandus", YFR: "Majandus", EJR: "Majandus",
};

function isMscCode(code: string): boolean {
  // Magistri-ained: 4. number on 8 või 9 (nt ITC8101, MEC9020)
  return /^[A-Z]{2,4}[89]\d{3}$/.test(code);
}

function facultyFromCode(code: string): string | null {
  const m = code.match(/^([A-Z]{2,4})/);
  if (!m) return null;
  return FACULTY_MAP[m[1]] ?? null;
}

function deriveSkills(text: string): string[] {
  if (!text) return [];
  const t = text.toLowerCase();
  return SKILL_VOCAB.filter((s) => t.includes(s.replace(/-/g, " ")) || t.includes(s));
}

async function firecrawlScrape(url: string, opts: Record<string, unknown> = {}) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY missing");
  const r = await fetch(`${FIRECRAWL}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "html", "links"], waitFor: 3500, onlyMainContent: false, ...opts }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Firecrawl scrape ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function firecrawlCrawl(url: string, opts: Record<string, unknown> = {}) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY missing");
  const r = await fetch(`${FIRECRAWL}/crawl`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit: 60, scrapeOptions: { formats: ["markdown"] }, ...opts }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Firecrawl crawl ${r.status}: ${JSON.stringify(data)}`);
  // Async — poll
  const id = data.id || data.jobId;
  if (!id) return data;
  for (let i = 0; i < 40; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = await fetch(`${FIRECRAWL}/crawl/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const sd = await s.json();
    if (sd.status === "completed") return sd;
    if (sd.status === "failed") throw new Error(`Crawl failed: ${JSON.stringify(sd)}`);
  }
  throw new Error("Crawl timed out");
}

type Course = {
  code: string; name: string; ects?: number | null; semester?: string | null;
  required?: boolean; day?: number | null; start?: string | null; end?: string | null;
  room?: string | null; format?: string | null; university?: string | null;
  source: "taltech" | "euroteq"; description?: string | null; url?: string | null;
  skills: string[];
  name_en?: string | null; level?: string | null; language?: string[] | null;
  faculty?: string | null; assessment?: string | null;
  learning_outcomes?: string[] | null; instructor?: string | null;
};

function parseOisCourse(md: string, url: string): Course | null {
  if (!md || md.length < 100) return null;
  // Aine kood URL-ist või tekstist
  const codeFromUrl = url.match(/\/aine\/([A-Z]{2,4}\d{3,5})/);
  const codeFromText = md.match(/\b([A-Z]{2,4}[89]\d{3})\b/);
  const code = (codeFromUrl?.[1] || codeFromText?.[1] || "").toUpperCase();
  if (!code || !isMscCode(code)) return null;

  // Pealkiri (esimene H1)
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const fullTitle = titleMatch?.[1]?.trim() || code;
  // Eesti / inglise nimi: "ETnimi / ENname" või eraldi read
  const nameSplit = fullTitle.split(/\s*\/\s*/);
  const name = nameSplit[0].replace(new RegExp(`^${code}\\s*[-–]?\\s*`), "").trim();
  const name_en = nameSplit[1]?.trim() || null;

  const ectsMatch = md.match(/(\d+(?:[.,]\d+)?)\s*EAP/i) || md.match(/(\d+(?:[.,]\d+)?)\s*ECTS/i);
  const semMatch = md.match(/\b(sügis|kevad|sügis-kevad|autumn|spring)\b/i);
  const assessMatch = md.match(/\b(eksam|arvestus|hindeline arvestus|exam|pass\/fail)\b/i);
  const langs: string[] = [];
  if (/\beesti\b|\bestonian\b/i.test(md)) langs.push("et");
  if (/\binglise\b|\benglish\b/i.test(md)) langs.push("en");

  // Õpiväljundid (lühike heuristika)
  const loSection = md.match(/(?:õpiväljundid|learning outcomes)[\s\S]{0,2000}/i)?.[0] ?? "";
  const learning_outcomes = loSection
    .split(/\n[-*•]\s+|\n\d+[\.)]\s+/)
    .slice(1, 12)
    .map((s) => s.split("\n")[0].trim())
    .filter((s) => s.length > 10 && s.length < 300);

  const instructor = md.match(/(?:õppejõud|instructor|lecturer)[:\s]+([^\n]{3,80})/i)?.[1]?.trim() || null;

  return {
    code,
    name,
    name_en,
    ects: ectsMatch ? Number(ectsMatch[1].replace(",", ".")) : null,
    semester: semMatch?.[1]?.toLowerCase() || null,
    assessment: assessMatch?.[1]?.toLowerCase() || null,
    language: langs.length ? langs : null,
    learning_outcomes: learning_outcomes.length ? learning_outcomes : null,
    instructor,
    level: "msc",
    faculty: facultyFromCode(code),
    source: "taltech",
    url,
    description: md.slice(0, 1500),
    skills: deriveSkills(md + " " + (learning_outcomes?.join(" ") ?? "")),
  };
}

async function syncMscPrefix(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<{ prefix: string; inserted: number; failed: number; error?: string }> {
  try {
    const searchUrl = `https://ois2.taltech.ee/uusois/aine/otsi?kood=${prefix}`;
    const eq = await firecrawlCrawl(searchUrl, {
      limit: 100,
      includePaths: [`.*aine/${prefix}.*`],
    });
    const pages = (eq.data || []).map((d: any) => ({
      url: d.metadata?.sourceURL || d.metadata?.url || "",
      markdown: d.markdown || "",
    }));
    const courses: Course[] = [];
    const seen = new Set<string>();
    for (const p of pages) {
      const c = parseOisCourse(p.markdown, p.url);
      if (c && !seen.has(c.code)) {
        seen.add(c.code);
        courses.push(c);
      }
    }
    const r = await upsertCourses(supabase, courses, "taltech");
    await supabase.from("sync_runs").insert({
      source: "taltech", status: "ok", inserted: r.inserted, failed: r.failed, prefix,
    });
    return { prefix, inserted: r.inserted, failed: r.failed };
  } catch (e: any) {
    await supabase.from("sync_runs").insert({
      source: "taltech", status: "error", error: String(e.message || e), prefix,
    });
    return { prefix, inserted: 0, failed: 0, error: String(e.message || e) };
  }
}

function parseTalTech(markdown: string): Course[] {
  // tunniplaan rows look like:  CODE  Course Name  Mon 10:00-12:00  ROOM-101
  const out: Course[] = [];
  const seen = new Set<string>();
  const codeRe = /([A-Z]{2,4}\d{3,5})\s+([^\n|]{4,120}?)(?:\s+(?:Mon|Tue|Wed|Thu|Fri|E|T|K|N|R)\w*\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2}))?(?:\s+([A-Z0-9\-\.]+))?/g;
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5,
    E: 1, T: 2, K: 3, N: 4, R: 5,
  };
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(markdown)) !== null) {
    const code = m[1];
    if (seen.has(code)) continue;
    seen.add(code);
    const dayKey = (m[0].match(/\b(Mon|Tue|Wed|Thu|Fri|E|T|K|N|R)\w*/) || [])[1];
    out.push({
      code,
      name: m[2].trim(),
      day: dayKey ? dayMap[dayKey] ?? null : null,
      start: m[3] ?? null,
      end: m[4] ?? null,
      room: m[5] ?? null,
      source: "taltech",
      url: "https://tunniplaan.taltech.ee/#/public",
      skills: deriveSkills(m[2]),
    });
  }
  return out;
}

function parseEuroTeQ(pages: { url: string; markdown: string }[]): Course[] {
  const out: Course[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    const md = p.markdown || "";
    if (md.length < 200) continue;
    // Try to grab a title
    const titleMatch = md.match(/^#\s+(.+)$/m);
    if (!titleMatch) continue;
    const name = titleMatch[1].trim();
    // Synthetic code from URL slug
    const slug = (p.url.split("/").filter(Boolean).pop() || name).slice(0, 40);
    const code = "ETQ-" + slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
    if (seen.has(code)) continue;
    seen.add(code);
    const ectsMatch = md.match(/(\d+(?:\.\d+)?)\s*(?:ECTS|EC|cr)/i);
    const uniMatch = md.match(/(?:University|Universit[eé]|Hochschule|TU\s\w+|EPFL|DTU|Polytechnique|Eindhoven|Prague|Technion)[^\n]{0,40}/i);
    const fmtMatch = md.match(/\b(online|hybrid|on[- ]?site|in[- ]?person)\b/i);
    out.push({
      code,
      name,
      ects: ectsMatch ? Number(ectsMatch[1]) : null,
      university: uniMatch ? uniMatch[0].trim() : null,
      format: fmtMatch ? fmtMatch[1].toLowerCase() : null,
      source: "euroteq",
      description: md.slice(0, 1500),
      url: p.url,
      skills: deriveSkills(md),
    });
  }
  return out;
}

async function upsertCourses(supabase: ReturnType<typeof createClient>, list: Course[], source: string) {
  let inserted = 0, updated = 0, failed = 0;
  for (const c of list) {
    const { error, data } = await supabase.from("courses").upsert({
      code: c.code, name: c.name, ects: c.ects ?? null, semester: c.semester ?? null,
      required: c.required ?? false, day: c.day ?? null, start: c.start ?? null,
      end: c.end ?? null, room: c.room ?? null, format: c.format ?? null,
      university: c.university ?? null, source: c.source, description: c.description ?? null,
      url: c.url ?? null, last_synced_at: new Date().toISOString(),
    }, { onConflict: "code" }).select("code");
    if (error) { failed++; console.error("upsert error", c.code, error.message); continue; }
    inserted += data?.length ?? 0;
    if (c.skills?.length) {
      await supabase.from("course_skills").delete().eq("course_code", c.code);
      await supabase.from("course_skills").insert(c.skills.map((s) => ({ course_code: c.code, skill: s })));
    }
  }
  return { inserted, updated, failed, source };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const result: Record<string, unknown> = {};

  // TalTech
  try {
    const tt = await firecrawlScrape("https://tunniplaan.taltech.ee/#/public");
    const courses = parseTalTech(tt.markdown || tt.data?.markdown || "");
    const r = await upsertCourses(supabase, courses, "taltech");
    await supabase.from("sync_runs").insert({ source: "taltech", status: "ok", inserted: r.inserted, failed: r.failed });
    result.taltech = r;
  } catch (e: any) {
    await supabase.from("sync_runs").insert({ source: "taltech", status: "error", error: String(e.message || e) });
    result.taltech = { error: String(e.message || e) };
  }

  // EuroTeQ
  try {
    const eq = await firecrawlCrawl("https://eduxchange.eu/euroteq/for-students-taltech/explore", {
      limit: 60,
      includePaths: [".*course.*", ".*offering.*"],
    });
    const pages = (eq.data || []).map((d: any) => ({
      url: d.metadata?.sourceURL || d.metadata?.url || "",
      markdown: d.markdown || "",
    }));
    const courses = parseEuroTeQ(pages);
    const r = await upsertCourses(supabase, courses, "euroteq");
    await supabase.from("sync_runs").insert({ source: "euroteq", status: "ok", inserted: r.inserted, failed: r.failed });
    result.euroteq = r;
  } catch (e: any) {
    await supabase.from("sync_runs").insert({ source: "euroteq", status: "error", error: String(e.message || e) });
    result.euroteq = { error: String(e.message || e) };
  }

  result.durationMs = Date.now() - started;
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});