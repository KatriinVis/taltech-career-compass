import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, GraduationCap, Lightbulb, Compass } from "lucide-react";
import MesaLogo from "@/components/MesaLogo";

const features = [
  { icon: GraduationCap, title: "Degree", body: "See your full program at a glance. Track ECTS, required courses, and what's left." },
  { icon: Lightbulb, title: "Skills", body: "Grow beyond the syllabus. MESA.I surfaces seminars, hackathons, and electives that build the skills you need." },
  { icon: Compass, title: "Career", body: "Pick courses that lead somewhere. Upload your CV, set a goal, get a ranked plan." },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <MesaLogo size="md" />
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
          <Sparkles className="size-3" /> AI mobility agent for TalTech & EuroTeQ
        </div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-6">
          From curriculum blindness to a <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>career-driven</span> smart timetable.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          MESA.I connects what you study to what you actually achieve — your courses, deadlines, and career goals in one adaptive plan.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth?mode=signup">Start free <ArrowRight className="size-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">I already have an account</Link></Button>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="size-10 rounded-lg bg-secondary flex items-center justify-center mb-4 ring-1 ring-border">
              <f.icon className="size-5 text-accent" />
            </div>
            <h3 className="font-display text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with TalTech & EuroTeQ students · MESA.I pilot v1
      </footer>
    </div>
  );
};

export default Index;
