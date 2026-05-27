import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import CareerTableLogo from "@/components/CareerTableLogo";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast({ title: "Welcome!", description: "Account created. Let's set up your profile." });
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Authentication failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-accent/40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-primary-glow/40 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card/90 backdrop-blur p-8 animate-fade-in" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <Link to="/" className="inline-flex mb-6">
          <CareerTableLogo size="md" />
        </Link>
        <h1 className="font-display text-3xl mb-1 tracking-wide">{mode === "signup" ? "Join Career-table" : "Welcome back"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signup" ? "Let's connect your studies to your career." : "Pick up where you left off."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <div className="text-sm text-center mt-6 text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button className="text-primary font-medium" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}