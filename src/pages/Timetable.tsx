import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { parseICS } from "@/lib/ical";
import { Trash2, Plus, BookOpen, CalendarPlus } from "lucide-react";
import { courseProvider } from "@/lib/courseProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8..18

const kindColor: Record<string, string> = {
  class: "bg-primary text-primary-foreground",
  assignment: "bg-warning text-foreground",
  study: "bg-accent text-accent-foreground",
  event: "bg-success text-primary-foreground",
};

const sourceLabel: Record<string, string> = {
  moodle: "Moodle",
  syllabus: "Syllabus",
  uni: "Uni event",
  generated: "Course",
  manual: "Manual",
};

const daysFromNow = (offset: string | number): Date => {
  const n = typeof offset === "number" ? offset : parseInt(String(offset).replace("+", ""), 10);
  const d = new Date();
  d.setDate(d.getDate() + (isNaN(n) ? 0 : n));
  d.setHours(10, 0, 0, 0);
  return d;
};

export default function Timetable() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [icsUrl, setIcsUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [career, setCareer] = useState<any>(null);

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

  const importIcs = async (text: string) => {
    if (!user) return;
    const parsed = parseICS(text);
    if (!parsed.length) {
      toast({ title: "No events found", variant: "destructive" });
      return;
    }
    const rows = parsed.slice(0, 100).map((e) => ({
      user_id: user.id,
      title: e.title,
      kind: "assignment",
      starts_at: e.start.toISOString(),
      ends_at: e.end?.toISOString() ?? null,
      source: "moodle",
    }));
    await supabase.from("schedule_events").delete().eq("user_id", user.id).eq("source", "moodle");
    const { error } = await supabase.from("schedule_events").insert(rows);
    if (error) { toast({ title: "Import failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Imported ${rows.length} Moodle deadline${rows.length === 1 ? "" : "s"}` });
    load();
  };

  const importFromUrl = async () => {
    if (!icsUrl.trim()) return;
    setImporting(true);
    try {
      const r = await fetch(icsUrl);
      const t = await r.text();
      await importIcs(t);
    } catch (e: any) {
      toast({ title: "Could not fetch URL", description: e.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const importFromFile = async (f: File) => {
    const text = await f.text();
    await importIcs(text);
  };

  const remove = async (id: string) => {
    await supabase.from("schedule_events").delete().eq("id", id);
    load();
  };

  const addAssignment = async (courseCode: string, courseTitle: string, a: { title: string; due: string; weight: number }) => {
    if (!user) return;
    const due = daysFromNow(a.due);
    const { error } = await supabase.from("schedule_events").insert({
      user_id: user.id,
      title: `${courseCode}: ${a.title}`,
      kind: "assignment",
      starts_at: due.toISOString(),
      course_code: courseCode,
      source: "syllabus",
    });
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added to timetable", description: `${a.title} · due ${due.toLocaleDateString()}` });
    load();
  };

  const addUniEvent = async (e: { id: string; title: string; starts_at: string; location: string }) => {
    if (!user) return;
    const starts = daysFromNow(e.starts_at);
    const { error } = await supabase.from("schedule_events").insert({
      user_id: user.id,
      title: `${e.title} · ${e.location}`,
      kind: "event",
      starts_at: starts.toISOString(),
      source: "uni",
    });
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event added", description: starts.toLocaleString() });
    load();
  };

  const recurring = events.filter((e) => e.day_of_week != null);
  const oneoffs = events.filter((e) => e.starts_at).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  // This week's agenda: next 7 days of one-off items
  const now = new Date();
  const weekAhead = new Date(now); weekAhead.setDate(now.getDate() + 7);
  const weekAgenda = oneoffs.filter((e) => {
    const d = new Date(e.starts_at);
    return d >= now && d <= weekAhead;
  });

  // Unique scheduled courses for syllabi
  const scheduledCourses = Array.from(
    new Map(
      recurring
        .filter((e) => e.kind === "class" && e.course_code)
        .map((e) => [e.course_code as string, e]),
    ).values(),
  );

  const recommendedEvents = courseProvider.eventsForPath(career?.selected_path ?? null).slice(0, 6);

  const eventAt = (day: number, hour: number) =>
    recurring.find((e) => e.day_of_week === day && e.start_time && parseInt(e.start_time) === hour);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">Auto-generated from your selected career path. Add Moodle deadlines below.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>This week</CardTitle></CardHeader>
        <CardContent>
          {weekAgenda.length === 0 ? (
            <div className="text-sm text-muted-foreground">No assignments, deadlines or events in the next 7 days.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {weekAgenda.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindColor[e.kind] || "bg-secondary"}`}>
                      {e.kind}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.starts_at).toLocaleString()} · {sourceLabel[e.source] ?? e.source ?? "Manual"}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weekly schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[60px_repeat(5,minmax(110px,1fr))] gap-px bg-border rounded-lg overflow-hidden text-sm">
              <div className="bg-card p-2"></div>
              {DAYS.map((d) => <div key={d} className="bg-card p-2 font-medium text-center">{d}</div>)}
              {HOURS.map((h) => (
                <React.Fragment key={`row-${h}`}>
                  <div className="bg-card p-2 text-xs text-muted-foreground text-right">{h}:00</div>
                  {DAYS.map((_, di) => {
                    const ev = eventAt(di + 1, h);
                    return (
                      <div key={`${h}-${di}`} className="bg-background min-h-[44px] p-1">
                        {ev && (
                          <div className={`rounded-md p-1.5 text-xs leading-tight ${kindColor[ev.kind] || "bg-secondary"}`}>
                            <div className="font-medium truncate">{ev.title}</div>
                            <div className="opacity-80 text-[10px]">{ev.start_time}–{ev.end_time}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Syllabi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scheduledCourses.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add courses from your career path to see syllabi.</div>
          ) : (
            scheduledCourses.map((ev) => {
              const code = ev.course_code as string;
              const syllabus = courseProvider.syllabusFor(code);
              const course = courseProvider.byCode(code);
              return (
                <Collapsible key={code} className="rounded-md border">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-secondary/40 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{course?.name ?? ev.title} <span className="font-mono text-xs text-muted-foreground ml-1">{code}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {ev.day_of_week ? `Day ${ev.day_of_week} · ${ev.start_time}–${ev.end_time}` : "Online"}
                        {syllabus ? ` · ${syllabus.assignments.length} assignment${syllabus.assignments.length === 1 ? "" : "s"}` : ""}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Open</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t p-3 space-y-3">
                    {syllabus ? (
                      <>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1.5">Topics</div>
                          <div className="flex flex-wrap gap-1.5">
                            {syllabus.topics.map((t) => (
                              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1.5">Assignments & deadlines</div>
                          <div className="flex flex-col gap-1.5">
                            {syllabus.assignments.map((a) => {
                              const due = daysFromNow(a.due);
                              return (
                                <div key={a.title} className="flex items-center justify-between rounded-md border p-2 text-sm">
                                  <div>
                                    <div className="font-medium">{a.title}</div>
                                    <div className="text-xs text-muted-foreground">Due {due.toLocaleDateString()} · weight {a.weight}%</div>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => addAssignment(code, course?.name ?? code, a)}>
                                    <Plus className="size-3" /> Add
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">No syllabus available for this course yet.</div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarPlus className="size-4 text-primary" /> Recommended events & seminars</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendedEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No suggestions yet.</div>
          ) : (
            recommendedEvents.map((e) => {
              const starts = daysFromNow(e.starts_at);
              return (
                <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {starts.toLocaleDateString()} · {e.location} · {e.kind}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary">{t}</span>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addUniEvent(e)}>
                    <CalendarPlus className="size-3" /> Add
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Moodle iCal import</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <div>
              <Label>Paste .ics URL</Label>
              <Input value={icsUrl} onChange={(e) => setIcsUrl(e.target.value)} placeholder="https://moodle.taltech.ee/calendar/export…" />
            </div>
            <Button onClick={importFromUrl} disabled={importing} className="self-end">
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">or upload a file:</div>
          <Input type="file" accept=".ics,text/calendar" onChange={(e) => e.target.files?.[0] && importFromFile(e.target.files[0])} />
        </CardContent>
      </Card>

      {oneoffs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>All upcoming items</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {oneoffs.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindColor[e.kind] || "bg-secondary"}`}>
                    {e.kind}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.starts_at).toLocaleString()} · {sourceLabel[e.source] ?? e.source ?? "Manual"}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}