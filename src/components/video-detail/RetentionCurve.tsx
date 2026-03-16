import type { RetentionPoint } from "@/hooks/use-video-retention";
import { BudgetCard } from "@/components/ui/analytics-bento";

interface Props {
  data: RetentionPoint[];
  avgViewPercentage: number; // 0-100
  videoDurationSeconds: number;
}

/**
 * Retention Curve visualization.
 * If real retention data points exist → renders actual curve.
 * Otherwise → renders a synthetic exponential-decay curve based on avgViewPercentage.
 */
export function RetentionCurve({ data, avgViewPercentage, videoDurationSeconds }: Props) {
  const hasRealData = data.length >= 2;

  const chartData = hasRealData
    ? data.map((p) => ({
        position: Math.round(p.elapsed_ratio * 100),
        retention: Math.round(p.audience_retention * 100),
        timestamp: fmtTimestamp(p.elapsed_ratio * videoDurationSeconds),
      }))
    : generateSyntheticCurve(avgViewPercentage, videoDurationSeconds);

  // Find key drop-off points
  const dropOffPoints = findDropOffPoints(chartData);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Audience Retention</h3>
        {!hasRealData && avgViewPercentage > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Estimated from avg view %
          </span>
        )}
      </div>

      {avgViewPercentage > 0 || hasRealData ? (
        <>
          <BudgetCard />

          {/* Key metrics row */}
          <div className="flex flex-wrap gap-3 text-xs">
            {avgViewPercentage > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  Avg viewed: <span className="font-semibold text-foreground">{avgViewPercentage.toFixed(1)}%</span>
                </span>
              </div>
            )}
            {dropOffPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive/60" />
                <span className="text-muted-foreground">
                  Drop at {point.position}%: <span className="font-semibold text-foreground">−{point.drop}%</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No retention data available. Sync Analytics API to see audience retention.
        </div>
      )}
    </div>
  );
}

function generateSyntheticCurve(avgPct: number, durationSec: number) {
  // Model retention as exponential decay: R(t) = e^(-kt)
  // where avg retention = integral of R(t) from 0 to 1 = (1 - e^(-k)) / k
  // Solve for k numerically
  const target = avgPct / 100;
  let k = 1;
  for (let i = 0; i < 50; i++) {
    const integral = k > 0.001 ? (1 - Math.exp(-k)) / k : 1;
    const error = integral - target;
    k += error * 2;
    if (Math.abs(error) < 0.001) break;
  }
  k = Math.max(0.01, k);

  const points = [];
  for (let pct = 0; pct <= 100; pct += 2) {
    const t = pct / 100;
    const retention = Math.round(Math.exp(-k * t) * 100);
    points.push({
      position: pct,
      retention: Math.max(0, Math.min(100, retention)),
      timestamp: fmtTimestamp(t * durationSec),
    });
  }
  return points;
}

function findDropOffPoints(data: { position: number; retention: number }[]) {
  const drops: { position: number; drop: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    const drop = data[i - 1].retention - data[i].retention;
    if (drop >= 8) {
      drops.push({ position: data[i].position, drop: Math.round(drop) });
    }
  }
  return drops.sort((a, b) => b.drop - a.drop).slice(0, 3);
}

function fmtTimestamp(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
