import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Webhook, ScrollText, Loader2 } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";

const q = (table: string) => (supabase as any).from(table);

const EVENT_TYPES = [
  "memory.created",
  "memory.updated",
  "memory.deleted",
  "memory.merged",
  "memory.reflected",
  "*",
];

interface WebhookConfig {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  created_at: string;
}

interface MemoryEvent {
  id: string;
  event_type: string;
  delivery_status: string;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function WebhookConfigTab() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);

  const { data: webhooks = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["webhook-configs", workspaceId],
    queryFn: async () => {
      const { data, error } = await q("memory_webhook_config")
        .select("id, workspace_id, name, url, event_types, is_active, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const { data: events = [] } = useQuery<MemoryEvent[]>({
    queryKey: ["memory-events", workspaceId],
    queryFn: async () => {
      const { data, error } = await q("memory_events")
        .select("id, event_type, delivery_status, delivered_at, error_message, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const createWebhook = useMutation({
    mutationFn: async () => {
      const secret = crypto.randomUUID();
      const { error } = await q("memory_webhook_config").insert({
        workspace_id: workspaceId,
        name,
        url,
        event_types: selectedEvents,
        secret,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-configs", workspaceId] });
      setDialogOpen(false);
      setName("");
      setUrl("");
      setSelectedEvents(["*"]);
      toast({ title: "Webhook created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await q("memory_webhook_config")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-configs", workspaceId] }),
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await q("memory_webhook_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-configs", workspaceId] });
      toast({ title: "Webhook deleted" });
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const statusColors: Record<string, string> = {
    delivered: "bg-green-500/10 text-green-700",
    pending: "bg-amber-500/10 text-amber-700",
    failed: "bg-red-500/10 text-red-700",
  };

  return (
    <Tabs defaultValue="config" className="space-y-4">
      <TabsList>
        <TabsTrigger value="config" className="gap-1.5">
          <Webhook className="h-3.5 w-3.5" /> Webhooks
        </TabsTrigger>
        <TabsTrigger value="events" className="gap-1.5">
          <ScrollText className="h-3.5 w-3.5" /> Event Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Webhook
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12">
            <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
          </div>
        ) : (
          webhooks.map((wh) => (
            <Card key={wh.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium">{wh.name}</h3>
                    <Badge variant={wh.is_active ? "default" : "secondary"} className="text-[10px] h-4">
                      {wh.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                  <div className="flex gap-1 mt-1">
                    {wh.event_types.map((et) => (
                      <Badge key={et} variant="outline" className="text-[10px] h-4">{et}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Switch
                    checked={wh.is_active}
                    onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteWebhook.mutate(wh.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="events" className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border text-sm">
                <Badge variant="outline" className="text-[10px] h-4 shrink-0">{ev.event_type}</Badge>
                <Badge className={`text-[10px] h-4 ${statusColors[ev.delivery_status] || ""}`}>
                  {ev.delivery_status}
                </Badge>
                {ev.error_message && (
                  <span className="text-xs text-destructive truncate flex-1">{ev.error_message}</span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                  {safeFormat(ev.created_at, "MMM d HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My webhook" />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Event Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map((et) => (
                  <label key={et} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedEvents.includes(et)}
                      onCheckedChange={() => toggleEvent(et)}
                    />
                    {et}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createWebhook.mutate()}
              disabled={!name.trim() || !url.trim() || selectedEvents.length === 0 || createWebhook.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
