import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { parseICS } from "@/lib/ical";

export default function MoodleImport() {
  const { user } = useAuth();
  const [icsUrl, setIcsUrl] = useState("");
  const [importing, setImporting] = useState(false);

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
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Imported ${rows.length} Moodle deadline${rows.length === 1 ? "" : "s"}` });
  };

  const importFromUrl = async () => {
    if (!icsUrl.trim()) return;
    setImporting(true);
    try {
      const r = await fetch(icsUrl);
      await importIcs(await r.text());
    } catch (e: any) {
      toast({ title: "Could not fetch URL", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const importFromFile = async (f: File) => {
    await importIcs(await f.text());
  };

  return (
    <Card>
      <CardHeader><CardTitle>Moodle iCal import</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <div>
            <Label>Paste .ics URL</Label>
            <Input
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              placeholder="https://moodle.taltech.ee/calendar/export…"
            />
          </div>
          <Button onClick={importFromUrl} disabled={importing} className="self-end">
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">or upload a file:</div>
        <Input
          type="file"
          accept=".ics,text/calendar"
          onChange={(e) => e.target.files?.[0] && importFromFile(e.target.files[0])}
        />
      </CardContent>
    </Card>
  );
}