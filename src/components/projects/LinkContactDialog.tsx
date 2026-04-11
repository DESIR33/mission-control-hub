import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Search, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (contactId: string) => void;
  linkedContactIds: string[];
}

export function LinkContactDialog({ open, onOpenChange, onLink, linkedContactIds }: Props) {
  const { workspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["all-contacts", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, company")
        .eq("workspace_id", workspaceId!)
        .is("deleted_at", null)
        .order("first_name")
        .limit(500);
      return data ?? [];
    },
    enabled: !!workspaceId && open,
  });

  const filtered = contacts.filter((c: any) => {
    if (linkedContactIds.includes(c.id)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Contact to Project</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No contacts found</p>
          )}
          {filtered.map((c: any) => (
            <button
              key={c.id}
              onClick={() => { onLink(c.id); onOpenChange(false); setSearch(""); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {(c.first_name?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.email || c.company || ""}</p>
              </div>
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
