import { motion } from "framer-motion";

interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

const contactsPipeline: PipelineStage[] = [
  { label: "New", count: 12, color: "bg-primary" },
  { label: "Active", count: 34, color: "bg-success" },
  { label: "Follow-up", count: 8, color: "bg-warning" },
  { label: "Stale", count: 5, color: "bg-destructive" },
];

const contentPipeline: PipelineStage[] = [
  { label: "Idea", count: 6, color: "bg-muted-foreground" },
  { label: "Script", count: 3, color: "bg-primary" },
  { label: "Filming", count: 1, color: "bg-warning" },
  { label: "Edit", count: 2, color: "bg-success" },
  { label: "Review", count: 1, color: "bg-primary" },
];

const dealsPipeline: PipelineStage[] = [
  { label: "Prospect", count: 4, color: "bg-muted-foreground" },
  { label: "Outreach", count: 3, color: "bg-primary" },
  { label: "Negotiation", count: 2, color: "bg-warning" },
  { label: "Closed", count: 7, color: "bg-success" },
];

function PipelineBar({ stages, title }: { stages: PipelineStage[]; title: string }) {
  const total = stages.reduce((s, st) => s + st.count, 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-xs font-mono text-muted-foreground">{total} total</p>
      </div>
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-secondary">
        {stages.map((stage, i) => (
          <div
            key={i}
            className={`${stage.color} transition-all`}
            style={{ width: `${(stage.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
            <span className="text-[11px] text-muted-foreground">
              {stage.label}
              <span className="font-mono ml-1 text-card-foreground">{stage.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineHealth() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-lg border border-border bg-card p-5 space-y-5"
    >
      <h3 className="text-sm font-semibold text-card-foreground">Pipeline Health</h3>
      <PipelineBar stages={contactsPipeline} title="Contacts" />
      <PipelineBar stages={contentPipeline} title="Content" />
      <PipelineBar stages={dealsPipeline} title="Deals" />
    </motion.div>
  );
}
