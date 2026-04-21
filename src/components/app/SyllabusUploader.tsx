import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/cvExtract";
import { Loader2, Upload, X, Check } from "lucide-react";

type Parsed = {
  filename: string;
  status: "completed" | "in_progress" | "planned";
  data: {
    code: string;
    name_et?: string;
    name_en?: string;
    ects?: number;
    semester?: string;
    assessment?: string;
    prerequisites?: string[];
    learning_outcomes?: string[];
    topics?: string[];
    workload?: any;
    skills?: string[];
  };
  raw_text: string;
};

export default function SyllabusUploader({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<Parsed[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setParsing(true);
    const next: Parsed[] = [];
    for (const f of list) {
      try {
        const raw = await extractTextFromFile(f);
        const { data, error } = await supabase.functions.invoke("parse-syllabus", { body: { raw_text: raw } });
        if (error) throw error;
        const ext = data?.extracted ?? {};
        if (!ext.code) {
          toast({ title: `${f.name}: could not detect course code`, variant: "destructive" });
          continue;
        }
        next.push({ filename: f.name, status: "planned", data: ext, raw_text: raw });
      } catch (e: any) {
        toast({ title: `${f.name}: parsing failed`, description: e.message ?? String(e), variant: "destructive" });
      }
    }
    setItems((prev) => [...prev, ...next]);
    setParsing(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const saveAll = async () => {
    if (!user || items.length === 0) return;
    const rows = items.map((it) => ({
      user_id: user.id,
      code: it.data.code,
      name: it.data.name_et || it.data.name_en || it.data.code,
      ects: it.data.ects ?? null,
      semester: it.data.semester ?? null,
      status: it.status,
      assessment: it.data.assessment ?? null,
      learning_outcomes: it.data.learning_outcomes ?? [],
      topics: it.data.topics ?? [],
      skills: it.data.skills ?? [],
      prerequisites: it.data.prerequisites ?? [],
      workload: it.data.workload ?? null,
      raw_text: it.raw_text.slice(0, 20000),
      source_filename: it.filename,
    }));
    const { error } = await supabase.from("user_courses").upsert(rows, { onConflict: "user_id,code" });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `Saved ${rows.length} courses` });
    setItems([]);
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My programme — upload syllabi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <div className="text-sm font-medium">Drop syllabi here or click to choose</div>
          <div className="text-xs text-muted-foreground mt-1">RTF, PDF, DOCX, TXT — multiple files at once</div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".rtf,.pdf,.docx,.txt,.md,application/rtf,text/rtf,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Parsing syllabi…
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Preview ({items.length})</div>
            {items.map((it, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {it.data.code} · {it.data.name_et || it.data.name_en}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                      {it.data.ects != null && <span>{it.data.ects} ECTS</span>}
                      {it.data.semester && <span>· {it.data.semester}</span>}
                      {it.data.assessment && <span>· {it.data.assessment}</span>}
                      <span className="opacity-60">· {it.filename}</span>
                    </div>
                    {(it.data.learning_outcomes ?? []).slice(0, 2).map((o, j) => (
                      <div key={j} className="text-xs text-muted-foreground mt-1 line-clamp-1">• {o}</div>
                    ))}
                  </div>
                  <Select
                    value={it.status}
                    onValueChange={(v) =>
                      setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: v as any } : p)))
                    }
                  >
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={saveAll}><Check className="size-4 mr-1" /> Save all ({items.length})</Button>
              <Button variant="ghost" onClick={() => setItems([])}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}