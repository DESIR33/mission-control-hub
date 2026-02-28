import { motion } from "framer-motion";

interface RevenueChartProps {
  months: { month: string; total: number }[];
}

export function RevenueChart({ months }: RevenueChartProps) {
  const maxRevenue = Math.max(...months.map((m) => m.total), 1);
  const totalRevenue = months.reduce((s, m) => s + m.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">Revenue (6mo)</h3>
        <span className="text-xs font-mono text-muted-foreground">
          Total: ${(totalRevenue / 1000).toFixed(1)}k
        </span>
      </div>

      <div className="flex items-end gap-2 h-32">
        {months.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground">
              {m.total > 0 ? `$${(m.total / 1000).toFixed(1)}k` : "—"}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: m.total > 0 ? `${(m.total / maxRevenue) * 100}%` : "2%" }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
              className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
            />
            <span className="text-[10px] text-muted-foreground">{m.month}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
