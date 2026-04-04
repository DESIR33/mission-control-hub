import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function YouTubeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // workspace_id
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      toast({
        title: "YouTube authorization failed",
        description: searchParams.get("error_description") || error,
        variant: "destructive",
      });
      return;
    }

    if (!code || !state) {
      setStatus("error");
      toast({
        title: "Invalid callback",
        description: "Missing authorization code or state parameter.",
        variant: "destructive",
      });
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("youtube-auth-callback", {
          body: { workspace_id: state, code, redirect_uri: `${window.location.origin}/auth/youtube/callback` },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        setStatus("success");
        toast({ title: "YouTube connected successfully!" });
        setTimeout(() => navigate("/integrations"), 2000);
      } catch (err) {
        setStatus("error");
        toast({
          title: "Failed to connect YouTube",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-foreground font-medium">Connecting your YouTube account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">YouTube connected! Redirecting to Integrations...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Connection failed</p>
            <button
              onClick={() => navigate("/integrations")}
              className="text-sm text-primary underline"
            >
              Return to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}
