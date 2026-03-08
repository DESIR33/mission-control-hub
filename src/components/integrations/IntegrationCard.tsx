import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ExternalLink, Loader2, FlaskConical, Settings, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTestIntegration, type IntegrationKey, type WorkspaceIntegration } from "@/hooks/use-integrations";
import { useStripeSync } from "@/hooks/use-stripe-sync";
import { useSlackNotify } from "@/hooks/use-slack-notify";
import type { IntegrationDef } from "@/pages/IntegrationsPage";

interface IntegrationCardProps {
  def: IntegrationDef;
  record: WorkspaceIntegration | undefined;
  onConnect: (key: IntegrationKey) => void;
  onDisconnect: (key: IntegrationKey) => void;
  isDisconnecting: boolean;
}

export function IntegrationCard({
  def,
  record,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: IntegrationCardProps) {
  const isConnected = record?.enabled ?? false;
  const { toast } = useToast();
  const testMutation = useTestIntegration();
  const stripeSync = useStripeSync();
  const [testResult, setTestResult] = useState<any>(null);

  const handleTest = async () => {
    setTestResult(null);
    testMutation.mutate(def.key, {
      onSuccess: (data) => {
        setTestResult(data);
        if (data.valid) {
          toast({ title: `✅ ${def.name} connection verified` });
        } else {
          toast({ title: "Connection issues found", description: data.errors?.[0], variant: "destructive" });
        }
      },
      onError: (err) => {
        toast({ title: "Test failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={cn(
          "relative border transition-colors",
          isConnected ? "border-green-800/60 bg-card" : "border-border bg-card"
        )}
      >
        {isConnected && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/60 to-transparent rounded-t-lg" />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
              style={{ background: def.iconBg }}
            >
              {def.icon}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs shrink-0 gap-1",
                isConnected
                  ? "border-green-700 text-green-400 bg-green-950/40"
                  : "border-border text-muted-foreground"
              )}
            >
              {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              {isConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>

          <div className="space-y-0.5 mt-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              {def.name}
              {def.docsUrl && (
                <a
                  href={def.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`${def.name} documentation`}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">{def.description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {isConnected && record?.connected_at && (
            <p className="text-xs text-muted-foreground">
              Connected{" "}
              {new Date(record.connected_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          {def.usedFor && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2">{def.usedFor}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {isConnected ? (
              <>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onConnect(def.key)}>
                  <Settings className="w-3 h-3 mr-1" />
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <FlaskConical className="w-3 h-3 mr-1" />
                  )}
                  Test
                </Button>
                {def.key === "stripe" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      stripeSync.mutate(undefined, {
                        onSuccess: (data) => {
                          toast({ title: `✅ Synced ${data.charges_synced} charges, ${data.subscriptions_synced} subscriptions` });
                        },
                        onError: (err) => {
                          toast({ title: "Stripe sync failed", description: err.message, variant: "destructive" });
                        },
                      });
                    }}
                    disabled={stripeSync.isPending}
                  >
                    {stripeSync.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Sync Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive/80 border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-7 text-xs"
                  onClick={() => onDisconnect(def.key)}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Disconnect
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onConnect(def.key)}>
                Connect
              </Button>
            )}
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="rounded-lg border border-border p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={testResult.valid ? "text-green-500" : "text-destructive"}>
                  {testResult.valid ? "✓" : "✗"} {testResult.valid ? "Connection valid" : "Connection failed"}
                </span>
              </div>
              {testResult.details && Object.entries(testResult.details).map(([k, v]) => (
                <p key={k} className="text-xs text-muted-foreground">
                  {k}: {String(v)}
                </p>
              ))}
              {testResult.errors?.length > 0 && (
                <div className="space-y-1">
                  {testResult.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-amber-400">⚠ {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
