import { useState } from "react";
import {
  User,
  Handshake,
  Building2,
  Mail,
  Tag,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SmartFollowUpQueue } from "@/components/inbox/SmartFollowUpQueue";
import { EmailToDealAutomation } from "@/components/inbox/EmailToDealAutomation";
import { EmailToDealPipeline } from "@/components/inbox/EmailToDealPipeline";
import { EmailTemplateManager } from "@/components/inbox/EmailTemplateManager";
import { EmailCategoryBadge } from "@/components/inbox/EmailCategoryBadge";
import { ThreadSummarizer } from "@/components/inbox/ThreadSummarizer";
import { SmartReplySuggestions } from "@/components/inbox/SmartReplySuggestions";
import { ThreadTimelineCRM } from "@/components/inbox/ThreadTimelineCRM";
import { FollowUpRadar } from "@/components/inbox/FollowUpRadar";
import { ConversationIntelligence } from "@/components/inbox/ConversationIntelligence";
import { TeamCommentsPanel } from "@/components/inbox/TeamCommentsPanel";
import { SharedDraftsPanel } from "@/components/inbox/SharedDraftsPanel";
import { EngagementDashboard } from "@/components/inbox/EngagementDashboard";
import { EmailDealSuggestions } from "@/components/inbox/EmailDealSuggestions";
import { SmartReplyComposer } from "@/components/inbox/SmartReplyComposer";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import { useCreateContactFromEmail, useCreateCompanyFromEmail } from "@/hooks/use-email-to-contact";
import { Loader2 } from "lucide-react";
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
  const navigate = useNavigate();
  const outlookSend = useOutlookSend();
  const createContact = useCreateContactFromEmail();
  const createCompany = useCreateCompanyFromEmail();
  const [dupDialog, setDupDialog] = useState<{ type: "contact" | "company"; existingName: string } | null>(null);

  // Helper to strip HTML for body_text extraction
  const getBodyText = () => {
    if (!email?.body_html) return email?.preview || "";
    const div = document.createElement("div");
    div.innerHTML = email.body_html;
    return (div.textContent || div.innerText || "").substring(0, 2000);
  };

  const companyPayload = () => ({
    from_email: email?.from_email || "",
    from_name: email?.from_name || "",
    subject: email?.subject || "",
    body_text: getBodyText(),
  });

  const dupErrorHandler = {
    onError: (e: any) => {
      if (e.duplicate) setDupDialog({ type: e.duplicate.type, existingName: e.duplicate.existingName });
    },
  };

  const handleOverride = () => {
    if (!dupDialog || !email) return;
    if (dupDialog.type === "contact") {
      createContact.mutate({ from_name: email.from_name || "", from_email: email.from_email, force: true });
    } else {
      createCompany.mutate({ ...companyPayload(), force: true });
    }
    setDupDialog(null);
  };

  if (!email) {
    return (
      <div className="space-y-4 p-4 overflow-y-auto h-full">
        <FollowUpRadar />
        <ConversationIntelligence />
        <SmartFollowUpQueue />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
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
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4 shrink-0" />
            Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 min-w-0">
          <p className="font-medium truncate">{email.from_name || email.from_email}</p>
          <p className="text-muted-foreground truncate">{email.from_email}</p>
        </CardContent>
      </Card>

      {/* Matched Contact */}
      {email.matched_contact ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 shrink-0" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 min-w-0">
            <p className="font-medium truncate">
              {email.matched_contact.first_name}{" "}
              {email.matched_contact.last_name ?? ""}
            </p>
            <p className="text-muted-foreground truncate">{email.from_email}</p>
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
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate(`/contacts/${email.matched_contact!.id}`)}
            >
              <ArrowRight className="w-3.5 h-3.5 mr-2" />
              View Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 shrink-0" />
              Unknown Sender
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-2">
            <p className="text-sm text-muted-foreground">
              This sender is not in your CRM yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full overflow-hidden"
              disabled={createContact.isPending}
              onClick={() => createContact.mutate({ from_name: email.from_name || "", from_email: email.from_email }, dupErrorHandler)}
            >
              {createContact.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : <Plus className="w-3.5 h-3.5 mr-2 shrink-0" />}
              <span className="truncate">Create Contact</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full overflow-hidden"
              disabled={createCompany.isPending}
              onClick={() => createCompany.mutate({ from_email: email.from_email, from_name: email.from_name || "" }, dupErrorHandler)}
            >
              {createCompany.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : <Building2 className="w-3.5 h-3.5 mr-2 shrink-0" />}
              <span className="truncate">Create Company</span>
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
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 min-w-0">
          {!email.matched_contact && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start overflow-hidden"
                disabled={createContact.isPending}
                onClick={() => createContact.mutate({ from_name: email.from_name || "", from_email: email.from_email }, dupErrorHandler)}
              >
                {createContact.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : <Plus className="w-3.5 h-3.5 mr-2 shrink-0" />}
                <span className="truncate">Create Contact</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start overflow-hidden"
                disabled={createCompany.isPending}
                onClick={() => createCompany.mutate({ from_email: email.from_email, from_name: email.from_name || "" }, dupErrorHandler)}
              >
                {createCompany.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : <Building2 className="w-3.5 h-3.5 mr-2 shrink-0" />}
                <span className="truncate">Create Company</span>
              </Button>
            </>
          )}
          <EmailToDealAutomation email={email} />
          <EmailToDealPipeline email={email} />
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start overflow-hidden"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-2 shrink-0" />
            <span className="truncate">Add to Sequence</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start overflow-hidden"
          >
            <Building2 className="w-3.5 h-3.5 mr-2 shrink-0" />
            <span className="truncate">Log Activity</span>
          </Button>
        </CardContent>
      </Card>

      {/* Thread Timeline with CRM Context */}
      <ThreadTimelineCRM email={email} />

      {/* Thread Summarizer */}
      <ThreadSummarizer email={email} />

      {/* Smart Reply Suggestions */}
      <SmartReplySuggestions
        email={email}
        onSendReply={(body) => {
          outlookSend.mutate({
            reply_to_message_id: email.message_id,
            body_html: body,
          });
        }}
        isSending={outlookSend.isPending}
      />

      {/* Team Comments */}
      <Card>
        <CardContent className="pt-4">
          <TeamCommentsPanel emailId={email.id} />
        </CardContent>
      </Card>

      {/* Shared Drafts */}
      <SharedDraftsPanel />

      {/* Engagement Dashboard */}
      <EngagementDashboard />

      {/* AI Deal Suggestions */}
      <EmailDealSuggestions />

      {/* Smart Reply with CRM Context */}
      <SmartReplyComposer
        emailSubject={email.subject}
        emailBody={email.preview}
        senderName={email.from_name}
        senderEmail={email.from_email}
      />

      {/* Email Templates */}
      <EmailTemplateManager />

      {/* Duplicate Override Dialog */}
      <AlertDialog open={!!dupDialog} onOpenChange={(open) => !open && setDupDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
            <AlertDialogDescription>
              A {dupDialog?.type} named <strong>"{dupDialog?.existingName}"</strong> already exists with this email domain. Would you like to update the existing record instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverride}>
              Update Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
