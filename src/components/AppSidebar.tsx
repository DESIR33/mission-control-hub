import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Film,
  DollarSign,
  CheckSquare,
  Brain,
  Bell,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Mission Control" },
  { to: "/relationships", icon: Users, label: "Relationships" },
  { to: "/content", icon: Film, label: "Content Pipeline" },
  { to: "/monetization", icon: DollarSign, label: "Monetization" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/ai-bridge", icon: Brain, label: "AI Bridge" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

const bottomItems = [
  { to: "/integrations", icon: Zap, label: "Integrations" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">D</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground truncate">
              Desmily
            </h1>
            <p className="text-[10px] text-sidebar-foreground truncate">
              Mission Control
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </RouterNavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-2 space-y-0.5 border-t border-sidebar-border">
        {bottomItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </RouterNavLink>
        ))}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
