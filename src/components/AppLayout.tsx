import { useState } from "react";
import { Outlet, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { navGroups, bottomItems } from "@/config/navigation";

function MobileNav({
  onClose,
  unreadCount,
}: {
  onClose: () => void;
  unreadCount: number;
}) {
  const { signOut } = useAuth();
  const location = useLocation();

  // Determine which groups should be open by default based on current route
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-xs">D</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-accent-foreground">
            Desmily
          </h1>
          <p className="text-xs text-sidebar-foreground">Mission Control</p>
        </div>
      </div>

      {/* Grouped Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
        {navGroups.map((group) => {
          // Single-item groups render directly without collapsible wrapper
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
            <Collapsible
              key={group.label}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
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
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none">
          Skip to content
        </a>
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
                <span className="text-primary-foreground font-bold text-xs">
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
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </RouterNavLink>
            )}
          </header>

          {/* Page content */}
          <main id="main-content" className="flex-1 overflow-y-auto">
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
    </WorkspaceProvider>
  );
}
