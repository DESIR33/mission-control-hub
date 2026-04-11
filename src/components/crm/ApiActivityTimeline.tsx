import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

export type TimelineType =
  | "email_sent"
  | "email_received"
  | "task_completed"
  | "note_added"
  | "deal_stage_changed"
  | "meeting_logged";

interface TimelineEvent {
  type: TimelineType;
  occurredAt: string;
  actor: { id?: number | null; name: string };
  summary: string;
  entityRef: { entityType: "contact" | "company"; entityId: number };
  sourceRef: { sourceType: string; sourceId: string | number };
}

interface TimelineResponse {
  data: TimelineEvent[];
  pageInfo: { hasMore: boolean; nextCursor: string | null; limit: number };
}

const EVENT_TYPE_OPTIONS: TimelineType[] = [
  "email_sent",
  "email_received",
  "task_completed",
  "note_added",
  "deal_stage_changed",
  "meeting_logged",
];

const LABELS: Record<TimelineType, string> = {
  email_sent: "Email Sent",
  email_received: "Email Received",
  task_completed: "Task Completed",
  note_added: "Note Added",
  deal_stage_changed: "Deal Stage Changed",
  meeting_logged: "Meeting Logged",
};

export function ActivityTimeline({ entityType, entityId }: { entityType: "contact" | "company"; entityId: number }) {
  const [selectedTypes, setSelectedTypes] = useState<TimelineType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [before, setBefore] = useState<string | undefined>(undefined);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedTypes.length) params.set("types", selectedTypes.join(","));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (before) params.set("before", before);
    params.set("limit", "25");
    return params.toString();
  }, [selectedTypes, startDate, endDate, before]);

  const { data, isLoading, isFetching, refetch } = useQuery<TimelineResponse>({
    queryKey: ["activity-timeline", entityType, entityId, queryString],
    queryFn: async () => {
      const res = await fetch(`/api/${entityType === "contact" ? "contacts" : "companies"}/${entityId}/activity-timeline?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch activity timeline");
      return res.json();
    },
    enabled: !!entityId,
  });

  const events = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={selectedTypes.length === 1 ? selectedTypes[0] : "all"}
            onValueChange={(v) => {
              setBefore(undefined);
              setSelectedTypes(v === "all" ? [] : [v as TimelineType]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All event types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {EVENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>{LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={startDate} onChange={(e) => { setBefore(undefined); setStartDate(e.target.value); }} />
          <Input type="date" value={endDate} onChange={(e) => { setBefore(undefined); setEndDate(e.target.value); }} />
          <Button variant="outline" onClick={() => { setBefore(undefined); refetch(); }} disabled={isFetching}>Refresh</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading timeline…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity found for the selected filters.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={`${event.sourceRef.sourceType}-${event.sourceRef.sourceId}-${event.occurredAt}`} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{LABELS[event.type]}</p>
                  <p className="text-xs text-muted-foreground">{safeFormatDistanceToNow(event.occurredAt, { addSuffix: true })}</p>
                </div>
                <p className="mt-1 text-sm">{event.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">By {event.actor.name}</p>
              </div>
            ))}
          </div>
        )}

        {data?.pageInfo?.hasMore && data.pageInfo.nextCursor && (
          <Button variant="outline" onClick={() => setBefore(data.pageInfo.nextCursor || undefined)} disabled={isFetching}>
            Load older activity
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
