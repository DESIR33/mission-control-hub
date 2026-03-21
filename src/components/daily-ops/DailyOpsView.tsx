import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { RefreshCw, Zap, CalendarClock, Clock, Filter, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpsItemCard } from "./OpsItemCard";
import { useDailyOpsItems, useRefreshOpsScoring, useOpsAction } from "@/hooks/use-daily-ops";
import type { OpsItem } from "@/hooks/use-daily-ops";

type TimeBlock = "all" | "morning" | "afternoon" | "evening";
type SourceFilter = "all" | "task" | "proposal" | "deal" | "content" | "inbox";

export function DailyOpsView() {
  const { data: items = [], isLoading } = useDailyOpsItems();
  const refreshMutation = useRefreshOpsScoring();
  const actionMutation = useOpsAction();
  const [timeFilter, setTimeFilter] = useState<TimeBlock>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    let result = items;
    if (timeFilter !== "all") result = result.filter((i) => i.time_block === timeFilter);
    if (sourceFilter !== "all") result = result.filter((i) => i.source_type === sourceFilter);
    // Hide snoozed items that haven't expired
    result = result.filter((i) => {
      if (i.status === "snoozed" && i.snoozed_until) {
        return new Date(i.snoozed_until) <= new Date();
      }
      return true;
    });
    return result;
  }, [items, timeFilter, sourceFilter]);

  const stats = useMemo(() => {
    const urgent = items.filter((i) => i.urgency_score >= 70).length;
    const byBlock = { morning: 0, afternoon: 0, evening: 0 };
    const byType: Record<string, number> = {};
    for (const i of items) {
      byBlock[i.time_block as keyof typeof byBlock]++;
      byType[i.source_type] = (byType[i.source_type] || 0) + 1;
    }
    return { total: items.length, urgent, byBlock, byType };
  }, [items]);

  const handleAction = (item: OpsItem, action: string, snoozedUntil?: string) => {
    actionMutation.mutate({
      item,
      action: action as any,
      snoozedUntil,
    });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMM d")} · {greeting}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Score & Refresh
        </Button>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5">
          <LayoutList className="w-3 h-3" />
          {stats.total} items
        </Badge>
        {stats.urgent > 0 && (
          <Badge variant="destructive" className="text-xs gap-1.5 py-1 px-2.5">
            <Zap className="w-3 h-3" />
            {stats.urgent} urgent
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs gap-1 py-1 px-2.5">
          <Zap className="w-3 h-3" /> AM: {stats.byBlock.morning}
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1 py-1 px-2.5">
          <CalendarClock className="w-3 h-3" /> PM: {stats.byBlock.afternoon}
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1 py-1 px-2.5">
          <Clock className="w-3 h-3" /> Eve: {stats.byBlock.evening}
        </Badge>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeBlock)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-2.5">All</TabsTrigger>
            <TabsTrigger value="morning" className="text-xs h-6 px-2.5">🌅 Morning</TabsTrigger>
            <TabsTrigger value="afternoon" className="text-xs h-6 px-2.5">☀️ Afternoon</TabsTrigger>
            <TabsTrigger value="evening" className="text-xs h-6 px-2.5">🌙 Evening</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-2.5">All</TabsTrigger>
            <TabsTrigger value="task" className="text-xs h-6 px-2.5">✅ Tasks</TabsTrigger>
            <TabsTrigger value="proposal" className="text-xs h-6 px-2.5">🤖 Proposals</TabsTrigger>
            <TabsTrigger value="deal" className="text-xs h-6 px-2.5">💰 Deals</TabsTrigger>
            <TabsTrigger value="content" className="text-xs h-6 px-2.5">🎬 Content</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground text-sm">
            {items.length === 0
              ? "No ops items yet. Hit \"Score & Refresh\" to aggregate your tasks, proposals, and deadlines."
              : "No items match your current filters."
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <OpsItemCard
                key={item.id}
                item={item}
                onAction={(action, snoozedUntil) => handleAction(item, action, snoozedUntil)}
                isActing={actionMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
