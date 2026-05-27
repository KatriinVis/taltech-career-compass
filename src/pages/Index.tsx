import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, GraduationCap, Lightbulb, Compass } from "lucide-react";
import CareerTableLogo from "@/components/CareerTableLogo";

const features = [
  { icon: GraduationCap, title: "Degree", body: "See your full program at a glance. Track ECTS, required courses, and what's left." },
  { icon: Lightbulb, title: "Skills", body: "Grow beyond the syllabus. Career-table surfaces seminars, hackathons, and electives that build the skills you need." },
  { icon: Compass, title: "Career", body: "Pick courses that lead somewhere. Upload your CV, set a goal, get a ranked plan." },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-primary-glow/40 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-primary/30 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

      <header className="relative px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <CareerTableLogo size="md" />
        <div className="flex gap-2">
          {user ? (
            <Button asChild className="bg-vapor text-primary-foreground hover:opacity-90 hover-glow"><Link to="/dashboard">Open app</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
              <Button asChild className="bg-vapor text-primary-foreground hover:opacity-90 hover-glow"><Link to="/auth?mode=signup">Get started</Link></Button>
            </>
          )}
        </div>
      </header>

      <section className="relative px-6 pt-16 pb-24 max-w-4xl mx-auto text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-4 py-1.5 text-xs text-muted-foreground mb-6 shadow-sm">
          <Sparkles className="size-3 text-primary animate-pop" /> AI mobility agent for TalTech & EuroTeQ
        </div>
        <h1 className="font-display text-5xl md:text-7xl tracking-wide mb-6 leading-[1.05]">
          From curriculum blindness to a <span className="chrome-text">career-driven</span> smart timetable.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Career-table connects what you study to what you actually achieve — your courses, deadlines, and career goals in one adaptive plan.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg" className="bg-vapor text-primary-foreground hover:opacity-90 hover-glow group">
            <Link to="/auth?mode=signup">Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="hover-tilt"><Link to="/auth">I already have an account</Link></Button>
        </div>
      </section>

      <section className="relative px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group rounded-2xl border bg-card/80 backdrop-blur p-6 hover-tilt"
            style={{ boxShadow: "var(--shadow-card)", animationDelay: `${i * 0.1}s` }}
          >
            <div className="size-12 rounded-2xl bg-vapor flex items-center justify-center mb-4 shadow-lg group-hover:animate-wiggle">
              <f.icon className="size-6 text-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl mb-2 tracking-wide">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="relative border-t py-8 text-center text-sm text-muted-foreground">
        Built with TalTech & EuroTeQ students · Career-table pilot v1
      </footer>
    </div>
  );
};

export default Index;
