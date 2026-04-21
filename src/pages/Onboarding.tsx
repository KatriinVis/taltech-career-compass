import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

const INTERESTS = [
  "AI / ML", "Data Science", "Cybersecurity", "Robotics", "Cloud / DevOps",
  "Product", "UX / Design", "Mobile", "Embedded / IoT", "Sustainability",
  "Entrepreneurship", "Research",
];

type Extracted = {
  summary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  interests?: string[];
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("Computer Science");
  const [year, setYear] = useState(2);
  const [interests, setInterests] = useState<string[]>([]);
  const [cv, setCv] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  const toggle = (i: string) =>
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const analyzePreview = async () => {
    if (cv.trim().length < 50) {
      toast({ title: "Add more detail", description: "Paste at least 50 characters of CV text.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", { body: { raw_text: cv } });
      if (error) throw error;
      setExtracted(data?.extracted ?? {});
      setStep(4);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const skipPreview = () => {
    setExtracted(null);
    setStep(4);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        program,
        year,
        interests,
        onboarded: true,
      });
      if (pErr) throw pErr;

      if (cv.trim().length > 50) {
        let ext = extracted;
        if (!ext) {
          const { data, error } = await supabase.functions.invoke("analyze-cv", {
            body: { raw_text: cv },
          });
          if (error) throw error;
          ext = data?.extracted ?? {};
        }
        await supabase.from("cv_uploads").insert({
          user_id: user.id,
          raw_text: cv,
          extracted: ext ?? {},
        });
      }
      toast({ title: "You're all set!", description: "Let's see your dashboard." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Confidence: heuristic based on CV length and field coverage
  const confidence = (() => {
    if (!extracted) return 0;
    const fields = [extracted.summary, extracted.skills?.length, extracted.experience?.length, extracted.education?.length];
    const filled = fields.filter(Boolean).length;
    const lengthScore = Math.min(cv.length / 1200, 1);
    return Math.round(((filled / 4) * 0.7 + lengthScore * 0.3) * 100);
  })();

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="w-full max-w-xl rounded-xl border bg-card p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="size-5" />
          </div>
          <div className="font-semibold">Welcome — let's set you up</div>
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tell us about you</h2>
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mari Tamm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Program</Label>
                <Input value={program} onChange={(e) => setProgram(e.target.value)} />
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" min={1} max={5} value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!fullName}>Continue</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What interests you?</h2>
            <p className="text-sm text-muted-foreground">Pick a few — we'll use these to rank career paths.</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    interests.includes(i) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!interests.length}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Paste your CV (optional)</h2>
            <p className="text-sm text-muted-foreground">Paste plain text from your CV — our AI will extract skills and projects. You can always do this later.</p>
            <Textarea rows={10} value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Education, projects, skills, experience…" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={finish} disabled={saving}>
                {saving ? "Setting up…" : "Finish"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}