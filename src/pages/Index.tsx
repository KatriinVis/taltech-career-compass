import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Compass, GraduationCap, ArrowRight } from "lucide-react";

const features = [
  { icon: Compass, title: "Career alignment AI", body: "Upload your CV — get ranked career paths with explainable reasoning." },
  { icon: Calendar, title: "Smart timetable", body: "Auto-generate your week from TalTech + EuroTeQ courses; import Moodle deadlines." },
  { icon: GraduationCap, title: "Adaptive guidance", body: "An agent adjusts your workload and flags retention risk in real time." },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="size-5" />
          </div>
          <span className="font-semibold">Career Driver</span>
        </div>
        <div className="flex gap-2">
          {user ? (
            <Button asChild><Link to="/dashboard">Open app</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
              <Button asChild><Link to="/auth?mode=signup">Get started</Link></Button>
            </>
          )}
        </div>
      </header>

      <section className="px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="size-3" /> AI Mobility Agent for TalTech students
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Align your <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>courses</span> with your future career.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Career Driver fuses your CV, the TalTech and EuroTeQ catalog, and your Moodle deadlines into one adaptive plan — guided by AI.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth?mode=signup">Start free <ArrowRight className="size-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">I already have an account</Link></Button>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="size-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <f.icon className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built for TalTech 2nd-year students · Pilot v1
      </footer>
    </div>
  );
};

export default Index;
