import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";

export function WorkspaceSwitcher() {
  const { workspaceId, workspaces, switchWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  const active = workspaces.find((w) => w.id === workspaceId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-left">
            <div className="w-6 h-6 rounded-md bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {active?.name?.charAt(0)?.toUpperCase() ?? "W"}
            </div>
            <span className="truncate flex-1 font-medium text-sidebar-accent-foreground">
              {active?.name ?? "Workspace"}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className="flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate flex-1">{ws.name}</span>
              {ws.id === workspaceId && (
                <Check className="w-4 h-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
