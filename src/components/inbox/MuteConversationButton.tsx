import { Button } from "@/components/ui/button";
import { VolumeXIcon, Volume2Icon } from "lucide-react";
import { useMutedConversations, useMuteConversation, useUnmuteConversation } from "@/hooks/use-muted-conversations";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface MuteConversationButtonProps {
  email: SmartEmail;
}

export function MuteConversationButton({ email }: MuteConversationButtonProps) {
  const { data: muted = [] } = useMutedConversations();
  const muteConv = useMuteConversation();
  const unmuteConv = useUnmuteConversation();

  const isMuted = muted.some(
    (m) =>
      (m.conversation_id && m.conversation_id === email.conversation_id) ||
      (m.from_email && m.from_email === email.from_email)
  );

  const handleToggle = () => {
    if (isMuted) {
      unmuteConv.mutate({
        conversationId: email.conversation_id || undefined,
        fromEmail: email.from_email,
      });
    } else {
      muteConv.mutate({
        conversationId: email.conversation_id || undefined,
        fromEmail: email.from_email,
      });
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleToggle}
      title={isMuted ? "Unmute conversation (M)" : "Mute conversation (M)"}
    >
      {isMuted ? <Volume2Icon className="h-4 w-4 text-primary" /> : <VolumeXIcon className="h-4 w-4" />}
    </Button>
  );
}
