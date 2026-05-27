import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, RefreshCw, Trash2 } from "lucide-react";
import { fetchSyncStatus, invalidateCourseCache, type SyncStatus } from "@/lib/courseProvider";

type UC = {
  id: string;
  code: string;
  name: string;
  ects: number | null;
  semester: string | null;
  status: "completed" | "in_progress" | "planned";
  assessment: string | null;
  learning_outcomes: string[] | null;
  topics: string[] | null;
  skills: string[] | null;
  prerequisites: string[] | null;
  kind: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  in_progress: "In progress",
  planned: "Planned",
};

export default function Programme() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<UC[]>([]);
  const [progCode, setProgCode] = useState("");
  const [progName, setProgName] = useState("");
  const [targetEcts, setTargetEcts] = useState(120);
  const [targetGrad, setTargetGrad] = useState("");
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const refreshSync = () => fetchSyncStatus().then(setSync).catch(() => {});
  useEffect(() => { refreshSync(); }, []);

  const runBatch = async (batch: "it" | "eng" | "biz" | "all") => {
    setSyncing(batch);
    try {
      const payload = batch === "all"
        ? { scope: "taltech-msc" }
        : { scope: "taltech-msc", batch };
      const { data, error } = await supabase.functions.invoke("sync-courses", { body: payload });
      if (error) throw error;
      invalidateCourseCache();
      await refreshSync();
      const n = data?.taltech_msc?.totalInserted ?? 0;
      toast({ title: "Sync complete", description: `${n} master's courses added / updated` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const load = async () => {
    if (!user) return;
    const [p, c] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_courses").select("*").eq("user_id", user.id).order("code"),
    ]);
    setProfile(p.data);
    setProgCode((p.data as any)?.programme_code ?? "");
    setProgName((p.data as any)?.programme_name ?? "");
    setTargetEcts((p.data as any)?.target_ects ?? 120);
    setTargetGrad((p.data as any)?.target_graduation ?? "");
    setCourses((c.data as any) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      programme_code: progCode || null,
      programme_name: progName || null,
      target_ects: targetEcts,
      target_graduation: targetGrad || null,
    } as any).eq("id", user.id);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const setStatus = async (id: string, status: UC["status"]) => {
    const { error } = await supabase.from("user_courses").update({ status }).eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_courses").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setCourses((cs) => cs.filter((c) => c.id !== id));
  };

  const addToCalendar = async (c: UC) => {
    if (!user) return;
    if (c.kind === "thesis" && targetGrad) {
      // Generate thesis milestones
      const grad = new Date(targetGrad);
      const milestones = [
        { title: `${c.name}: topic confirmation`, offset: -120 },
        { title: `${c.name}: first draft`, offset: -60 },
        { title: `${c.name}: pre-defense`, offset: -21 },
        { title: `${c.name}: defense`, offset: 0 },
      ];
      const rows = milestones.map((m) => {
        const d = new Date(grad);
        d.setDate(d.getDate() + m.offset);
        return {
          user_id: user.id,
          title: m.title,
          kind: "thesis",
          starts_at: d.toISOString(),
          ends_at: new Date(d.getTime() + 60 * 60 * 1000).toISOString(),
          course_code: c.code,
          source: "programme",
        };
      });
      const { error } = await supabase.from("schedule_events").insert(rows);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Thesis milestones added", description: `${rows.length} entries on your calendar` });
    } else {
      const { error } = await supabase.from("schedule_events").insert({
        user_id: user.id,
        title: `${c.code} ${c.name}`,
        kind: "class",
        course_code: c.code,
        source: "programme",
      });
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Added to calendar" });
    }
  };

  const totals = useMemo(() => {
    const sum = (s: UC["status"]) =>
      courses.filter((c) => c.status === s).reduce((a, c) => a + (Number(c.ects) || 0), 0);
    return {
      completed: sum("completed"),
      in_progress: sum("in_progress"),
      planned: sum("planned"),
    };
  }, [courses]);

  const earned = totals.completed;
  const remaining = Math.max(0, targetEcts - earned);
  const pct = Math.min(100, Math.round((earned / Math.max(1, targetEcts)) * 100));

  const groups: { key: UC["status"]; title: string; tone: string }[] = [
    { key: "completed", title: "Completed", tone: "bg-primary/10 border-primary/30" },
    { key: "in_progress", title: "In progress", tone: "bg-secondary border-border" },
    { key: "planned", title: "Planned", tone: "bg-muted border-border" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl">My programme</h1>
        <p className="text-muted-foreground">Your personal courses uploaded into Career-table.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Programme target</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Programme code</Label><Input value={progCode} onChange={(e) => setProgCode(e.target.value)} placeholder="TATM" /></div>
            <div><Label>Programme name</Label><Input value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="Technology Governance, MA" /></div>
            <div><Label>Target ECTS</Label><Input type="number" value={targetEcts} onChange={(e) => setTargetEcts(Number(e.target.value))} /></div>
            <div><Label>Planned graduation</Label><Input type="date" value={targetGrad ?? ""} onChange={(e) => setTargetGrad(e.target.value)} /></div>
          </div>
          <Button onClick={saveProfile}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-display">{earned} / {targetEcts} ECTS</div>
            <div className="text-sm text-muted-foreground">{remaining} ECTS remaining</div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground pt-1">
            <span><CheckCircle2 className="inline size-3 text-primary" /> Completed {totals.completed} ECTS</span>
            <span><Clock className="inline size-3" /> In progress {totals.in_progress} ECTS</span>
            <span><Circle className="inline size-3" /> Planned {totals.planned} ECTS</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>TalTech master's catalog</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Public ÕIS catalog (<span className="font-medium text-foreground">ois2.taltech.ee</span>) — master's-level courses only (codes 8xxx/9xxx).
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-2xl font-display">{sync?.totalCourses ?? "—"}</div><div className="text-muted-foreground">total</div></div>
            <div><div className="text-2xl font-display">{sync?.taltechCount ?? "—"}</div><div className="text-muted-foreground">TalTech</div></div>
            <div><div className="text-2xl font-display">{sync?.euroteqCount ?? "—"}</div><div className="text-muted-foreground">EuroTeQ</div></div>
          </div>
          <div className="text-xs text-muted-foreground">
            {sync?.lastSyncAt ? `Last sync: ${new Date(sync.lastSyncAt).toLocaleString()} (${sync.lastSource})` : "Not synced yet."}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!!syncing} onClick={() => runBatch("it")}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing === "it" ? "animate-spin" : ""}`} />
              IT (ITI/ITA/ITC/ITV/ITP)
            </Button>
            <Button size="sm" variant="secondary" disabled={!!syncing} onClick={() => runBatch("eng")}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing === "eng" ? "animate-spin" : ""}`} />
              Engineering (MAT/MEC/EER/EMR/EAA)
            </Button>
            <Button size="sm" variant="secondary" disabled={!!syncing} onClick={() => runBatch("biz")}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing === "biz" ? "animate-spin" : ""}`} />
              Business (TMJ/YFR/EJR)
            </Button>
            <Button size="sm" disabled={!!syncing} onClick={() => runBatch("all")}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing === "all" ? "animate-spin" : ""}`} />
              Sync all MSc
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A full sync takes ~10–15 min and ~500–800 Firecrawl credits. Syncing one batch at a time is recommended.
          </p>
        </CardContent>
      </Card>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No courses uploaded yet. Go to <a className="text-primary underline" href="/settings">Settings</a> and upload your syllabi (RTF/PDF/DOCX).
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => {
          const list = courses.filter((c) => c.status === g.key);
          if (list.length === 0) return null;
          return (
            <div key={g.key} className="space-y-2">
              <h2 className="font-display text-xl">{g.title} <span className="text-sm text-muted-foreground font-sans">· {list.length} courses</span></h2>
              <div className="grid gap-2">
                {list.map((c) => (
                  <Card key={c.id} className={g.tone}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.code} · {c.name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                          {c.ects != null && <span>{c.ects} ECTS</span>}
                          {c.semester && <span>{c.semester}</span>}
                          {c.assessment && <span>{c.assessment}</span>}
                          {(c.skills ?? []).slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as UC["status"])}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => addToCalendar(c)} title="Add to calendar">
                        <CalendarIcon className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)} title="Delete">
                        <Trash2 className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}