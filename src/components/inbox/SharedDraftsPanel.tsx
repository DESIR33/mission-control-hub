import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileEditIcon, SendIcon, Loader2Icon } from "lucide-react";
import { useSharedDrafts, useUpdateSharedDraft } from "@/hooks/use-shared-drafts";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import { toast } from "sonner";

export function SharedDraftsPanel() {
  const { data: drafts = [], isLoading } = useSharedDrafts();
  const updateDraft = useUpdateSharedDraft();
  const outlookSend = useOutlookSend();

  const handleSend = async (draft: any) => {
    try {
      await outlookSend.mutateAsync({
        to: draft.to_email,
        subject: draft.subject,
        body_html: draft.body_html,
      });
      updateDraft.mutate({ id: draft.id, status: "sent" });
      toast.success("Shared draft sent");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (drafts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <FileEditIcon className="h-3 w-3 text-primary" />
          Shared Drafts
          <Badge variant="secondary" className="text-[10px] ml-1">{drafts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {drafts.slice(0, 5).map((draft) => (
          <div key={draft.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{draft.subject || "(No subject)"}</p>
              <p className="text-[10px] text-muted-foreground truncate">To: {draft.to_email}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => handleSend(draft)}>
              <SendIcon className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
