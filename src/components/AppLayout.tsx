import { useState } from "react";
import { Outlet, NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Menu, ChevronDown, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { navGroups, bottomItems } from "@/config/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";

function MobileNav({
  onClose,
  unreadCount,
}: {
  onClose: () => void;
  unreadCount: number;
}) {
  const { signOut } = useAuth();
  const location = useLocation();

  const initialOpen = navGroups.reduce<Record<string, boolean>>(
    (acc, group) => {
      const hasActiveRoute = group.items.some((item) =>
        item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
      );
      acc[group.label] = hasActiveRoute;
      return acc;
    },
    {}
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-xs">D</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-accent-foreground">Desmily</h1>
          <p className="text-xs text-sidebar-foreground">Mission Control</p>
        </div>
      </div>

      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
        {navGroups.map((group) => {
          if (group.items.length === 1) {
            const item = group.items[0];
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
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </RouterNavLink>
            );
          }

          const isOpen = openGroups[group.label] ?? false;

          return (
            <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
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
                          "flex items-center gap-3 pl-5 pr-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center px-1">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </RouterNavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

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
          onClick={() => { signOut(); onClose(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function GlobalHeader({
  onMenuClick,
  unreadCount,
}: {
  onMenuClick: () => void;
  unreadCount: number;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="flex items-center h-12 px-4 border-b border-border bg-sidebar shrink-0 gap-3">
      {/* Menu toggle (hamburger) */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
        aria-label="Toggle navigation menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-[10px]">D</span>
        </div>
      </div>

      {/* Search bar */}
      <button
        onClick={() => {/* Could open a command palette in the future */}}
        className="flex items-center gap-2 h-7 px-3 rounded-md bg-sidebar-accent/60 border border-sidebar-border text-sidebar-foreground text-xs hover:bg-sidebar-accent transition-colors ml-1"
      >
        <Search className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">Search</span>
        <kbd className="ml-3 text-[10px] text-muted-foreground/60 border border-sidebar-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

      <div className="flex-1" />

      {/* Notifications */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <button
          onClick={() => setNotifOpen(true)}
          className="relative p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          aria-label={`${unreadCount} unread notifications`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-chart-1 text-foreground text-[9px] font-bold flex items-center justify-center leading-none px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
          <NotificationsPanel />
        </SheetContent>
      </Sheet>

      {/* User avatar */}
      <button
        onClick={() => navigate("/settings")}
        className="w-7 h-7 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors shrink-0"
        aria-label="User settings"
      >
        <span className="text-[10px] font-semibold">{initials}</span>
      </button>
    </header>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { unreadCount } = useNotifications();

  const toggleSidebar = () => {
    // On mobile, open the drawer
    if (window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      setSidebarVisible((v) => !v);
    }
  };

  return (
    <WorkspaceProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none">
          Skip to content
        </a>

        {/* Global top header */}
        <GlobalHeader onMenuClick={toggleSidebar} unreadCount={unreadCount} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop Sidebar */}
          <div
            className={cn(
              "hidden md:block shrink-0 transition-all duration-300 overflow-hidden",
              sidebarVisible ? "w-60" : "w-0"
            )}
          >
            <AppSidebar headerless />
          </div>

          {/* Main content */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <main id="main-content" className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 bg-sidebar border-sidebar-border w-72 max-w-[80vw]">
            <MobileNav onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />
          </SheetContent>
        </Sheet>
      </div>
    </WorkspaceProvider>
  );
}
