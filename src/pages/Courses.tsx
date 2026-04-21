import { useEffect, useMemo, useState } from "react";
import { courseProvider, subscribeCourses, type Course } from "@/lib/courseProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Plus, AlertTriangle, Check, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

export default function Courses() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "taltech" | "euroteq">("all");
  const [events, setEvents] = useState<any[]>([]);
  const [career, setCareer] = useState<any>(null);
  const [jd, setJd] = useState("");
  const [jdSubmitted, setJdSubmitted] = useState("");
  const [, forceTick] = useState(0);
  useEffect(() => {
    courseProvider.loadCourses().then(() => forceTick((n) => n + 1));
    return subscribeCourses(() => forceTick((n) => n + 1));
  }, []);

  const load = async () => {
    if (!user) return;
    const [ev, cp] = await Promise.all([
      supabase.from("schedule_events").select("*").eq("user_id", user.id),
      supabase.from("career_plans").select("selected_path").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setEvents(ev.data ?? []);
    setCareer(cp.data);
  };
  useEffect(() => { load(); }, [user]);

  const classEvents = useMemo(() => events.filter((e) => e.kind === "class" && e.day_of_week != null), [events]);
  const scheduledCodes = useMemo(() => new Set(classEvents.map((e) => e.course_code).filter(Boolean)), [classEvents]);

  const path = career?.selected_path ? courseProvider.pathByName(career.selected_path) : undefined;

  const courses = useMemo(() => {
    const base = tab === "taltech" ? courseProvider.taltech() : tab === "euroteq" ? courseProvider.euroteq() : courseProvider.all();
    if (!q.trim()) return base;
    const s = q.toLowerCase();
    return base.filter((c) => c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.skills.some((k) => k.includes(s)));
  }, [q, tab]);

  // Recommended electives for selected career path
  const recommended = useMemo(() => {
    if (!path) return [];
    const pathSkills = new Set(path.skills.map((s) => s.toLowerCase()));
    return courseProvider.electives()
      .filter((c) => !scheduledCodes.has(c.code))
      .map((c) => {
        const matches = c.skills.filter((s) => pathSkills.has(s.toLowerCase()));
        return { course: c, matches };
      })
      .filter((r) => r.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 6);
  }, [path, scheduledCodes]);

  // JD matching (client-side tokenize)
  const jdMatches = useMemo(() => {
    if (!jdSubmitted.trim()) return [];
    const tokens = new Set(
      jdSubmitted.toLowerCase().match(/[a-z][a-z0-9+\-]{2,}/g) ?? [],
    );
    return courseProvider.electives()
      .map((c) => {
        const matches = c.skills.filter((s) => tokens.has(s.toLowerCase()));
        return { course: c, matches };
      })
      .filter((r) => r.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 6);
  }, [jdSubmitted]);

  const addToTimetable = async (c: Course) => {
    if (!user) return;
    const insert: any = {
      user_id: user.id,
      title: `${c.code} · ${c.name}`,
      kind: "class",
      course_code: c.code,
      source: "manual",
    };
    if (c.day != null) {
      insert.day_of_week = c.day;
      insert.start_time = c.start;
      insert.end_time = c.end;
    }
    const { error } = await supabase.from("schedule_events").insert(insert);
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added to timetable", description: c.name });
    load();
  };

  const renderClashBadge = (c: Course) => {
    if (c.source === "euroteq" || c.day == null) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground inline-flex items-center gap-1">
          <Globe className="size-3" /> {c.format ?? "online"}
        </span>
      );
    }
    const clash = courseProvider.clashesWith(c, classEvents);
    if (clash) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive inline-flex items-center gap-1">
          <AlertTriangle className="size-3" /> Clashes with {clash.title}
        </span>
      );
    }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/15 text-success inline-flex items-center gap-1">
        <Check className="size-3" /> Free slot {DAY_NAMES[c.day]} {c.start}
      </span>
    );
  };

  const renderAddButton = (c: Course) => {
    if (scheduledCodes.has(c.code)) {
      return <Button size="sm" variant="secondary" disabled><Check className="size-3" /> In timetable</Button>;
    }
    const clash = c.source === "taltech" ? courseProvider.clashesWith(c, classEvents) : null;
    if (clash) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button size="sm" variant="outline" disabled><Plus className="size-3" /> Add</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Clashes with {clash.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <Button size="sm" variant="outline" onClick={() => addToTimetable(c)}><Plus className="size-3" /> Add</Button>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="text-muted-foreground">Browse the TalTech and EuroTeQ catalog.</p>
      </div>

      {path && recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Recommended electives for {path.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {recommended.map(({ course, matches }) => (
              <div key={course.code} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{course.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{course.code} · {course.ects} ECTS</div>
                  </div>
                  {renderAddButton(course)}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Why: {matches.slice(0, 3).join(", ")}</span>
                </div>
                {renderClashBadge(course)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Match courses to a job description</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste a job description and we'll surface electives whose skills match…"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setJdSubmitted(jd)} disabled={!jd.trim()}>
              <Sparkles className="size-3" /> Match courses
            </Button>
            {jdSubmitted && (
              <Button size="sm" variant="ghost" onClick={() => { setJd(""); setJdSubmitted(""); }}>Clear</Button>
            )}
          </div>
          {jdSubmitted && (
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              {jdMatches.length === 0 ? (
                <div className="text-sm text-muted-foreground">No matching skills found in our catalog.</div>
              ) : (
                jdMatches.map(({ course, matches }) => (
                  <div key={course.code} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{course.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{course.code} · {course.ects} ECTS</div>
                      </div>
                      {renderAddButton(course)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent-foreground">Match: {matches.slice(0, 3).join(", ")}</span>
                    </div>
                    {renderClashBadge(course)}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-secondary rounded-md p-1">
          {(["all", "taltech", "euroteq"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {t === "all" ? "All" : t === "taltech" ? "TalTech" : "EuroTeQ"}
            </button>
          ))}
        </div>
        <Input placeholder="Search by code, name, or skill…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {courses.map((c) => (
          <Card key={c.code}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate">{c.name}</span>
                <span className="text-xs font-mono text-muted-foreground shrink-0">{c.code}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {c.source === "taltech" ? `TalTech · ${c.required ? "Required" : "Elective"}` : `EuroTeQ · ${c.university}`} · {c.ects} ECTS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.slice(0, 6).map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary">{s}</span>)}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderClashBadge(c)}
                {renderAddButton(c)}
              </div>
            </CardContent>
          </Card>
        ))}
        {!courses.length && <div className="text-sm text-muted-foreground">No matches.</div>}
      </div>
    </div>
  );
}
