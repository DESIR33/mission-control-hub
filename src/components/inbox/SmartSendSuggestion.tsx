import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ClockIcon, SparklesIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

interface SmartSendSuggestionProps {
  recipientEmail: string;
}

export function SmartSendSuggestion({ recipientEmail }: SmartSendSuggestionProps) {
  const { workspaceId } = useWorkspace();
  const [bestTime, setBestTime] = useState<string | null>(null);

  useEffect(() => {
    if (!recipientEmail || !workspaceId) return;
    
    const analyze = async () => {
      try {
        // Check historical open patterns for this recipient
        const { data } = await (supabase as any)
          .from("inbox_emails")
          .select("opened_at, received_at")
          .eq("workspace_id", workspaceId)
          .ilike("from_email", recipientEmail)
          .not("opened_at", "is", null)
          .limit(20);

        if (data && data.length >= 3) {
          // Analyze which hours they tend to open emails
          const hours = data.map((e: any) => new Date(e.opened_at).getHours());
          const avgHour = Math.round(hours.reduce((a: number, b: number) => a + b, 0) / hours.length);
          const period = avgHour >= 12 ? "PM" : "AM";
          const displayHour = avgHour > 12 ? avgHour - 12 : avgHour === 0 ? 12 : avgHour;
          setBestTime(`${displayHour}:00 ${period}`);
        } else {
          // Default suggestion based on general best practices
          setBestTime("9:00 AM");
        }
      } catch {
        setBestTime("9:00 AM");
      }
    };

    analyze();
  }, [recipientEmail, workspaceId]);

  if (!bestTime || !recipientEmail) return null;

  return (
    <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
      <SparklesIcon className="h-2.5 w-2.5" />
      <ClockIcon className="h-2.5 w-2.5" />
      Best send time: {bestTime}
    </Badge>
  );
}
