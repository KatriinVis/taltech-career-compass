import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { parseICS } from "@/lib/ical";
import { Trash2, Plus, BookOpen, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { courseProvider } from "@/lib/courseProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);

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

const startOfWeek = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  return x;
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtDateShort = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtMonthYear = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export default function Timetable() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [icsUrl, setIcsUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [career, setCareer] = useState<any>(null);
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState<Date>(() => {
    const n = new Date(); n.setDate(1); n.setHours(0, 0, 0, 0); return n;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);

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
    if (!parsed.length) { toast({ title: "No events found", variant: "destructive" }); return; }
    const rows = parsed.slice(0, 100).map((e) => ({
      user_id: user.id, title: e.title, kind: "assignment",
      starts_at: e.start.toISOString(), ends_at: e.end?.toISOString() ?? null, source: "moodle",
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
    try { const r = await fetch(icsUrl); await importIcs(await r.text()); }
    catch (e: any) { toast({ title: "Could not fetch URL", description: e.message, variant: "destructive" }); }
    finally { setImporting(false); }
  };

  const importFromFile = async (f: File) => { await importIcs(await f.text()); };

  const remove = async (id: string) => {
    await supabase.from("schedule_events").delete().eq("id", id);
    load();
  };

  const toggleDone = async (id: string, done: boolean) => {
    const completed_at = done ? new Date().toISOString() : null;
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, completed_at } : e)));
    const { error } = await supabase.from("schedule_events").update({ completed_at }).eq("id", id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      load();
    }
  };

  const addAssignment = async (courseCode: string, courseTitle: string, a: { title: string; due: string; weight: number }) => {
    if (!user) return;
    const due = daysFromNow(a.due);
    const { error } = await supabase.from("schedule_events").insert({
      user_id: user.id, title: `${courseCode}: ${a.title}`, kind: "assignment",
      starts_at: due.toISOString(), course_code: courseCode, source: "syllabus",
    });
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added to timetable", description: `${a.title} · due ${due.toLocaleDateString()}` });
    load();
  };

  const addUniEvent = async (e: { id: string; title: string; starts_at: string; location: string }) => {
    if (!user) return;
    const starts = daysFromNow(e.starts_at);
    const { error } = await supabase.from("schedule_events").insert({
      user_id: user.id, title: `${e.title} · ${e.location}`, kind: "event",
      starts_at: starts.toISOString(), source: "uni",
    });
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event added", description: starts.toLocaleString() });
    load();
  };

  const recurring = events.filter((e) => e.day_of_week != null);
  const oneoffs = events.filter((e) => e.starts_at).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  // Items inside currently visible week
  const weekEnd = addDays(weekStart, 7);
  const weekItems = oneoffs.filter((e) => {
    const d = new Date(e.starts_at);
    return d >= weekStart && d < weekEnd;
  });

  const scheduledCourses = Array.from(
    new Map(recurring.filter((e) => e.kind === "class" && e.course_code).map((e) => [e.course_code as string, e])).values(),
  );

  const recommendedEvents = courseProvider.eventsForPath(career?.selected_path ?? null).slice(0, 6);

  const recurringAt = (day: number, hour: number) =>
    recurring.find((e) => e.day_of_week === day && e.start_time && parseInt(e.start_time) === hour);

  const oneoffsAt = (dayIndex: number, hour: number) => {
    const cellDate = addDays(weekStart, dayIndex);
    return weekItems.filter((e) => {
      const d = new Date(e.starts_at);
      return sameDay(d, cellDate) && d.getHours() === hour;
    });
  };

  const objectivesLine = (code?: string | null) => {
    if (!code) return null;
    const syl = courseProvider.syllabusFor(code);
    if (!syl?.topics?.length) return null;
    return syl.topics.slice(0, 3).join(" · ");
  };

  // ---------- Month grid ----------
  const monthCells = useMemo(() => {
    const first = new Date(monthStart);
    const gridStart = startOfWeek(first);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
    // trim trailing full empty week
    while (cells.length > 35 && cells[cells.length - 7].getMonth() !== monthStart.getMonth()) cells.splice(-7);
    return cells;
  }, [monthStart]);

  const itemsForDay = (date: Date) => {
    const dow = date.getDay() === 0 ? 7 : date.getDay(); // Mon=1..Sun=7
    const classes = recurring
      .filter((e) => e.kind === "class" && e.day_of_week === dow)
      .map((e) => ({ ...e, _displayTime: e.start_time, _isRecurring: true }));
    const ones = oneoffs
      .filter((e) => sameDay(new Date(e.starts_at), date))
      .map((e) => ({ ...e, _displayTime: new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), _isRecurring: false }));
    return [...classes, ...ones].sort((a, b) => (a._displayTime ?? "").localeCompare(b._displayTime ?? ""));
  };

  const today = new Date();
  const dayDetailItems = selectedDay ? itemsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">Plan your weeks and see the month at a glance.</p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>

        {/* ---------------- WEEK VIEW ---------------- */}
        <TabsContent value="week" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>This week's items</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="text-sm font-medium px-2 min-w-[200px] text-center">
                  {fmtDateShort(weekStart)} – {fmtDateShort(addDays(weekStart, 6))}
                </div>
                <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
              </div>
            </CardHeader>
            <CardContent>
              {weekItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No assignments, deadlines or events this week.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {weekItems.map((e) => {
                    const obj = objectivesLine(e.course_code);
                    const done = !!e.completed_at;
                    return (
                      <div key={e.id} className="flex items-start justify-between rounded-md border p-2 text-sm">
                        <div className="flex items-start gap-2 min-w-0">
                          <Checkbox
                            className="mt-1"
                            checked={done}
                            onCheckedChange={(v) => toggleDone(e.id, !!v)}
                            aria-label="Mark done"
                          />
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindColor[e.kind] || "bg-secondary"}`}>{e.kind}</span>
                          <div className="min-w-0">
                            <div className={`font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{e.title}</div>
                            <div className={`text-xs text-muted-foreground ${done ? "line-through" : ""}`}>
                              {new Date(e.starts_at).toLocaleString()} · {sourceLabel[e.source] ?? e.source ?? "Manual"}
                            </div>
                            {obj && <div className="text-xs text-muted-foreground mt-0.5">Objectives: {obj}</div>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Weekly schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[60px_repeat(5,minmax(120px,1fr))] gap-px bg-border rounded-lg overflow-hidden text-sm">
                  <div className="bg-card p-2"></div>
                  {DAYS.map((d, i) => {
                    const date = addDays(weekStart, i);
                    const isToday = sameDay(date, today);
                    return (
                      <div key={d} className={`bg-card p-2 font-medium text-center ${isToday ? "text-primary" : ""}`}>
                        {d} {date.getDate()}
                      </div>
                    );
                  })}
                  {HOURS.map((h) => (
                    <React.Fragment key={`row-${h}`}>
                      <div className="bg-card p-2 text-xs text-muted-foreground text-right">{h}:00</div>
                      {DAYS.map((_, di) => {
                        const ev = recurringAt(di + 1, h);
                        const ones = oneoffsAt(di, h);
                        return (
                          <div key={`${h}-${di}`} className="bg-background min-h-[48px] p-1 space-y-1">
                            {ev && (
                              <div className={`rounded-md p-1.5 text-xs leading-tight ${kindColor[ev.kind] || "bg-secondary"}`}>
                                <div className="font-medium truncate">{ev.title}</div>
                                <div className="opacity-80 text-[10px]">{ev.start_time}–{ev.end_time}</div>
                              </div>
                            )}
                            {ones.map((o) => (
                              <div key={o.id} className={`rounded-md p-1.5 text-xs leading-tight ${kindColor[o.kind] || "bg-secondary"} ${o.completed_at ? "opacity-50 line-through" : ""}`}>
                                <div className="font-medium truncate">{o.title}</div>
                                <div className="opacity-80 text-[10px]">{new Date(o.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- MONTH VIEW ---------------- */}
        <TabsContent value="month" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>{fmtMonthYear(monthStart)}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => {
                  const n = new Date(monthStart); n.setMonth(n.getMonth() - 1); setMonthStart(n);
                }}><ChevronLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => {
                  const n = new Date(monthStart); n.setMonth(n.getMonth() + 1); setMonthStart(n);
                }}><ChevronRight className="size-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  const n = new Date(); n.setDate(1); n.setHours(0, 0, 0, 0); setMonthStart(n);
                }}>Today</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden text-sm">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="bg-card p-2 text-xs font-medium text-center text-muted-foreground">{d}</div>
                ))}
                {monthCells.map((date, idx) => {
                  const inMonth = date.getMonth() === monthStart.getMonth();
                  const isToday = sameDay(date, today);
                  const items = itemsForDay(date);
                  const visible = items.slice(0, 3);
                  const overflow = items.length - visible.length;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(date)}
                      className={`bg-background min-h-[96px] p-1.5 text-left space-y-1 hover:bg-secondary/40 transition-colors ${
                        inMonth ? "" : "opacity-40"
                      } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    >
                      <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{date.getDate()}</div>
                      <div className="space-y-0.5">
                        {visible.map((it: any, i) => (
                          <div key={i} className={`rounded px-1 py-0.5 text-[10px] truncate ${kindColor[it.kind] || "bg-secondary"} ${it.completed_at ? "opacity-50 line-through" : ""}`}>
                            {it._isRecurring ? (it.course_code ?? it.title) : it.title}
                          </div>
                        ))}
                        {overflow > 0 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{overflow} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Day detail drawer */}
      <Sheet open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedDay?.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</SheetTitle>
            <SheetDescription>
              {dayDetailItems.length} item{dayDetailItems.length === 1 ? "" : "s"} on this day.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {dayDetailItems.length === 0 && (
              <div className="text-sm text-muted-foreground">Nothing scheduled.</div>
            )}
            {dayDetailItems.map((it: any, i) => {
              const syl = it.course_code ? courseProvider.syllabusFor(it.course_code) : undefined;
              const done = !!it.completed_at;
              return (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {!it._isRecurring && (
                        <Checkbox
                          className="mt-1"
                          checked={done}
                          onCheckedChange={(v) => toggleDone(it.id, !!v)}
                          aria-label="Mark done"
                        />
                      )}
                      <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindColor[it.kind] || "bg-secondary"}`}>{it.kind}</span>
                        {it.source && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{sourceLabel[it.source] ?? it.source}</span>}
                      </div>
                      <div className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{it.title}</div>
                      <div className={`text-xs text-muted-foreground ${done ? "line-through" : ""}`}>
                        {it._isRecurring ? `${it.start_time}–${it.end_time} (weekly)` : new Date(it.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      </div>
                    </div>
                    {!it._isRecurring && (
                      <Button variant="ghost" size="icon" onClick={() => { remove(it.id); setSelectedDay(null); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  {syl?.topics?.length ? (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Course objectives</div>
                      <div className="flex flex-wrap gap-1">
                        {syl.topics.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{t}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Syllabi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Syllabi of elective courses</CardTitle>
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
                    <div className="text-xs text-muted-foreground">{starts.toLocaleDateString()} · {e.location} · {e.kind}</div>
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

      {(() => {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const upcoming = oneoffs.filter((e) => new Date(e.starts_at) >= startOfToday);
        const visible = hideCompleted ? upcoming.filter((e) => !e.completed_at) : upcoming;
        if (upcoming.length === 0) return null;
        return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>All upcoming items ({visible.length})</CardTitle>
            <label className="flex items-center gap-2 text-xs text-muted-foreground font-normal cursor-pointer">
              <Checkbox
                checked={hideCompleted}
                onCheckedChange={(v) => setHideCompleted(!!v)}
                aria-label="Hide completed"
              />
              Hide completed
            </label>
          </CardHeader>
          <CardContent className="space-y-2">
            {visible.map((e) => {
              const done = !!e.completed_at;
              return (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Checkbox
                    checked={done}
                    onCheckedChange={(v) => toggleDone(e.id, !!v)}
                    aria-label="Mark done"
                  />
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindColor[e.kind] || "bg-secondary"}`}>{e.kind}</span>
                  <div className="min-w-0">
                    <div className={`font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{e.title}</div>
                    <div className={`text-xs text-muted-foreground ${done ? "line-through" : ""}`}>
                      {new Date(e.starts_at).toLocaleString()} · {sourceLabel[e.source] ?? e.source ?? "Manual"}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
              </div>
              );
            })}
          </CardContent>
        </Card>
        );
      })()}
    </div>
  );
}
