import { useMemo, useState } from "react";
import { courseProvider } from "@/lib/courseProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Courses() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "taltech" | "euroteq">("all");

  const courses = useMemo(() => {
    const base = tab === "taltech" ? courseProvider.taltech() : tab === "euroteq" ? courseProvider.euroteq() : courseProvider.all();
    if (!q.trim()) return base;
    const s = q.toLowerCase();
    return base.filter((c) => c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.skills.some((k) => k.includes(s)));
  }, [q, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="text-muted-foreground">Browse the TalTech and EuroTeQ catalog.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-secondary rounded-md p-1">
          {(["all", "taltech", "euroteq"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {t === "all" ? "All" : t === "taltech" ? "TalTech" : "EuroTeQ"}
            </button>
          ))}
        </div>
        <Input placeholder="Search by code, name, or skill…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {courses.map((c) => (
          <Card key={c.code}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{c.name}</span>
                <span className="text-xs font-mono text-muted-foreground">{c.code}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {c.source === "taltech" ? `TalTech · ${c.required ? "Required" : "Elective"}` : `EuroTeQ · ${c.university}`} · {c.ects} ECTS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.slice(0, 6).map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary">{s}</span>)}
              </div>
            </CardContent>
          </Card>
        ))}
        {!courses.length && <div className="text-sm text-muted-foreground">No matches.</div>}
      </div>
    </div>
  );
}