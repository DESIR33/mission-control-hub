import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Search,
  Sparkles,
  Youtube,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Code2,
} from "lucide-react";
import type { Contact } from "@/types/crm";

interface EnrichmentDashboardProps {
  contact: Contact;
}

interface EnrichmentSourceConfig {
  key: "enrichment_hunter" | "enrichment_ai" | "enrichment_youtube";
  name: string;
  icon: typeof Search;
  iconColor: string;
  extractFields: (data: Record<string, unknown>) => { label: string; value: string }[];
}

const sources: EnrichmentSourceConfig[] = [
  {
    key: "enrichment_hunter",
    name: "Hunter",
    icon: Search,
    iconColor: "text-orange-500",
    extractFields: (data) => {
      const fields: { label: string; value: string }[] = [];
      if (data.email) fields.push({ label: "Email", value: String(data.email) });
      if (data.score != null) fields.push({ label: "Confidence Score", value: `${data.score}%` });
      if (data.confidence != null) fields.push({ label: "Confidence", value: `${data.confidence}%` });
      if (data.result) fields.push({ label: "Verification", value: String(data.result) });
      if (data.status) fields.push({ label: "Status", value: String(data.status) });
      if (data.type) fields.push({ label: "Email Type", value: String(data.type) });
      if (data.position) fields.push({ label: "Position", value: String(data.position) });
      if (data.company) fields.push({ label: "Company", value: String(data.company) });
      if (data.first_name) fields.push({ label: "First Name", value: String(data.first_name) });
      if (data.last_name) fields.push({ label: "Last Name", value: String(data.last_name) });
      if (data.domain) fields.push({ label: "Domain", value: String(data.domain) });
      if (data.twitter) fields.push({ label: "Twitter", value: String(data.twitter) });
      if (data.linkedin_url) fields.push({ label: "LinkedIn", value: String(data.linkedin_url) });
      if (data.phone_number) fields.push({ label: "Phone", value: String(data.phone_number) });
      if (data.verification?.status) fields.push({ label: "Verification Status", value: String(data.verification.status) });
      if ((data.sources as unknown[])?.length) fields.push({ label: "Sources Found", value: String((data.sources as unknown[]).length) });
      return fields;
    },
  },
  {
    key: "enrichment_ai",
    name: "AI Insights",
    icon: Sparkles,
    iconColor: "text-purple-500",
    extractFields: (data) => {
      const fields: { label: string; value: string }[] = [];
      if (data.summary) fields.push({ label: "Summary", value: String(data.summary) });
      if (data.industry) fields.push({ label: "Industry", value: String(data.industry) });
      if (data.interests) {
        const interests = Array.isArray(data.interests)
          ? (data.interests as string[]).join(", ")
          : String(data.interests);
        fields.push({ label: "Interests", value: interests });
      }
      if (data.bio) fields.push({ label: "Bio", value: String(data.bio) });
      if (data.topics) {
        const topics = Array.isArray(data.topics)
          ? (data.topics as string[]).join(", ")
          : String(data.topics);
        fields.push({ label: "Topics", value: topics });
      }
      if (data.sentiment) fields.push({ label: "Sentiment", value: String(data.sentiment) });
      if (data.keywords) {
        const keywords = Array.isArray(data.keywords)
          ? (data.keywords as string[]).join(", ")
          : String(data.keywords);
        fields.push({ label: "Keywords", value: keywords });
      }
      if (data.company_info) fields.push({ label: "Company Info", value: String(data.company_info) });
      if (data.role_description) fields.push({ label: "Role Description", value: String(data.role_description) });
      if (data.recommended_approach) fields.push({ label: "Recommended Approach", value: String(data.recommended_approach) });
      return fields;
    },
  },
  {
    key: "enrichment_youtube",
    name: "YouTube",
    icon: Youtube,
    iconColor: "text-red-500",
    extractFields: (data) => {
      const fields: { label: string; value: string }[] = [];
      if (data.channel_title || data.channelTitle) {
        fields.push({ label: "Channel", value: String(data.channel_title ?? data.channelTitle) });
      }
      if (data.subscriber_count != null || data.subscriberCount != null) {
        const count = data.subscriber_count ?? data.subscriberCount;
        fields.push({ label: "Subscribers", value: formatCount(Number(count)) });
      }
      if (data.video_count != null || data.videoCount != null) {
        const count = data.video_count ?? data.videoCount;
        fields.push({ label: "Videos", value: formatCount(Number(count)) });
      }
      if (data.view_count != null || data.viewCount != null) {
        const count = data.view_count ?? data.viewCount;
        fields.push({ label: "Total Views", value: formatCount(Number(count)) });
      }
      if (data.description) {
        const desc = String(data.description);
        fields.push({ label: "Description", value: desc.length > 200 ? desc.slice(0, 200) + "..." : desc });
      }
      if (data.channel_url || data.channelUrl || data.customUrl) {
        fields.push({ label: "Channel URL", value: String(data.channel_url ?? data.channelUrl ?? data.customUrl) });
      }
      if (data.country) fields.push({ label: "Country", value: String(data.country) });
      if (data.published_at || data.publishedAt) {
        fields.push({ label: "Joined", value: String(data.published_at ?? data.publishedAt) });
      }
      return fields;
    },
  },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function EnrichmentSourceCard({ source, data }: { source: EnrichmentSourceConfig; data: Record<string, unknown> | null }) {
  const [showRaw, setShowRaw] = useState(false);
  const hasData = data !== null && Object.keys(data).length > 0;
  const fields = hasData ? source.extractFields(data) : [];
  const Icon = source.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", source.iconColor)} />
            <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wider",
              hasData
                ? "bg-success/15 text-success border-success/30"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {hasData ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Enriched
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                No data
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {hasData && fields.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {fields.map((field, i) => (
              <div key={i}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </p>
                <p className="text-sm text-foreground break-words">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        {hasData && (
          <Collapsible open={showRaw} onOpenChange={setShowRaw} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground px-2 w-full justify-start"
              >
                <Code2 className="w-3 h-3 mr-1" />
                Raw data
                <ChevronDown
                  className={cn(
                    "w-3 h-3 ml-auto transition-transform",
                    showRaw && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-48 font-mono mt-1">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {!hasData && (
          <p className="text-xs text-muted-foreground mt-2">
            No enrichment data available from {source.name}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function EnrichmentDashboard({ contact }: EnrichmentDashboardProps) {
  const enrichedCount = sources.filter((s) => {
    const data = contact[s.key];
    return data !== null && Object.keys(data).length > 0;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Enrichment Dashboard
        </h4>
        <Badge variant="outline" className="text-[10px]">
          {enrichedCount}/{sources.length} sources
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sources.map((source) => (
          <EnrichmentSourceCard
            key={source.key}
            source={source}
            data={contact[source.key]}
          />
        ))}
      </div>
    </div>
  );
}
