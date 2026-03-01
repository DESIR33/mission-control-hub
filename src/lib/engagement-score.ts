export interface EngagementScoreResult {
  score: number;
  label: "Hot" | "Warm" | "Cool" | "Cold";
  breakdown: {
    recency: number;
    activityVolume: number;
    dealStatus: number;
    emailEngagement: number;
    followUpCompliance: number;
    vipBonus: number;
  };
}

export function calculateEngagementScore(
  contact: {
    vip_tier?: string | null;
    last_contact_date?: string | null;
    status?: string | null;
  },
  activities: Array<{
    activity_type?: string;
    created_at: string;
  }>,
  deals: Array<{
    stage?: string;
    contact_id?: string | null;
  }>,
  reminders: Array<{
    completed_at?: string | null;
    due_date: string;
  }>
): EngagementScoreResult {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Recency (max 20)
  let recency = 0;
  const lastContact = contact.last_contact_date ? new Date(contact.last_contact_date) : null;
  if (lastContact) {
    if (lastContact >= sevenDaysAgo) recency = 20;
    else if (lastContact >= thirtyDaysAgo) recency = 10;
  }

  // Activity volume (max 30): +5 per activity in last 30 days, cap at 30
  const recentActivities = activities.filter((a) => new Date(a.created_at) >= thirtyDaysAgo);
  const activityVolume = Math.min(recentActivities.length * 5, 30);

  // Deal status (max 20)
  let dealStatus = 0;
  for (const deal of deals) {
    if (deal.stage === "negotiation" || deal.stage === "proposal") {
      dealStatus = Math.max(dealStatus, 20);
    } else if (deal.stage === "qualification") {
      dealStatus = Math.max(dealStatus, 10);
    } else if (deal.stage === "prospecting") {
      dealStatus = Math.max(dealStatus, 5);
    }
  }

  // Email engagement (max 15)
  let emailEngagement = 0;
  const emailActivities = recentActivities.filter(
    (a) => a.activity_type === "email_sent" || a.activity_type === "email_received" || a.activity_type === "email"
  );
  emailEngagement += Math.min(emailActivities.length * 5, 10);
  const hasReply = recentActivities.some((a) => a.activity_type === "email_received");
  if (hasReply) emailEngagement += 5;
  emailEngagement = Math.min(emailEngagement, 15);

  // Follow-up compliance (max 10)
  let followUpCompliance = 0;
  const pastDueReminders = reminders.filter((r) => new Date(r.due_date) < now);
  if (pastDueReminders.length > 0) {
    const completedOnTime = pastDueReminders.filter((r) => r.completed_at != null).length;
    followUpCompliance = pastDueReminders.length > 0
      ? Math.round((completedOnTime / pastDueReminders.length) * 10)
      : 10;
  } else {
    followUpCompliance = 10;
  }

  // VIP tier bonus (max 15)
  let vipBonus = 0;
  if (contact.vip_tier === "platinum") vipBonus = 15;
  else if (contact.vip_tier === "gold") vipBonus = 10;
  else if (contact.vip_tier === "silver") vipBonus = 5;

  const score = Math.min(recency + activityVolume + dealStatus + emailEngagement + followUpCompliance + vipBonus, 100);

  let label: EngagementScoreResult["label"];
  if (score >= 80) label = "Hot";
  else if (score >= 50) label = "Warm";
  else if (score >= 20) label = "Cool";
  else label = "Cold";

  return {
    score,
    label,
    breakdown: {
      recency,
      activityVolume,
      dealStatus,
      emailEngagement,
      followUpCompliance,
      vipBonus,
    },
  };
}
