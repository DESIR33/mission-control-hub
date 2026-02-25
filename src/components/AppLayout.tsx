import { useState } from "react";
import { Outlet, NavLink as RouterNavLink } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

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

function MobileNav({
  onClose,
  unreadCount,
}: {
  onClose: () => void;
  unreadCount: number;
}) {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-xs">D</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-accent-foreground">
            Desmily
          </h1>
          <p className="text-[10px] text-sidebar-foreground">Mission Control</p>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isNotifications = item.to === "/notifications";
          const showBadge = isNotifications && unreadCount > 0;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <div className="relative shrink-0">
                <item.icon className="w-4 h-4" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </RouterNavLink>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-3 px-2 space-y-0.5 border-t border-sidebar-border shrink-0">
        {bottomItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </RouterNavLink>
        ))}

        <button
          onClick={() => {
            signOut();
            onClose();
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden md:block shrink-0">
        <AppSidebar />
      </div>

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top header — only visible on mobile */}
        <header className="flex md:hidden items-center h-14 px-4 border-b border-border bg-sidebar shrink-0 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-[11px]">
                D
              </span>
            </div>
            <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">
              Desmily
            </span>
          </div>

          {unreadCount > 0 && (
            <RouterNavLink
              to="/notifications"
              className="relative p-2 -mr-1 text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors shrink-0"
              aria-label={`${unreadCount} unread notifications`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </RouterNavLink>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile navigation drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 bg-sidebar border-sidebar-border w-72 max-w-[80vw]"
        >
          <MobileNav
            onClose={() => setMobileOpen(false)}
            unreadCount={unreadCount}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
