import { useMemo } from "react";
import type { Contact } from "@/types/crm";

interface LeadScoreProps {
  contact: Contact;
}

interface ScoreResult {
  score: number;
  label: "Hot" | "Warm" | "Cold";
  color: string;
  textColor: string;
}

const SOCIAL_FIELDS = [
  "social_twitter",
  "social_linkedin",
  "social_youtube",
  "social_instagram",
  "social_facebook",
  "social_telegram",
  "social_whatsapp",
] as const;

function calculateScore(contact: Contact): ScoreResult {
  let score = 0;

  // Has email: +15
  if (contact.email) score += 15;

  // Has phone: +10
  if (contact.phone) score += 10;

  // Has company: +15
  if (contact.company_id) score += 15;

  // VIP tier
  switch (contact.vip_tier) {
    case "silver":
      score += 10;
      break;
    case "gold":
      score += 20;
      break;
    case "platinum":
      score += 30;
      break;
  }

  // Social profiles: +3 each, max 21
  let socialCount = 0;
  for (const field of SOCIAL_FIELDS) {
    if (contact[field]) socialCount++;
  }
  score += Math.min(socialCount * 3, 21);

  // Has source: +5
  if (contact.source) score += 5;

  // Status scoring
  if (contact.status === "customer") score += 10;
  else if (contact.status === "active") score += 5;

  // Has notes: +4
  if (contact.notes) score += 4;

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  let label: ScoreResult["label"];
  let color: string;
  let textColor: string;

  if (score >= 70) {
    label = "Hot";
    color = "#22c55e";
    textColor = "text-green-600 dark:text-green-400";
  } else if (score >= 40) {
    label = "Warm";
    color = "#eab308";
    textColor = "text-yellow-600 dark:text-yellow-400";
  } else {
    label = "Cold";
    color = "#ef4444";
    textColor = "text-red-600 dark:text-red-400";
  }

  return { score, label, color, textColor };
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function LeadScore({ contact }: LeadScoreProps) {
  const { score, label, color, textColor } = useMemo(
    () => calculateScore(contact),
    [contact],
  );

  const strokeDashoffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className="inline-flex items-center gap-2">
      {/* Circular progress indicator */}
      <div className="relative h-11 w-11 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/30"
          />
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}
        >
          {score}
        </span>
      </div>

      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </div>
  );
}
