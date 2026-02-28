import { motion } from "framer-motion";

interface RevenueDataPoint {
  month: string;
  amount: number;
}

interface RevenueChartProps {
  monthly?: RevenueDataPoint[];
  sponsors?: number;
  affiliates?: number;
  products?: number;
}

function formatCurrency(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

export function RevenueChart({ monthly = [], sponsors = 0, affiliates = 0, products = 0 }: RevenueChartProps) {
  const revenue = monthly.map((d) => d.amount);
  const months = monthly.map((d) => d.month);
  const maxRevenue = Math.max(...revenue, 1);
  const totalRevenue = revenue.reduce((s, v) => s + v, 0);
  const hasData = totalRevenue > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">Revenue (6mo)</h3>
        {hasData && (
          <span className="text-xs font-mono text-success">
            {formatCurrency(totalRevenue)} total
          </span>
        )}
      </div>

      {hasData ? (
        <div className="flex items-end gap-2 h-32">
          {revenue.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                {formatCurrency(val)}
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
      ) : (
        <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
          No revenue data yet. Close deals or add affiliate transactions to see trends.
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsors</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">{formatCurrency(sponsors)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Affiliates</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">{formatCurrency(affiliates)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Products</p>
          <p className="text-sm font-mono font-semibold text-card-foreground">{formatCurrency(products)}</p>
        </div>
      </div>
    </motion.div>
  );
}
