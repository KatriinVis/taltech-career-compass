import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { courseProvider } from "@/lib/courseProvider";
import { Sparkles, Check } from "lucide-react";
import BottleDiagram from "@/components/app/BottleDiagram";

type Ranked = { id: string; name: string; score: number; reasoning: string; gaps: string[] };

export default function Career() {
  const { user } = useAuth();
  const [cv, setCv] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cvRow, profile, plan] = await Promise.all([
        supabase.from("cv_uploads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("interests").eq("id", user.id).maybeSingle(),
        supabase.from("career_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cvRow.data) {
        setCv(cvRow.data.raw_text ?? "");
        setExtracted(cvRow.data.extracted ?? null);
      }
      setInterests(profile.data?.interests ?? []);
      if (plan.data?.ranked) setRanked(plan.data.ranked as Ranked[]);
      if (plan.data?.selected_path) setSelected(plan.data.selected_path);
    })();
  }, [user]);

  const runAnalysis = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let extr = extracted;
      if (!extr && cv.trim().length > 50) {
        const { data, error } = await supabase.functions.invoke("analyze-cv", { body: { raw_text: cv } });
        if (error) throw error;
        extr = data?.extracted;
        setExtracted(extr);
        await supabase.from("cv_uploads").insert({ user_id: user.id, raw_text: cv, extracted: extr });
      }
      const { data, error } = await supabase.functions.invoke("match-career", {
        body: { extracted: extr ?? {}, interests, paths: courseProvider.paths() },
      });
      if (error) throw error;
      const r: Ranked[] = data?.ranked ?? [];
      setRanked(r);
      await supabase.from("career_plans").insert({
        user_id: user.id, ranked: r, selected_path: r[0]?.name ?? null, reasoning: r[0]?.reasoning ?? null,
      });
      setSelected(r[0]?.name ?? null);
      toast({ title: "Analysis complete", description: "We ranked the best career paths for you." });
    } catch (e: any) {
      const msg = e.message || "Something went wrong";
      if (msg.includes("429")) toast({ title: "Rate limited", description: "Try again in a moment.", variant: "destructive" });
      else if (msg.includes("402")) toast({ title: "AI credits exhausted", description: "Add credits in Settings → Workspace → Usage.", variant: "destructive" });
      else toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const choose = async (r: Ranked) => {
    if (!user) return;
    setSelected(r.name);
    await supabase.from("career_plans").insert({
      user_id: user.id, ranked, selected_path: r.name, reasoning: r.reasoning,
    });
    // auto-generate basic schedule from recommended courses
    const path = courseProvider.paths().find((p) => p.name === r.name);
    if (path) {
      const events = path.recommended_courses
        .map((code) => courseProvider.byCode(code))
        .filter((c) => c && c.day != null)
        .map((c) => ({
          user_id: user.id,
          title: `${c!.code} · ${c!.name}`,
          kind: "class",
          day_of_week: c!.day!,
          start_time: c!.start,
          end_time: c!.end,
          course_code: c!.code,
          source: "generated",
        }));
      if (events.length) {
        await supabase.from("schedule_events").delete().eq("user_id", user.id).eq("source", "generated");
        await supabase.from("schedule_events").insert(events);
      }
    }
    toast({ title: `Selected ${r.name}`, description: "Timetable updated with recommended courses." });
  };

  const skills: string[] = extracted?.skills ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Career alignment</h1>
        <p className="text-muted-foreground">Map your CV and interests to ranked career paths — with explainable reasoning.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your CV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={cv} onChange={(e) => setCv(e.target.value)} rows={6} placeholder="Paste your CV text here…" />
          <Button onClick={runAnalysis} disabled={loading || !cv.trim()}>
            <Sparkles className="size-4" /> {loading ? "Analyzing…" : "Run AI analysis"}
          </Button>
        </CardContent>
      </Card>

      {(skills.length > 0 || ranked.length > 0) && (
        <Card>
          <CardHeader><CardTitle>Bottle Diagram</CardTitle></CardHeader>
          <CardContent>
            <BottleDiagram skills={skills} interests={interests} paths={ranked.map((r) => r.name)} goal={selected} />
          </CardContent>
        </Card>
      )}

      {ranked.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {ranked.map((r) => {
            const path = courseProvider.paths().find((p) => p.name === r.name);
            const isSelected = selected === r.name;
            return (
              <Card key={r.id} className={isSelected ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{r.name}</span>
                    <span className="text-sm font-mono text-primary">{Math.round(r.score)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{r.reasoning}</p>
                  {r.gaps?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Gaps to close</div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.gaps.map((g) => <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{g}</span>)}
                      </div>
                    </div>
                  )}
                  {path && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Recommended courses</div>
                      <div className="flex flex-wrap gap-1.5">
                        {path.recommended_courses.map((code) => (
                          <span key={code} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">{code}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button size="sm" variant={isSelected ? "secondary" : "default"} onClick={() => choose(r)} disabled={isSelected}>
                    {isSelected ? <><Check className="size-4" /> Selected</> : "Choose this path"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}