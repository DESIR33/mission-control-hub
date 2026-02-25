import { motion } from "framer-motion";

const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const revenue = [8200, 12400, 9800, 15600, 18200, 14500];
const maxRevenue = Math.max(...revenue);

export function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">Revenue (6mo)</h3>
        <span className="text-xs font-mono text-success">+22% vs prior</span>
      </div>

      <div className="flex items-end gap-2 h-32">
        {revenue.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground">
              ${(val / 1000).toFixed(1)}k
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(val / maxRevenue) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
              className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
            />
            <span className="text-[10px] text-muted-foreground">{months[i]}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsors</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">$52.4k</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Affiliates</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">$18.2k</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Products</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">$8.1k</p>
        </div>
      </div>
    </motion.div>
  );
}
