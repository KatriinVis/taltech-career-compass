import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import SyllabusUploader from "@/components/app/SyllabusUploader";

export default function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState(2);
  const [interests, setInterests] = useState("");

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
      <SyllabusUploader />
    </div>
  );
}