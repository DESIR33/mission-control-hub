import { useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import {
  useIntegrations,
  useUpsertIntegration,
  useDisconnectIntegration,
  type IntegrationKey,
} from "@/hooks/use-integrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ConnectDialog } from "@/components/integrations/ConnectDialog";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types exported for child components ──────────────────────────────────────

export interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  required?: boolean;
  hint?: string;
}

export interface IntegrationDef {
  key: IntegrationKey;
  name: string;
  description: string;
  icon: string;           // emoji / text icon
  iconBg: string;         // CSS background value
  docsUrl?: string;
  usedFor?: string;
  connectHint?: string;
  warningNote?: string;
  fields: FieldDef[];
}

// ─── Integration catalogue ────────────────────────────────────────────────────

const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "ms_outlook",
    name: "Microsoft Outlook",
    description:
      "Sync emails, calendar events, and contacts with your Microsoft 365 account.",
    icon: "📧",
    iconBg: "linear-gradient(135deg, #0078d4 0%, #005a9e 100%)",
    docsUrl: "https://learn.microsoft.com/en-us/graph/overview",
    usedFor: "Used for: email sync · calendar · contact enrichment",
    connectHint:
      "Provide your Azure AD app credentials. OAuth consent will be requested on first use.",
    warningNote:
      "Full OAuth flow will be initiated on first sync. Store your credentials securely — they are never logged.",
    fields: [
      {
        name: "client_id",
        label: "Azure App Client ID",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
        hint: "Found in Azure Portal → App registrations → your app → Overview.",
      },
      {
        name: "client_secret",
        label: "Client Secret",
        placeholder: "Paste your client secret value",
        secret: true,
        required: true,
        hint: "Certificates & secrets → Client secrets → Value (shown once).",
      },
      {
        name: "tenant_id",
        label: "Tenant ID",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
        hint: "Azure Portal → Azure Active Directory → Overview → Tenant ID.",
      },
    ],
  },
  {
    key: "firecrawl",
    name: "Firecrawl",
    description:
      "Crawl and extract structured data from any website to enrich companies and contacts.",
    icon: "🔥",
    iconBg: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
    docsUrl: "https://docs.firecrawl.dev",
    usedFor: "Used for: company enrichment · website scraping · lead data",
    connectHint: "Paste your Firecrawl API key to enable web enrichment.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        placeholder: "fc-••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "Found at firecrawl.dev → Dashboard → API Keys.",
      },
    ],
  },
  {
    key: "twitter",
    name: "Twitter / X",
    description:
      "Pull tweets, mentions, and follower data for contacts and track social engagement.",
    icon: "𝕏",
    iconBg: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)",
    docsUrl: "https://developer.twitter.com/en/docs",
    usedFor: "Used for: contact social data · mention tracking · engagement",
    connectHint:
      "Provide your Twitter Developer app credentials to enable social data pulls.",
    fields: [
      {
        name: "bearer_token",
        label: "Bearer Token",
        placeholder: "AAAA…",
        secret: true,
        required: true,
        hint: "Twitter Developer Portal → Your project → Keys and tokens → Bearer Token.",
      },
      {
        name: "api_key",
        label: "API Key (Consumer Key)",
        placeholder: "Your API key",
        required: false,
        hint: "Optional — required only for user-context endpoints.",
      },
      {
        name: "api_secret",
        label: "API Secret",
        placeholder: "Your API key secret",
        secret: true,
        required: false,
      },
    ],
  },
];

// ─── Inner page (needs workspace context) ────────────────────────────────────

function IntegrationsContent() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const upsert = useUpsertIntegration();
  const disconnect = useDisconnectIntegration();

  const [dialogKey, setDialogKey] = useState<IntegrationKey | null>(null);

  const activeDef = dialogKey
    ? INTEGRATIONS.find((d) => d.key === dialogKey) ?? null
    : null;

  const recordFor = (key: IntegrationKey) =>
    integrations.find((r) => r.integration_key === key);

  const handleConnect = (key: IntegrationKey) => setDialogKey(key);

  const handleDisconnect = (key: IntegrationKey) => {
    disconnect.mutate(key, {
      onSuccess: () =>
        toast.success(
          `${INTEGRATIONS.find((d) => d.key === key)?.name} disconnected.`
        ),
      onError: (err) => toast.error(`Disconnect failed: ${err.message}`),
    });
  };

  const handleSave = (key: IntegrationKey, values: Record<string, string>) => {
    upsert.mutate(
      { integration_key: key, enabled: true, config: values },
      {
        onSuccess: () => {
          setDialogKey(null);
          toast.success(
            `${INTEGRATIONS.find((d) => d.key === key)?.name} connected!`
          );
        },
        onError: (err) => toast.error(`Connection failed: ${err.message}`),
      }
    );
  };

  const connectedCount = integrations.filter((r) => r.enabled).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your tools to power enrichment, outreach, and automation.
          {connectedCount > 0 && (
            <span className="ml-2 text-green-400">
              {connectedCount} of {INTEGRATIONS.length} connected
            </span>
          )}
        </p>
      </motion.div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((d) => (
            <Skeleton key={d.key} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((def, i) => (
            <motion.div
              key={def.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
            >
              <IntegrationCard
                def={def}
                record={recordFor(def.key)}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isDisconnecting={
                  disconnect.isPending &&
                  disconnect.variables === def.key
                }
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Connect dialog */}
      <ConnectDialog
        open={dialogKey !== null}
        def={activeDef}
        onClose={() => setDialogKey(null)}
        onSave={handleSave}
        isSaving={upsert.isPending}
      />
    </div>
  );
}

// ─── Public export (wraps with WorkspaceProvider) ────────────────────────────

export default function IntegrationsPage() {
  return (
    <WorkspaceProvider>
      <IntegrationsContent />
    </WorkspaceProvider>
  );
}
