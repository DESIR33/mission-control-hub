import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";

const q = (table: string) => (supabase as any).from(table);

interface AuditEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  actor_type: string;
  actor_id: string | null;
  request_duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_TYPES = [
  "all", "memory.ingest", "memory.context_route", "memory.created", "memory.updated",
  "memory.deleted", "document.ingest", "template.export", "template.import",
];

export function AuditLogTab() {
  const { workspaceId } = useWorkspace();
  const [actionFilter, setActionFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit-log", workspaceId, actionFilter],
    queryFn: async () => {
      let query = q("memory_audit_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const filtered = searchText.trim()
    ? entries.filter((e) =>
        e.action.includes(searchText) ||
        e.target_type.includes(searchText) ||
        (e.actor_id || "").includes(searchText)
      )
    : entries;

  const actionColors: Record<string, string> = {
    "memory.ingest": "bg-blue-500/10 text-blue-700",
    "memory.context_route": "bg-purple-500/10 text-purple-700",
    "document.ingest": "bg-green-500/10 text-green-700",
    "template.export": "bg-amber-500/10 text-amber-700",
    "template.import": "bg-amber-500/10 text-amber-700",
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter entries..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a} value={a}>{a === "all" ? "All Actions" : a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No audit entries found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_80px_80px_100px] gap-2 px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Action</span>
            <span>Target</span>
            <span>Actor</span>
            <span>Duration</span>
            <span>Time</span>
          </div>
          {filtered.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[1fr_100px_80px_80px_100px] gap-2 px-3 py-2 border-t border-border text-sm items-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge className={`text-[10px] h-4 shrink-0 ${actionColors[entry.action] || "bg-muted text-muted-foreground"}`}>
                  {entry.action}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground truncate">{entry.target_type}</span>
              <span className="text-xs text-muted-foreground truncate">{entry.actor_type}</span>
              <span className="text-xs text-muted-foreground">
                {entry.request_duration_ms ? `${entry.request_duration_ms}ms` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {safeFormat(entry.created_at, "MMM d HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
