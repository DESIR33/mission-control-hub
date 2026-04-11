import { useState } from "react";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { useWebhookCacheInvalidation } from "@/hooks/use-webhook-cache-invalidation";
import { Outlet, NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Menu, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { mainNavItems, bottomItems } from "@/config/navigation";
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

  const initialOpen = mainNavItems.reduce<Record<string, boolean>>(
    (acc, item) => {
      if (item.children) {
        const hasActive = item.children.some((c) => location.pathname.startsWith(c.to));
        acc[item.label] = hasActive;
      }
      return acc;
    },
    {}
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const handleGroupOpenChange = (label: string, nextOpen: boolean) => {
    setOpenGroups((prev) => {
      if (!!prev[label] === nextOpen) return prev;
      return { ...prev, [label]: nextOpen };
    });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-4 h-14">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-lg object-contain shrink-0" />
          <div>
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground">Desmily</h1>
            <p className="text-xs text-sidebar-foreground">Mission Control</p>
          </div>
        </div>
        <div className="px-2 pb-2">
          <WorkspaceSwitcher />
        </div>
      </div>
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
        {mainNavItems.map((item) => {
          if (!item.children) {
            const isInbox = item.to === "/inbox";
            const showBadge = isInbox && unreadCount > 0;
            return (
              <RouterNavLink
                key={item.to + item.label}
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
                {showBadge && (
                  <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </RouterNavLink>
            );
          }

          const isOpen = openGroups[item.label] ?? false;

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => handleGroupOpenChange(item.label, !isOpen)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
              </button>
              {isOpen && (<div className="space-y-0.5 mt-0.5">
                {item.children.map((child) => {
                  const active = location.pathname === child.to;
                  return (
                    <RouterNavLink
                      key={child.to}
                      to={child.to}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 pl-7 pr-3 py-2 rounded-md text-sm transition-colors w-full",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <child.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">{child.label}</span>
                    </RouterNavLink>
                  );
                })}
              </div>)}
            </div>
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
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
        aria-label="Toggle navigation menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-md object-contain" />
      </div>

      <button
        onClick={() => {}}
        className="hidden sm:flex items-center gap-2 h-7 px-3 rounded-md bg-sidebar-accent/60 border border-sidebar-border text-sidebar-foreground text-xs hover:bg-sidebar-accent transition-colors ml-1"
      >
        <Search className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">Search</span>
        <kbd className="ml-3 text-[10px] text-muted-foreground/60 border border-sidebar-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

      <div className="flex-1" />

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
  useWebhookCacheInvalidation();

  const toggleSidebar = () => {
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

        <GlobalHeader onMenuClick={toggleSidebar} unreadCount={unreadCount} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div
            className={cn(
              "hidden md:block shrink-0 transition-all duration-300 overflow-hidden",
              sidebarVisible ? "w-60" : "w-0"
            )}
          >
            <AppSidebar headerless />
          </div>

          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <main id="main-content" className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 bg-sidebar border-sidebar-border w-72 max-w-[80vw]">
            <MobileNav onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />
          </SheetContent>
        </Sheet>
      </div>
    </WorkspaceProvider>
  );
}
