import { DollarSign, Building2 } from "lucide-react";
import type { VideoDeal } from "@/hooks/use-video-deals";

interface Props {
  deals: VideoDeal[];
  isLoading: boolean;
}

const fmtMoney = (n: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
};

export function DealsAttributionPanel({ deals, isLoading }: Props) {
  if (isLoading) {
    return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading deals…</div>;
  }

  const totalValue = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Deals Attributed to This Video</h3>

      {deals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <DollarSign className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No deals linked to this video yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add the YouTube video ID to a deal's notes to link it.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Pipeline</p>
              <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(totalValue)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Won Revenue</p>
              <p className="text-lg font-bold font-mono text-green-500">{fmtMoney(wonValue)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Deals</p>
              <p className="text-lg font-bold font-mono text-foreground">{deals.length}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Deal</th>
                  <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Value</th>
                  <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-t border-border/50">
                    <td className="p-2.5 text-foreground font-medium">{d.title}</td>
                    <td className="p-2.5 text-muted-foreground">
                      {d.company ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {d.company.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-2.5 font-mono">{d.value ? fmtMoney(d.value, d.currency ?? "USD") : "—"}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        d.stage === "closed_won" ? "bg-green-500/10 text-green-500" :
                        d.stage === "closed_lost" ? "bg-red-500/10 text-red-500" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {d.stage.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
