import { Fragment, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface NavSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  group: string;
}

interface GroupedNavBarProps {
  sections: NavSection[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function GroupedNavBar({ sections, activeKey, onSelect }: GroupedNavBarProps) {
  const groups = Array.from(new Set(sections.map((s) => s.group)));

  const activeRef = useCallback((el: HTMLButtonElement | null) => {
    if (el) {
      el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, []);

  return (
    <div className="border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 py-2">
          {groups.map((group, i) => {
            const items = sections.filter((s) => s.group === group);
            return (
              <Fragment key={group}>
                {i > 0 && <Separator orientation="vertical" className="h-5 mx-2 shrink-0" />}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-1 shrink-0">
                  {group}
                </span>
                {items.map((section) => (
                  <button
                    key={section.key}
                    ref={section.key === activeKey ? activeRef : undefined}
                    onClick={() => onSelect(section.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0",
                      section.key === activeKey
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
