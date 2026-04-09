import { useTaskDomain } from "@/hooks/use-task-domain";
import { cn } from "@/lib/utils";
import { Shield, Briefcase } from "lucide-react";

const icons: Record<string, any> = { Shield, Briefcase };

export function DomainSwitcher() {
  const { domains, activeDomainId, setActiveDomainId } = useTaskDomain();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => setActiveDomainId(null)}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          !activeDomainId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        All
      </button>
      {domains.map((domain) => {
        const Icon = icons[domain.icon || ""] || Shield;
        const isActive = activeDomainId === domain.id;
        return (
          <button
            key={domain.id}
            onClick={() => setActiveDomainId(domain.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            style={isActive ? { color: domain.color || undefined } : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            {domain.name}
          </button>
        );
      })}
    </div>
  );
}
