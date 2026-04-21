import { useEffect, useMemo, useState } from "react";
import { courseProvider, subscribeCourses, searchCatalog, listFaculties, type Course, type CatalogCourse } from "@/lib/courseProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, AlertTriangle, Check, Globe, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { checkFit, type FitResult } from "@/lib/scheduleFit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  // Catalog browse state
  const [catQuery, setCatQuery] = useState("");
  const [catFaculty, setCatFaculty] = useState<string | null>(null);
  const [catPage, setCatPage] = useState(0);
  const [catRows, setCatRows] = useState<CatalogCourse[]>([]);
  const [catTotal, setCatTotal] = useState(0);
  const [catLoading, setCatLoading] = useState(false);
  const [faculties, setFaculties] = useState<string[]>([]);
  const PAGE_SIZE = 50;
  const [hideConflicts, setHideConflicts] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<{ course: CatalogCourse; titles: string[] } | null>(null);
  useEffect(() => {
    courseProvider.loadCourses().then(() => forceTick((n) => n + 1));
    return subscribeCourses(() => forceTick((n) => n + 1));
  }, []);

  useEffect(() => {
    listFaculties().then(setFaculties).catch(() => {});
  }, []);

  const loadCatalog = async () => {
    setCatLoading(true);
    try {
      const r = await searchCatalog({
        query: catQuery || undefined,
        faculty: catFaculty,
        source: tab === "all" ? null : tab,
        page: catPage,
        pageSize: PAGE_SIZE,
      });
      setCatRows(r.rows);
      setCatTotal(r.count);
    } catch { }
    setCatLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, [catQuery, catFaculty, catPage, tab]);

  const addToCurriculum = async (c: CatalogCourse) => {
    if (!user) return;
    const { error } = await supabase.from("user_courses").insert({
      user_id: user.id,
      code: c.code,
      name: c.name,
      ects: c.ects,
      semester: c.semester,
      status: "planned",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added to programme", description: `${c.code} · ${c.name}` });
  };

  const handleAddCatalog = (c: CatalogCourse) => {
    const fit = checkFit(c, events as any);
    if (fit.status === "conflicts") {
      setPendingConflict({ course: c, titles: fit.with });
      return;
    }
    addToCurriculum(c);
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="size-4" /> Course catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 bg-secondary rounded-md p-1">
              {(["all", "taltech", "euroteq"] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setCatPage(0); }} className={`px-3 py-1.5 text-sm rounded ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                  {t === "all" ? "All" : t === "taltech" ? "TalTech" : "EuroTeQ"}
                </button>
              ))}
            </div>
            <Input placeholder="Search by code or name…" value={catQuery} onChange={(e) => { setCatQuery(e.target.value); setCatPage(0); }} />
            {faculties.length > 0 && (
              <Select value={catFaculty ?? "__all__"} onValueChange={(v) => { setCatFaculty(v === "__all__" ? null : v); setCatPage(0); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Faculty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All faculties</SelectItem>
                  {faculties.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{catTotal} courses found · page {catPage + 1}/{Math.max(1, Math.ceil(catTotal / PAGE_SIZE))}</div>
          <div className="grid md:grid-cols-2 gap-3">
            {catRows.map((c) => (
              <div key={c.code} className="rounded-lg border p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{c.code} · {c.ects ?? "?"} ECTS · {c.faculty ?? c.source}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => addToCurriculum(c)} title="Add to my programme">
                  <Plus className="size-3 mr-1" /> Add
                </Button>
              </div>
            ))}
            {!catLoading && catRows.length === 0 && <div className="text-sm text-muted-foreground">No matches.</div>}
          </div>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" disabled={catPage === 0} onClick={() => setCatPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button size="sm" variant="outline" disabled={(catPage + 1) * PAGE_SIZE >= catTotal} onClick={() => setCatPage((p) => p + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
