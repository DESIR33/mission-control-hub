import { useMemo } from "react";
import type { Contact } from "@/types/crm";
import { calculateEngagementScore, type EngagementScoreResult } from "@/lib/engagement-score";
import { useActivities } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useReminders } from "@/hooks/use-reminders";

const COLORS: Record<EngagementScoreResult["label"], { bg: string; text: string; ring: string }> = {
  Hot: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", ring: "ring-red-300" },
  Warm: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", ring: "ring-amber-300" },
  Cool: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-300" },
  Cold: { bg: "bg-slate-100 dark:bg-slate-900/30", text: "text-slate-600 dark:text-slate-400", ring: "ring-slate-300" },
};

interface EngagementBadgeProps {
  contact: Contact;
  showBreakdown?: boolean;
}

export function EngagementBadge({ contact, showBreakdown = false }: EngagementBadgeProps) {
  const { data: activities = [] } = useActivities(contact.id, "contact");
  const { data: deals = [] } = useDeals();
  const { data: reminders = [] } = useReminders(contact.id, "contact");

  const contactDeals = useMemo(
    () => deals.filter((d) => d.contact_id === contact.id && !d.deleted_at),
    [deals, contact.id]
  );

  const result = useMemo(
    () =>
      calculateEngagementScore(
        { vip_tier: contact.vip_tier, last_contact_date: contact.last_contact_date, status: contact.status },
        activities.map((a) => ({ activity_type: a.activity_type, created_at: a.created_at })),
        contactDeals.map((d) => ({ stage: d.stage, contact_id: d.contact_id })),
        reminders.map((r) => ({ completed_at: r.completed_at ?? undefined, due_date: r.due_date }))
      ),
    [contact, activities, contactDeals, reminders]
  );

  const colors = COLORS[result.label];

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}>
        {result.score}
        <span className="font-medium">{result.label}</span>
      </span>
      {showBreakdown && (
        <div className="text-[10px] text-muted-foreground space-x-1.5">
          <span title="Recency">R:{result.breakdown.recency}</span>
          <span title="Activity">A:{result.breakdown.activityVolume}</span>
          <span title="Deal">D:{result.breakdown.dealStatus}</span>
          <span title="Email">E:{result.breakdown.emailEngagement}</span>
        </div>
      )}
    </div>
  );
}
