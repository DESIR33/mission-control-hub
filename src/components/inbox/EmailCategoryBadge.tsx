import { Badge } from "@/components/ui/badge";
import { Megaphone, Sparkles, ShieldAlert, Newspaper } from "lucide-react";
import type { EmailCategory } from "@/hooks/use-email-categories";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  marketing: { label: "Marketing", icon: Megaphone, className: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  opportunity: { label: "Opportunity", icon: Sparkles, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  spam: { label: "Spam", icon: ShieldAlert, className: "bg-red-500/10 text-red-700 border-red-500/30" },
  newsletter: { label: "Newsletter", icon: Newspaper, className: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
};

export function EmailCategoryBadge({ category }: { category: EmailCategory }) {
  if (!category) return null;
  const config = categoryConfig[category];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
      <Icon className="h-2.5 w-2.5 mr-1" />
      {config.label}
    </Badge>
  );
}
