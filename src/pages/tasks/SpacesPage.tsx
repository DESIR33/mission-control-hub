import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Briefcase, CheckCircle2, RefreshCw, FileEdit, Calendar, ChevronRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpaceStats, SpaceStats } from "@/hooks/use-space-stats";
import { SpaceSummaryCard } from "@/components/spaces/SpaceSummaryCard";

const domainIcons: Record<string, typeof Shield> = {
  Shield: Shield,
  Briefcase: Briefcase,
};

export default function SpacesPage() {
  const { data: spaces = [], isLoading } = useSpaceStats();
  const [activeSpace, setActiveSpace] = useState<string>("all");

  const displayed = activeSpace === "all" ? spaces : spaces.filter((s) => s.domain_id === activeSpace);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Overview of your task domains — see status, priorities, and recent activity at a glance.
        </p>
      </motion.div>

      {spaces.length > 1 && (
        <Tabs value={activeSpace} onValueChange={setActiveSpace}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" /> All Spaces
            </TabsTrigger>
            {spaces.map((s) => {
              const Icon = domainIcons[s.domain_icon || ""] || Layers;
              return (
                <TabsTrigger key={s.domain_id} value={s.domain_id} className="gap-1.5">
                  <Icon className="w-3.5 h-3.5" /> {s.domain_name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No spaces configured. Create task domains in your workspace settings.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {displayed.map((space, i) => (
            <motion.div
              key={space.domain_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SpaceSummaryCard space={space} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
