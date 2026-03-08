import {
  User,
  Handshake,
  Building2,
  Mail,
  Tag,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartFollowUpQueue } from "@/components/inbox/SmartFollowUpQueue";
import { EmailToDealAutomation } from "@/components/inbox/EmailToDealAutomation";
import { EmailTemplateManager } from "@/components/inbox/EmailTemplateManager";
import { EmailCategoryBadge } from "@/components/inbox/EmailCategoryBadge";
import { ThreadSummarizer } from "@/components/inbox/ThreadSummarizer";
import { SmartReplySuggestions } from "@/components/inbox/SmartReplySuggestions";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface SmartInboxSidebarProps {
  email: SmartEmail | null;
}

const priorityColors: Record<string, string> = {
  P1: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  P2: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  P3: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  P4: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const tierColors: Record<string, string> = {
  platinum: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  gold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  silver: "bg-gray-400/10 text-gray-600 border-gray-400/30",
};

function formatCurrency(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SmartInboxSidebar({ email }: SmartInboxSidebarProps) {
  const outlookSend = useOutlookSend();

  if (!email) {
    return (
      <div className="space-y-4 p-4 overflow-y-auto h-full">
        <SmartFollowUpQueue />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* AI Summary & Category */}
      {((email as any).ai_summary || (email as any).ai_category) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <EmailCategoryBadge category={(email as any).ai_category} />
            {(email as any).ai_summary && (
              <p className="text-xs text-muted-foreground">{(email as any).ai_summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Priority & Labels */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={priorityColors[email.priority]}>
          {email.priority}
        </Badge>
        {email.labels.map((label) => (
          <Badge key={label} variant="secondary" className="text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {label}
          </Badge>
        ))}
      </div>

      {/* Sender Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p className="font-medium">{email.from_name || email.from_email}</p>
          <p className="text-muted-foreground">{email.from_email}</p>
        </CardContent>
      </Card>

      {/* Matched Contact */}
      {email.matched_contact ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="font-medium">
              {email.matched_contact.first_name}{" "}
              {email.matched_contact.last_name ?? ""}
            </p>
            <p className="text-muted-foreground">{email.from_email}</p>
            {email.matched_contact.tier &&
              email.matched_contact.tier !== "none" && (
                <Badge
                  variant="outline"
                  className={
                    tierColors[email.matched_contact.tier] ?? ""
                  }
                >
                  {email.matched_contact.tier.charAt(0).toUpperCase() +
                    email.matched_contact.tier.slice(1)}
                </Badge>
              )}
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ArrowRight className="w-3.5 h-3.5 mr-2" />
              View Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Unknown Sender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              This sender is not in your CRM yet.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Create Contact
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Matched Deal */}
      {email.matched_deal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Handshake className="w-4 h-4" />
              Active Deal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="font-medium">{email.matched_deal.title}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {formatStage(email.matched_deal.stage)}
              </Badge>
              <span className="text-muted-foreground">
                {formatCurrency(email.matched_deal.value)}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ArrowRight className="w-3.5 h-3.5 mr-2" />
              View Deal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {!email.matched_contact && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Create Contact
            </Button>
          )}
          <EmailToDealAutomation email={email} />
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-2" />
            Add to Sequence
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <Building2 className="w-3.5 h-3.5 mr-2" />
            Log Activity
          </Button>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <EmailTemplateManager />
    </div>
  );
}
