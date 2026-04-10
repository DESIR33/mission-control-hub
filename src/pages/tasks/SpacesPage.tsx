import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Briefcase, Layers, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceStats } from "@/hooks/use-space-stats";

const domainIcons: Record<string, typeof Shield> = {
  Shield: Shield,
  Briefcase: Briefcase,
};

export default function SpacesPage() {
  const { data: spaces = [], isLoading } = useSpaceStats();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a space to see its tasks, board, and status overview.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No spaces configured. Create task domains in your workspace settings.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {spaces.map((space, i) => {
            const Icon = domainIcons[space.domain_icon || ""] || Layers;
            const completionPct = space.total > 0 ? Math.round((space.completed / space.total) * 100) : 0;

            return (
              <motion.div
                key={space.domain_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className="cursor-pointer border bg-card hover:shadow-lg hover:border-primary/30 transition-all group"
                  onClick={() => navigate(`/tasks/spaces/${space.domain_id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-lg shrink-0"
                        style={{ backgroundColor: space.domain_color ? `${space.domain_color}20` : undefined }}
                      >
                        <Icon className="w-6 h-6" style={{ color: space.domain_color || undefined }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {space.domain_name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {space.total} tasks · {completionPct}% complete
                        </p>
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span>{space.in_progress} in progress</span>
                          <span>{space.todo} to do</span>
                          <span>{space.due_soon} due soon</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
