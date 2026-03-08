import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useOutlookAuthCallback } from "@/hooks/use-smart-inbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function OutlookCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const authCallback = useOutlookAuthCallback();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      toast({
        title: "Outlook authorization failed",
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

    authCallback.mutate(
      { code, state },
      {
        onSuccess: () => {
          setStatus("success");
          toast({ title: "Outlook connected successfully!" });
          setTimeout(() => navigate("/inbox"), 2000);
        },
        onError: (err) => {
          setStatus("error");
          toast({
            title: "Failed to connect Outlook",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-foreground font-medium">Connecting your Outlook account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">Outlook connected! Redirecting to Inbox...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Connection failed</p>
            <button
              onClick={() => navigate("/inbox")}
              className="text-sm text-primary underline"
            >
              Return to Inbox
            </button>
          </>
        )}
      </div>
    </div>
  );
}
