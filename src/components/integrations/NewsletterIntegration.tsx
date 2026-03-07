import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Mail, FileText, Send, CheckCircle, AlertCircle, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNewsletter, type PublishedVideo } from "@/hooks/use-newsletter";
import { fmtCount } from "@/lib/chart-theme";

function VideoNewsletterCard({
  video,
  hasNewsletter,
  onGenerate,
  isGenerating,
}: {
  video: PublishedVideo;
  hasNewsletter: boolean;
  onGenerate: (video: PublishedVideo) => void;
  isGenerating: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={hasNewsletter ? "default" : "outline"} className="text-[10px]">
            {hasNewsletter ? "Newsletter Created" : "No Newsletter"}
          </Badge>
          {video.published_at && (
            <span className="text-[10px] text-muted-foreground">
              Published {new Date(video.published_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {!hasNewsletter ? (
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0 gap-1"
          onClick={() => onGenerate(video)}
          disabled={isGenerating}
        >
          <FileText className="w-3 h-3" />
          {isGenerating ? "Generating..." : "Generate Draft"}
        </Button>
      ) : (
        <div className="flex items-center gap-1 text-green-500 text-xs shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Done</span>
        </div>
      )}
    </motion.div>
  );
}

export function NewsletterIntegration() {
  const { publishedVideos, stats, isLoading, generateNewsletter } = useNewsletter();

  const handleGenerate = (video: PublishedVideo) => {
    generateNewsletter.mutate(video, {
      onSuccess: () => toast.success(`Newsletter draft created for "${video.title}"`),
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Newsletter Integration</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Drafts</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.totalDrafts}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sent</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.totalSent}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Covered</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.videosWithNewsletter.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Need Newsletter</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.videosWithoutNewsletter.length}</p>
        </motion.div>
      </div>

      {/* Videos needing newsletters */}
      {stats.videosWithoutNewsletter.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Videos Without Newsletter ({stats.videosWithoutNewsletter.length})
          </h3>
          <div className="space-y-2">
            {stats.videosWithoutNewsletter.map((video) => (
              <VideoNewsletterCard
                key={video.id}
                video={video}
                hasNewsletter={false}
                onGenerate={handleGenerate}
                isGenerating={generateNewsletter.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Videos with newsletters */}
      {stats.videosWithNewsletter.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Newsletter Created ({stats.videosWithNewsletter.length})
          </h3>
          <div className="space-y-2">
            {stats.videosWithNewsletter.slice(0, 5).map((video) => (
              <VideoNewsletterCard
                key={video.id}
                video={video}
                hasNewsletter={true}
                onGenerate={handleGenerate}
                isGenerating={false}
              />
            ))}
          </div>
        </div>
      )}

      {publishedVideos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
        >
          <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No published videos yet. Publish videos to auto-generate newsletter drafts.
          </p>
        </motion.div>
      )}
    </div>
  );
}
