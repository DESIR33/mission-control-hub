import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { mainNavItems, bottomItems } from "@/config/navigation";
import { ShimmerButton } from "@/components/ui/shimmer-button";
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
  const navigate = useNavigate();

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

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = prev[label];
      // Close all groups, then toggle the clicked one
      const allClosed = Object.keys(prev).reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      return { ...allClosed, [label]: !isCurrentlyOpen };
    });
  };

  return (
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-60 shrink-0">
      {!headerless && (
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-lg object-contain shrink-0" />
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground truncate">Desmily</h1>
            <p className="text-xs text-sidebar-foreground truncate">Mission Control</p>
          </div>
        </div>
      )}

      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {mainNavItems.map((item) => {
          if (!item.children) {
            const isInbox = item.to === "/inbox";
            const showBadge = isInbox && unreadCount > 0;
            return (
              <RouterNavLink
                key={item.to + item.label}
                to={item.to}
                end={item.to === "/"}
                className="block"
              >
                {({ isActive }) => {
                  const inner = (
                    <>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center px-1">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </>
                  );

                  if (isActive) {
                    return (
                      <ShimmerButton
                        shimmerColor="hsl(43, 80%, 50%)"
                        shimmerSize="0.05em"
                        shimmerDuration="3s"
                        borderRadius="6px"
                        background="hsl(43, 30%, 12%)"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-primary border-none shadow-none"
                      >
                        {inner}
                      </ShimmerButton>
                    );
                  }

                  return (
                    <span className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                      {inner}
                    </span>
                  );
                }}
              </RouterNavLink>
            );
          }

          const isOpen = openGroups[item.label] ?? false;

          const hasActiveChild = item.children.some((c) => location.pathname.startsWith(c.to));

          return (
            <Collapsible key={item.label} open={isOpen} onOpenChange={() => toggleGroup(item.label)}>
              <CollapsibleTrigger
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
                  hasActiveChild
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
                    isOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {item.children.map((child) => {
                  const active = location.pathname.startsWith(child.to);
                  return (
                    <RouterNavLink
                      key={child.to}
                      to={child.to}
                      className={cn(
                        "flex items-center gap-3 pl-7 pr-3 py-1.5 rounded-md text-sm transition-colors w-full",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <child.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </RouterNavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

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
