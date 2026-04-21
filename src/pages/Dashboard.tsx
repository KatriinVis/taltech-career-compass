import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Activity, ArrowRight, Calendar, Compass, Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [career, setCareer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [risk, setRisk] = useState(0);
  const [coach, setCoach] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [loadingCoach, setLoadingCoach] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c, e, ci] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("career_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("schedule_events").select("*").eq("user_id", user.id),
        supabase.from("check_ins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setProfile(p.data);
      setCareer(c.data);
      setEvents(e.data ?? []);
      // Simple retention risk: many upcoming deadlines + few recent check-ins
      const upcoming = (e.data ?? []).filter((x) => x.starts_at && new Date(x.starts_at) > new Date()).length;
      const recent = ci.data?.length ?? 0;
      const r = Math.min(100, Math.max(0, upcoming * 8 + (5 - recent) * 10));
      setRisk(r);
    })();
  }, [user]);

  const submitCheckIn = async () => {
    if (!user || !checkIn.trim()) return;
    setLoadingCoach(true);
    try {
      await supabase.from("check_ins").insert({ user_id: user.id, notes: checkIn, completed_blocks: 0, difficulty: 3 });
      const { data, error } = await supabase.functions.invoke("coach", {
        body: { notes: checkIn, risk, career: career?.selected_path ?? null },
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

  const riskLabel = risk < 30 ? "Low" : risk < 60 ? "Moderate" : "High";
  const riskColor = risk < 30 ? "bg-success" : risk < 60 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hi {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
        <p className="text-muted-foreground">Here's your week, your risk signals, and your next moves.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="size-4" /> Retention risk</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{riskLabel}</div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${riskColor} transition-all`} style={{ width: `${risk}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Based on deadlines clustering + recent activity.</p>
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