import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";

const q = (table: string) => (supabase as any).from(table);

interface IngestionStatus {
  id: string;
  file_name: string;
  status: string;
  total_chunks: number;
  processed_chunks: number;
  memories_created: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function DocumentIngestionStatus() {
  const { workspaceId } = useWorkspace();

  const { data: statuses = [] } = useQuery<IngestionStatus[]>({
    queryKey: ["doc-ingestion-status", workspaceId],
    queryFn: async () => {
      const { data, error } = await q("document_ingestion_status")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    refetchInterval: 5000, // Poll while processing
  });

  if (statuses.length === 0) return null;

  const statusIcons: Record<string, React.ReactNode> = {
    queued: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
    processing: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    completed_with_errors: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    failed: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  };

  const statusColors: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    processing: "bg-blue-500/10 text-blue-700",
    completed: "bg-green-500/10 text-green-700",
    completed_with_errors: "bg-amber-500/10 text-amber-700",
    failed: "bg-red-500/10 text-red-700",
  };

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Ingestion</h4>
      {statuses.map((s) => {
        const progress = s.total_chunks > 0 ? (s.processed_chunks / s.total_chunks) * 100 : 0;
        return (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border">
            {statusIcons[s.status] || <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm truncate">{s.file_name}</span>
                <Badge className={`text-[10px] h-4 ${statusColors[s.status] || ""}`}>
                  {s.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {s.status === "processing" && s.total_chunks > 0 && (
                <Progress value={progress} className="h-1.5 mt-1" />
              )}
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                {s.total_chunks > 0 && <span>{s.processed_chunks}/{s.total_chunks} chunks</span>}
                {s.memories_created > 0 && <span>{s.memories_created} memories</span>}
                <span>{safeFormat(s.created_at, "MMM d HH:mm")}</span>
              </div>
              {s.error_message && (
                <p className="text-[10px] text-destructive mt-0.5 truncate">{s.error_message}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
