import { motion } from "framer-motion";
import { Mail, FileText, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNewsletter } from "@/hooks/use-newsletter";
import { useNavigate } from "react-router-dom";

export function NewsletterWidget() {
  const { stats, drafts, isLoading } = useNewsletter();
  const navigate = useNavigate();

  const latestDraft = drafts.length > 0 ? drafts[0] : null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-40" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Newsletter Health</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 gap-1 text-muted-foreground"
          onClick={() => navigate("/integrations")}
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="rounded-lg bg-muted/50 p-1.5 sm:p-2 text-center">
          <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm sm:text-base font-bold text-foreground">{stats.totalDrafts}</p>
          <p className="text-[10px] text-muted-foreground">Drafts</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-1.5 sm:p-2 text-center">
          <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm sm:text-base font-bold text-foreground">{stats.totalSent}</p>
          <p className="text-[10px] text-muted-foreground">Sent</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-1.5 sm:p-2 text-center">
          <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 mx-auto mb-1" />
          <p className="text-sm sm:text-base font-bold text-foreground">{stats.videosWithoutNewsletter.length}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>

      {latestDraft && (
        <div className="rounded-lg border border-border bg-background p-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-muted-foreground">Latest:</span>
            <Badge
              variant={latestDraft.status === "sent" || latestDraft.status === "active" ? "default" : "outline"}
              className="text-[10px]"
            >
              {latestDraft.status}
            </Badge>
          </div>
          <p className="text-xs text-foreground truncate">{latestDraft.name}</p>
        </div>
      )}
    </motion.div>
  );
}
