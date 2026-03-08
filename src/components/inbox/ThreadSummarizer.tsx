import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface ThreadSummarizerProps {
  email: SmartEmail | null;
}

export function ThreadSummarizer({ email }: ThreadSummarizerProps) {
  const { workspaceId } = useWorkspace();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!email || !workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `Summarize this email thread in 3 bullet points. Focus on key asks, deadlines, and action items.\n\nSubject: ${email.subject}\nFrom: ${email.from_name} <${email.from_email}>\n\n${email.body_html?.replace(/<[^>]*>/g, "") || email.preview}`,
          skip_tools: true,
        },
      });
      if (error) throw error;
      setSummary(data?.response || "No summary available.");
    } catch {
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <Mail className="h-3 w-3 text-primary" />
          Thread Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{summary}</p>
        ) : (
          <Button size="sm" variant="outline" onClick={handleSummarize} disabled={loading} className="w-full text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Summarize Thread
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
