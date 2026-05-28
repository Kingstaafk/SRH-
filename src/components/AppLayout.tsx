import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, MonitorPlay, Camera } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Traffic Map", icon: Map },
  { to: "/simulation", label: "Simulation", icon: MonitorPlay },
  { to: "/camera-training", label: "Camera Training", icon: Camera },

];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MonitorPlay className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">SmartTraffic AI</h1>
              <p className="text-[11px] text-muted-foreground leading-none">Intelligent Signal Control</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container py-6 pb-24 sm:pb-6">{children}</main>

      {/* Bottom Mobile Navigation */}
      <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/90 backdrop-blur-md justify-around items-center h-16 px-2 shadow-lg border-border">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all ${
                active
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110 text-primary" : ""}`} />
              <span className="text-[10px] tracking-tight">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
