import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Calendar, Compass, GraduationCap, Sparkles } from "lucide-react";
import { courseProvider } from "@/lib/courseProvider";

const ECTS_TARGET = 180;

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [career, setCareer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [coach, setCoach] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [loadingCoach, setLoadingCoach] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c, e] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("career_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("schedule_events").select("*").eq("user_id", user.id),
      ]);
      setProfile(p.data);
      setCareer(c.data);
      setEvents(e.data ?? []);
    })();
  }, [user]);

  const submitCheckIn = async () => {
    if (!user || !checkIn.trim()) return;
    setLoadingCoach(true);
    try {
      await supabase.from("check_ins").insert({ user_id: user.id, notes: checkIn, completed_blocks: 0, difficulty: 3 });
      const { data, error } = await supabase.functions.invoke("coach", {
        body: { notes: checkIn, career: career?.selected_path ?? null },
      });
      if (error) throw error;
      setCoach(data?.message ?? "");
      setCheckIn("");
      toast({ title: "Logged your check-in" });
    } catch (e: any) {
      toast({ title: "Could not get coaching", description: e.message, variant: "destructive" });
    } finally {
      setLoadingCoach(false);
    }
  };

  // Program progress: ECTS of unique scheduled TalTech courses
  const taltechCourses = courseProvider.taltech();
  const requiredCourses = taltechCourses.filter((c) => c.required);
  const scheduledCodes = new Set(
    events.filter((e) => e.kind === "class" && e.course_code).map((e) => e.course_code as string),
  );
  const earnedEcts = taltechCourses
    .filter((c) => scheduledCodes.has(c.code))
    .reduce((sum, c) => sum + (c.ects ?? 0), 0);
  const requiredDone = requiredCourses.filter((c) => scheduledCodes.has(c.code)).length;
  const progressPct = Math.min(100, Math.round((earnedEcts / ECTS_TARGET) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Your week, your way</h1>
        <p className="text-muted-foreground">Hi {profile?.full_name?.split(" ")[0] || "there"} — everything MESA.I is tracking for you right now.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><GraduationCap className="size-4" /> Program progress</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{earnedEcts} / {ECTS_TARGET} ECTS</div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Required courses completed: {requiredDone}/{requiredCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Compass className="size-4" /> Career path</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{career?.selected_path ?? "Not set"}</div>
            <Button asChild variant="link" className="px-0"><Link to="/career">Explore <ArrowRight className="size-4" /></Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="size-4" /> Schedule items</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{events.length}</div>
            <Button asChild variant="link" className="px-0"><Link to="/timetable">Open timetable <ArrowRight className="size-4" /></Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Daily check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="How did this week go? Anything tough?"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            rows={3}
          />
          <Button onClick={submitCheckIn} disabled={loadingCoach || !checkIn.trim()}>
            {loadingCoach ? "Thinking…" : "Get AI coaching"}
          </Button>
          {coach && (
            <div className="rounded-lg border bg-secondary/40 p-4 text-sm whitespace-pre-wrap">{coach}</div>
          )}
        </CardContent>
      </Card>

      {!career && (
        <Card>
          <CardHeader><CardTitle>Next: pick a career path</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">We'll rank options based on your CV and interests, then auto-build a timetable.</p>
            <Button asChild><Link to="/career">Run career analysis <ArrowRight className="size-4" /></Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}