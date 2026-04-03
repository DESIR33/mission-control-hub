import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useTokenHealth } from "@/hooks/use-token-health";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useIntegrations,
  useUpsertIntegration,
  useDisconnectIntegration,
  type IntegrationKey,
} from "@/hooks/use-integrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ConnectDialog } from "@/components/integrations/ConnectDialog";
import { Skeleton } from "@/components/ui/skeleton";

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
  icon: string;
  iconBg: string;
  docsUrl?: string;
  usedFor?: string;
  connectHint?: string;
  warningNote?: string;
  fields: FieldDef[];
}

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
      "Monitor trending topics in AI, SaaS, and agents. Discover new tools, track competitor accounts, auto-generate content ideas from trends, and pull contact social data.",
    icon: "𝕏",
    iconBg: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)",
    docsUrl: "https://developer.twitter.com/en/docs",
    usedFor: "Used for: trend monitoring · competitor tracking · content ideation · contact social data · engagement",
    connectHint:
      "Provide your Twitter Developer app credentials. Optionally add List IDs and search queries for automated monitoring.",
    warningNote:
      "Elevated or Pro API access may be required for search and trend endpoints. Basic access supports tweet lookup and user data only.",
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
      {
        name: "list_ids",
        label: "List IDs for Monitoring",
        placeholder: "123456789,987654321",
        required: false,
        hint: "Comma-separated X List IDs to monitor for trends and competitor activity.",
      },
      {
        name: "search_queries",
        label: "Search Queries",
        placeholder: "AI agents,SaaS tools,#buildinpublic",
        required: false,
        hint: "Comma-separated search terms for automated trend monitoring.",
      },
    ],
  },
  {
    key: "youtube",
    name: "YouTube",
    description:
      "Pull channel stats, video analytics, demographics, traffic sources, and revenue data.",
    icon: "▶",
    iconBg: "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)",
    docsUrl: "https://developers.google.com/youtube/v3",
    usedFor: "Used for: channel analytics · video stats · subscriber growth · audience demographics · revenue",
    connectHint:
      "Enter your YouTube Data API key and channel ID for basic stats. For full analytics (demographics, traffic, revenue), add OAuth2 credentials.",
    warningNote:
      "Required Google Cloud APIs: YouTube Data API v3 + YouTube Analytics API. OAuth scopes needed: yt-analytics.readonly, yt-analytics-monetary.readonly, youtube.readonly, youtube.force-ssl (for video updates).",
    fields: [
      {
        name: "api_key",
        label: "YouTube Data API Key",
        placeholder: "AIza…",
        secret: true,
        required: true,
        hint: "Google Cloud Console → APIs & Services → Credentials → API Key. Enable 'YouTube Data API v3'.",
      },
      {
        name: "channel_id",
        label: "Channel ID",
        placeholder: "UC…",
        required: true,
        hint: "Your YouTube channel ID (starts with UC). Find it at youtube.com → Settings → Advanced settings, or youtube.com/account_advanced.",
      },
      {
        name: "client_id",
        label: "OAuth Client ID (for Analytics + Revenue)",
        placeholder: "123456789.apps.googleusercontent.com",
        secret: false,
        required: false,
        hint: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID. Use 'Web application' type.",
      },
      {
        name: "client_secret",
        label: "OAuth Client Secret",
        placeholder: "GOCSPX-…",
        secret: true,
        required: false,
        hint: "The client secret for your OAuth 2.0 app.",
      },
      {
        name: "refresh_token",
        label: "OAuth Refresh Token",
        placeholder: "1//0…",
        secret: true,
        required: false,
        hint: "Generate at developers.google.com/oauthplayground — select ALL 4 scopes: yt-analytics.readonly, yt-analytics-monetary.readonly, youtube.readonly, youtube.force-ssl. Use your own OAuth credentials (gear icon → 'Use your own OAuth credentials').",
      },
    ],
  },
  {
    key: "beehiiv",
    name: "Beehiiv",
    description:
      "Sync your Beehiiv newsletter subscribers and track email growth alongside YouTube.",
    icon: "🐝",
    iconBg: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    docsUrl: "https://developers.beehiiv.com",
    usedFor: "Used for: newsletter management · subscriber analytics · email growth",
    connectHint:
      "Provide your Beehiiv API key and publication ID to connect.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        placeholder: "Your Beehiiv API key",
        secret: true,
        required: true,
        hint: "Found at Beehiiv → Settings → Integrations → API.",
      },
      {
        name: "publication_id",
        label: "Publication ID",
        placeholder: "pub_xxxxxxxx",
        required: true,
        hint: "Found in your Beehiiv dashboard URL or settings.",
      },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    description:
      "Send transactional emails for brand outreach, follow-ups, and notifications.",
    icon: "✉️",
    iconBg: "linear-gradient(135deg, #000000 0%, #333333 100%)",
    docsUrl: "https://resend.com/docs",
    usedFor: "Used for: brand deal outreach · follow-up emails · notifications",
    connectHint:
      "Paste your Resend API key and configure your sending email address.",
    fields: [
      {
        name: "api_key",
        label: "Resend API Key",
        placeholder: "re_••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "Found at resend.com → API Keys.",
      },
      {
        name: "from_email",
        label: "From Email",
        placeholder: "you@yourdomain.com",
        required: true,
        hint: "The verified email/domain you want to send from.",
      },
    ],
  },
  {
    key: "slack",
    name: "Slack",
    description:
      "Bidirectional communication with the AI agent. Send commands, receive alerts, get daily briefings, and approve agent actions directly from Slack.",
    icon: "💬",
    iconBg: "linear-gradient(135deg, #4a154b 0%, #611f69 100%)",
    docsUrl: "https://api.slack.com/docs",
    usedFor: "Used for: agent commands · alerts · daily briefings · action approvals",
    connectHint:
      "Create a Slack app at api.slack.com/apps, install it to your workspace, and paste the bot token and signing secret.",
    warningNote:
      "Bot must be invited to the default channel. Required OAuth scopes: chat:write, channels:read, commands, app_mentions:read.",
    fields: [
      {
        name: "bot_token",
        label: "Bot Token",
        placeholder: "xoxb-••••••••••••",
        secret: true,
        required: true,
        hint: "Slack App → OAuth & Permissions → Bot User OAuth Token (starts with xoxb-).",
      },
      {
        name: "signing_secret",
        label: "Signing Secret",
        placeholder: "Your signing secret",
        secret: true,
        required: true,
        hint: "Slack App → Basic Information → App Credentials → Signing Secret.",
      },
      {
        name: "default_channel_id",
        label: "Default Channel ID",
        placeholder: "C01ABCDEFGH",
        required: true,
        hint: "Right-click the channel in Slack → View channel details → copy the Channel ID at the bottom.",
      },
    ],
  },
  {
    key: "notion",
    name: "Notion",
    description:
      "Persistent memory and knowledge base for AI agents. Transfer context between Mission Control Hub, Claude Code, and other AI tools. Maintain continuity across sessions.",
    icon: "📝",
    iconBg: "linear-gradient(135deg, #000000 0%, #191919 100%)",
    docsUrl: "https://developers.notion.com",
    usedFor: "Used for: agent memory · knowledge base · cross-tool context · session continuity",
    connectHint:
      "Create an internal integration at notion.so/my-integrations, then share your target database with it.",
    warningNote:
      "The integration must be explicitly shared with each Notion page or database it needs to access.",
    fields: [
      {
        name: "integration_token",
        label: "Integration Token",
        placeholder: "ntn_••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "Notion → Settings → My Integrations → your integration → Internal Integration Secret.",
      },
      {
        name: "default_database_id",
        label: "Default Database ID",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        required: true,
        hint: "Open your Notion database as a full page — the 32-character hex string in the URL is the database ID.",
      },
      {
        name: "workspace_name",
        label: "Workspace Name",
        placeholder: "My Workspace",
        required: false,
        hint: "Optional label to identify which Notion workspace this connects to.",
      },
    ],
  },
  {
    key: "github",
    name: "GitHub",
    description:
      "Bridge to Claude Code and Claude Cowork. Sync repos, issues, and PRs. AI agent can track development progress, create issues from the hub, and read code context.",
    icon: "🐙",
    iconBg: "linear-gradient(135deg, #24292e 0%, #1b1f23 100%)",
    docsUrl: "https://docs.github.com/en/rest",
    usedFor: "Used for: repo sync · issue tracking · PR monitoring · Claude Code bridge · dev context",
    connectHint:
      "Generate a Personal Access Token (classic or fine-grained) at github.com/settings/tokens.",
    warningNote:
      "For fine-grained tokens, grant access to specific repositories only. Required permissions: Contents (read), Issues (read/write), Pull requests (read).",
    fields: [
      {
        name: "personal_access_token",
        label: "Personal Access Token",
        placeholder: "ghp_••••••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "GitHub → Settings → Developer settings → Personal access tokens → Generate new token.",
      },
      {
        name: "default_repo",
        label: "Default Repository",
        placeholder: "owner/repo",
        required: false,
        hint: "Optional — format: owner/repo (e.g. acme/mission-control). Used as the default for issue creation and code lookups.",
      },
    ],
  },
  {
    key: "perplexity",
    name: "Perplexity API",
    description:
      "AI-powered deep research. Agent uses it to research sponsors, competitors, market trends, and content ideas with structured, sourced analysis.",
    icon: "🔍",
    iconBg: "linear-gradient(135deg, #20b8cd 0%, #1a9aaf 100%)",
    docsUrl: "https://docs.perplexity.ai",
    usedFor: "Used for: sponsor research · competitor analysis · market trends · content ideation",
    connectHint:
      "Get your API key from the Perplexity developer dashboard.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        placeholder: "pplx-••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "Found at perplexity.ai → Settings → API → API Keys.",
      },
    ],
  },
  {
    key: "stripe",
    name: "Stripe",
    description:
      "Track payments, subscriptions, and revenue from digital products. Revenue analytics and real-time payment notifications.",
    icon: "💳",
    iconBg: "linear-gradient(135deg, #635bff 0%, #4b45c6 100%)",
    docsUrl: "https://stripe.com/docs/api",
    usedFor: "Used for: payment tracking · subscription analytics · revenue dashboards · payment notifications",
    connectHint:
      "Find your API keys in the Stripe Dashboard under Developers → API keys.",
    warningNote:
      "Use restricted keys in production with only the permissions you need. Never use your full secret key in client-side code.",
    fields: [
      {
        name: "secret_key",
        label: "Secret Key",
        placeholder: "sk_live_••••••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "Stripe Dashboard → Developers → API keys → Secret key. Use sk_test_ for testing.",
      },
      {
        name: "publishable_key",
        label: "Publishable Key",
        placeholder: "pk_live_••••••••••••••••••••••••••••••••",
        required: true,
        hint: "Stripe Dashboard → Developers → API keys → Publishable key.",
      },
      {
        name: "webhook_secret",
        label: "Webhook Secret",
        placeholder: "whsec_••••••••••••••••••••••••••••••••",
        secret: true,
        required: false,
        hint: "Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.",
      },
    ],
  },
  {
    key: "paypal",
    name: "PayPal",
    description:
      "Track PayPal payments and invoices. Covers revenue streams that don't go through Stripe for complete revenue visibility.",
    icon: "🅿️",
    iconBg: "linear-gradient(135deg, #003087 0%, #001f5c 100%)",
    docsUrl: "https://developer.paypal.com/docs/api/overview",
    usedFor: "Used for: payment tracking · invoice management · revenue analytics",
    connectHint:
      "Create a REST API app at developer.paypal.com to get your Client ID and Secret.",
    fields: [
      {
        name: "client_id",
        label: "Client ID",
        placeholder: "Your PayPal Client ID",
        required: true,
        hint: "PayPal Developer Dashboard → My Apps & Credentials → your app → Client ID.",
      },
      {
        name: "client_secret",
        label: "Client Secret",
        placeholder: "Your PayPal Client Secret",
        secret: true,
        required: true,
        hint: "PayPal Developer Dashboard → My Apps & Credentials → your app → Secret.",
      },
      {
        name: "environment",
        label: "Environment",
        placeholder: "sandbox or live",
        required: false,
        hint: "Enter 'sandbox' for testing or 'live' for production. Defaults to live if left blank.",
      },
    ],
  },
  {
    key: "n8n",
    name: "n8n",
    description:
      "Self-hosted workflow automation engine. Orchestrate cross-platform workflows: video publish → auto-post to X + Slack alert + Notion update + newsletter trigger. Schedule AI agent runs, automate sponsor outreach pipelines, reconcile Stripe/PayPal revenue, monitor YouTube comments for content ideas, and generate daily briefings from all connected data sources.",
    icon: "⚡",
    iconBg: "linear-gradient(135deg, #ea4b71 0%, #d6336c 100%)",
    docsUrl: "https://docs.n8n.io",
    usedFor: "Used for: workflow automation · video publish distribution · sponsor pipeline orchestration · revenue reconciliation · AI agent scheduling · daily briefings · comment-to-content pipeline · competitor monitoring · collaboration follow-ups · A/B test alerts",
    connectHint:
      "Provide your n8n instance URL and API key. Optionally configure a webhook URL for Mission Control to trigger workflows directly, and tag workflows for easier management.",
    warningNote:
      "Your n8n instance must be accessible from this application. For self-hosted instances, ensure the URL is reachable and CORS is configured. Webhook workflows require the n8n webhook node to be active.",
    fields: [
      {
        name: "instance_url",
        label: "Instance URL",
        placeholder: "https://your-n8n.example.com",
        required: true,
        hint: "The base URL of your n8n instance (e.g. https://n8n.yourdomain.com or http://localhost:5678).",
      },
      {
        name: "api_key",
        label: "API Key",
        placeholder: "n8n_api_••••••••••••••••••••••••••••",
        secret: true,
        required: true,
        hint: "n8n → Settings → API → Create an API key.",
      },
      {
        name: "webhook_base_url",
        label: "Webhook Base URL",
        placeholder: "https://your-n8n.example.com/webhook",
        required: false,
        hint: "Base URL for triggering n8n webhook workflows from Mission Control (e.g. on video publish, deal stage change, agent action).",
      },
      {
        name: "workflow_tags",
        label: "Workflow Tags",
        placeholder: "mission-control,youtube,sponsors",
        required: false,
        hint: "Comma-separated tags to filter which n8n workflows Mission Control can see and trigger. Keeps your dashboard focused.",
      },
    ],
  },
];

/** Shared content used by Settings > Integrations tab AND standalone page */
export function IntegrationsContent() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const upsert = useUpsertIntegration();
  const disconnect = useDisconnectIntegration();

  const [dialogKey, setDialogKey] = useState<IntegrationKey | null>(null);

  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const { data: tokenHealthRecords = [] } = useTokenHealth();
  const [checkingHealth, setCheckingHealth] = useState(false);

  const activeDef = dialogKey
    ? INTEGRATIONS.find((d) => d.key === dialogKey) ?? null
    : null;

  const recordFor = (key: IntegrationKey) =>
    integrations.find((r) => r.integration_key === key);

  const tokenHealthFor = (key: string) =>
    tokenHealthRecords.find((t) => t.integration_key === key);

  const handleHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      await supabase.functions.invoke("youtube-token-health", {
        body: { workspace_id: workspaceId },
      });
      qc.invalidateQueries({ queryKey: ["integration_token_health"] });
      toast.success("Token health check complete");
    } catch {
      toast.error("Health check failed");
    } finally {
      setCheckingHealth(false);
    }
  };

  const isUpdateMode = dialogKey ? !!recordFor(dialogKey)?.enabled : false;

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
    // Auto-set redirect_uri for Outlook OAuth
    const config = key === "ms_outlook"
      ? { ...values, redirect_uri: `${window.location.origin}/auth/outlook/callback` }
      : values;

    upsert.mutate(
      { integration_key: key, enabled: true, config },
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Connect your tools to power enrichment, outreach, and automation.
          {connectedCount > 0 && (
            <span className="ml-2 text-green-400">
              {connectedCount} of {INTEGRATIONS.length} connected
            </span>
          )}
        </p>
      </div>

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

      <ConnectDialog
        open={dialogKey !== null}
        def={activeDef}
        isUpdate={isUpdateMode}
        onClose={() => setDialogKey(null)}
        onSave={handleSave}
        isSaving={upsert.isPending}
      />
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        </div>
      </motion.div>

      <IntegrationsContent />
    </div>
  );
}

