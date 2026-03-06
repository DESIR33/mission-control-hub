import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInHours, differenceInDays, format } from "date-fns";
import type { ServiceSnapshot } from "@/types/assistant";

const serviceInfo: Record<string, { icon: string; label: string }> = {
  youtube: { icon: "🎥", label: "YouTube" },
  crm: { icon: "👤", label: "CRM" },
  email: { icon: "📧", label: "Email" },
};

function getFreshness(snapshotDate: string) {
  const hours = differenceInHours(new Date(), new Date(snapshotDate));
  if (hours < 24) return { label: "Fresh", className: "bg-green-500/20 text-green-400" };
  const days = differenceInDays(new Date(), new Date(snapshotDate));
  if (days <= 3) return { label: `${days}d old`, className: "bg-yellow-500/20 text-yellow-400" };
  return { label: `${days}d stale`, className: "bg-red-500/20 text-red-400" };
}

interface Props {
  snapshots: ServiceSnapshot[];
}

export function ServiceSnapshotsTab({ snapshots }: Props) {
  const services = ["youtube", "crm", "email"];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {services.map((svc) => {
        const info = serviceInfo[svc];
        const snapshot = snapshots.find((s) => s.service === svc);
        const freshness = snapshot ? getFreshness(snapshot.snapshot_date) : null;

        return (
          <Card key={svc} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{info.icon}</span>
                <h3 className="font-medium text-sm">{info.label}</h3>
              </div>
              {freshness && (
                <Badge className={`text-xs ${freshness.className}`}>
                  {freshness.label}
                </Badge>
              )}
            </div>
            {snapshot ? (
              <>
                <p className="text-sm text-foreground">{snapshot.summary}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Last updated: {format(new Date(snapshot.snapshot_date), "MMM d, yyyy")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No snapshot available. Start a conversation to generate one.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
