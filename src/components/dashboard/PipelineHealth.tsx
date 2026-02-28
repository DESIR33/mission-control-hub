import { motion } from "framer-motion";

export interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

const statusColorMap: Record<string, string> = {
  // contacts
  lead: "bg-muted-foreground",
  active: "bg-success",
  customer: "bg-primary",
  inactive: "bg-destructive",
  // video
  idea: "bg-muted-foreground",
  scripting: "bg-primary",
  recording: "bg-warning",
  editing: "bg-success",
  scheduled: "bg-primary",
  published: "bg-success",
  // deals
  prospecting: "bg-muted-foreground",
  outreach: "bg-primary",
  proposal: "bg-primary",
  negotiation: "bg-warning",
  closed_won: "bg-success",
  closed_lost: "bg-destructive",
};

function toStages(data: Record<string, number>): PipelineStage[] {
  return Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({
      label: label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
      color: statusColorMap[label] || "bg-muted-foreground",
    }));
}

function PipelineBar({ stages, title }: { stages: PipelineStage[]; title: string }) {
  const total = stages.reduce((s, st) => s + st.count, 0);
  if (total === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-xs font-mono text-muted-foreground">0 total</p>
        </div>
        <div className="h-2 rounded-full bg-secondary" />
        <p className="text-[11px] text-muted-foreground">No data yet</p>
      </div>
    );
  }
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

interface PipelineHealthProps {
  contacts?: PipelineStage[];
  content?: PipelineStage[];
  deals?: PipelineStage[];
}

export function PipelineHealth({ contacts = [], content = [], deals = [] }: PipelineHealthProps) {
  contactsByStatus: Record<string, number>;
  videosByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
}

export function PipelineHealth({ contactsByStatus, videosByStatus, dealsByStage }: PipelineHealthProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-lg border border-border bg-card p-5 space-y-5"
    >
      <h3 className="text-sm font-semibold text-card-foreground">Pipeline Health</h3>
      <PipelineBar stages={contacts} title="Contacts" />
      <PipelineBar stages={content} title="Content" />
      <PipelineBar stages={deals} title="Deals" />
      <PipelineBar stages={toStages(contactsByStatus)} title="Contacts" />
      <PipelineBar stages={toStages(videosByStatus)} title="Content" />
      <PipelineBar stages={toStages(dealsByStage)} title="Deals" />
    </motion.div>
  );
}
