import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HistoryEntry {
  content: string;
  confidence: number;
  edited_at: string;
  edited_by: string;
  change_note: string;
}

interface MemoryCardProps {
  id: string;
  content: string;
  confidence: number;
  agentId: string;
  editHistory?: HistoryEntry[];
  tags?: string[];
  createdAt?: string;
  onRestored?: () => void;
  className?: string;
}

function agentColor(agent: string) {
  if (agent?.toLowerCase().includes("claude")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (agent?.toLowerCase().includes("chatgpt")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (agent?.toLowerCase().includes("gemini")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function MemoryCard({
  id,
  content,
  confidence,
  agentId,
  editHistory = [],
  tags = [],
  createdAt,
  onRestored,
  className = "",
}: MemoryCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`group rounded-lg border border-border/50 bg-card p-4 cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm ${className}`}
      onClick={() => navigate(`/memory/${id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-mono text-foreground line-clamp-2 flex-1">{content}</p>
        <div className="flex items-center gap-1 shrink-0">
          {editHistory.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <History className="h-3 w-3" /> {editHistory.length + 1}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(confidence ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{((confidence ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <Badge variant="outline" className={`text-[10px] ${agentColor(agentId)}`}>{agentId}</Badge>
        {tags.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
        ))}
      </div>
    </div>
  );
}
