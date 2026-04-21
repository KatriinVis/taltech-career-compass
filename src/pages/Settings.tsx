import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { fetchSyncStatus, invalidateCourseCache, type SyncStatus } from "@/lib/courseProvider";
import { RefreshCw } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState(2);
  const [interests, setInterests] = useState("");
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshStatus = () => fetchSyncStatus().then(setSync).catch(() => {});
  useEffect(() => { refreshStatus(); }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-courses");
      if (error) throw error;
      invalidateCourseCache();
      await refreshStatus();
      toast({ title: "Catalog synced", description: `TalTech: ${data?.taltech?.inserted ?? 0} · EuroTeQ: ${data?.euroteq?.inserted ?? 0}` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setFullName(data.full_name ?? "");
      setProgram(data.program ?? "");
      setYear(data.year ?? 2);
      setInterests((data.interests ?? []).join(", "));
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, program, year,
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", user.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-3xl">Your profile</h1>
        <p className="text-muted-foreground">MESA.I uses this to tune your plan.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Program</Label><Input value={program} onChange={(e) => setProgram(e.target.value)} /></div>
          <div><Label>Year</Label><Input type="number" min={1} max={5} value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
          <div><Label>Interests (comma-separated)</Label><Input value={interests} onChange={(e) => setInterests(e.target.value)} /></div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Course catalog</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Live data from <span className="font-medium text-foreground">tunniplaan.taltech.ee</span> and{" "}
            <span className="font-medium text-foreground">eduxchange.eu/euroteq</span>.
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-2xl font-display">{sync?.totalCourses ?? "—"}</div><div className="text-muted-foreground">total</div></div>
            <div><div className="text-2xl font-display">{sync?.taltechCount ?? "—"}</div><div className="text-muted-foreground">TalTech</div></div>
            <div><div className="text-2xl font-display">{sync?.euroteqCount ?? "—"}</div><div className="text-muted-foreground">EuroTeQ</div></div>
          </div>
          <div className="text-xs text-muted-foreground">
            {sync?.lastSyncAt ? `Last sync: ${new Date(sync.lastSyncAt).toLocaleString()} (${sync.lastSource})` : "No sync yet — using seed data."}
          </div>
          <Button onClick={runSync} disabled={syncing} variant="secondary">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Re-sync now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}