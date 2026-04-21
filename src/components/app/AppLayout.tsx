import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Compass, GraduationCap, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MesaLogo from "@/components/MesaLogo";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/career", label: "Career", icon: Compass },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/programme", label: "Õppekava", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <div className="p-6">
          <MesaLogo size="md" />
          <div className="text-xs text-muted-foreground mt-2">Career-driven smart timetable</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border-l-2",
                  isActive
                    ? "bg-secondary text-primary font-medium border-primary"
                    : "text-foreground/70 border-transparent hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground px-2 mb-2 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <MesaLogo size="sm" />
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="size-4" />
          </Button>
        </div>
        <div className="md:hidden flex overflow-x-auto gap-1 p-2 border-b bg-card">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                )
              }
            >
              <n.icon className="size-3.5" />
              {n.label}
            </NavLink>
          ))}
        </div>
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}