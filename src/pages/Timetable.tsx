import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { parseICS } from "@/lib/ical";
import { Trash2, Upload } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8..18

const kindColor: Record<string, string> = {
  class: "bg-primary text-primary-foreground",
  assignment: "bg-warning text-foreground",
  study: "bg-accent text-accent-foreground",
  event: "bg-success text-primary-foreground",
};

export default function Timetable() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [icsUrl, setIcsUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("schedule_events").select("*").eq("user_id", user.id);
    setEvents(data ?? []);
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

  const recurring = events.filter((e) => e.day_of_week != null);
  const oneoffs = events.filter((e) => e.starts_at).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  const eventAt = (day: number, hour: number) =>
    recurring.find((e) => e.day_of_week === day && e.start_time && parseInt(e.start_time) === hour);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">Auto-generated from your selected career path. Add Moodle deadlines below.</p>
      </div>

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
          <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {oneoffs.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()}</div>
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