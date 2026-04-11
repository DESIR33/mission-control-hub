import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Search, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (companyId: string) => void;
  linkedCompanyIds: string[];
}

export function LinkCompanyDialog({ open, onOpenChange, onLink, linkedCompanyIds }: Props) {
  const { workspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["all-companies", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, logo_url, industry")
        .eq("workspace_id", workspaceId!)
        .is("deleted_at", null)
        .order("name")
        .limit(500);
      return data ?? [];
    },
    enabled: !!workspaceId && open,
  });

  const filtered = companies.filter((c: any) => {
    if (linkedCompanyIds.includes(c.id)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return `${c.name} ${c.industry}`.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Company to Project</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No companies found</p>
          )}
          {filtered.map((c: any) => (
            <button
              key={c.id}
              onClick={() => { onLink(c.id); onOpenChange(false); setSearch(""); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left transition-colors"
            >
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-8 h-8 rounded object-contain shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {(c.name?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.industry || ""}</p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
