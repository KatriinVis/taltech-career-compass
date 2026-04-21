import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute({ requireOnboarded = true }: { requireOnboarded?: boolean }) {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!user) { setOnboarded(null); return; }
    supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
      setOnboarded(!!data?.onboarded);
    });
  }, [user]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireOnboarded && onboarded === false) return <Navigate to="/onboarding" replace />;
  if (requireOnboarded && onboarded === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  return <Outlet />;
}