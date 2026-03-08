import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { navGroups, bottomItems } from "@/config/navigation";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface AppSidebarProps {
  headerless?: boolean;
}

export function AppSidebar({ headerless }: AppSidebarProps) {
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();
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
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-60 shrink-0">
      {/* Optional logo header — hidden when headerless (global header takes over) */}
      {!headerless && (
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs">D</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground truncate">Desmily</h1>
            <p className="text-xs text-sidebar-foreground truncate">Mission Control</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
        {navGroups.map((group) => {
          // Single-item groups render directly
          if (group.items.length === 1) {
            const item = group.items[0];
            return (
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
                <span className="truncate flex-1">{item.label}</span>
              </RouterNavLink>
            );
          }

          const isOpen = openGroups[group.label] ?? false;

          return (
            <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
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
                      <span className="truncate flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center px-1">
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
            <span className="truncate">{item.label}</span>
          </RouterNavLink>
        ))}

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
