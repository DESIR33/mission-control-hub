import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Copy, Trash2, ShieldOff, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from "@/hooks/use-api-keys";
import { format } from "date-fns";

export function ApiKeysSection() {
  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();

  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const raw = await createKey.mutateAsync({ name: newKeyName.trim() });
    setCreatedKey(raw);
    setNewKeyName("");
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeCreatedDialog = () => {
    setCreatedKey(null);
    setDialogOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Keys
              </CardTitle>
              <CardDescription className="mt-1">
                Generate keys for external AI tools (ChatGPT, Claude, Cursor) to write memories into your system.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                {createdKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Copy Your API Key
                      </DialogTitle>
                      <DialogDescription>
                        This key will only be shown once. Store it securely — you won't be able to see it again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="my-4">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono break-all select-all">
                          {createdKey}
                        </code>
                        <Button size="icon" variant="outline" onClick={copyKey}>
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={closeCreatedDialog}>Done</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Give your key a descriptive name (e.g. "Claude Desktop", "Cursor IDE").
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                      <div>
                        <Label>Key Name</Label>
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g. ChatGPT Actions"
                          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreate} disabled={!newKeyName.trim() || createKey.isPending}>
                        {createKey.isPending ? "Creating..." : "Create Key"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading keys…</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No API keys yet. Create one to start ingesting memories from external tools.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{k.name}</span>
                      {k.is_active ? (
                        <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Revoked</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <code>{k.key_prefix}</code>
                      <span>Created {format(new Date(k.created_at), "MMM d, yyyy")}</span>
                      {k.last_used_at && (
                        <span>Last used {format(new Date(k.last_used_at), "MMM d")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {k.is_active && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-yellow-600"
                        onClick={() => revokeKey.mutate(k.id)}
                        title="Revoke key"
                      >
                        <ShieldOff className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the key "{k.name}". Any integrations using it will stop working.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteKey.mutate(k.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* MCP Server Setup */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">🔌 MCP Server (Claude Code, Cursor)</h4>
            <p className="text-xs text-muted-foreground">
              Connect your AI coding tools directly to your memory system via MCP. Add this to your MCP config:
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Claude Code (~/.claude/claude_desktop_config.json):</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-foreground/80">
{`{
  "mcpServers": {
    "mch-memory": {
      "type": "streamable-http",
      "url": "https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/mcp-memory-server/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
              </pre>
            </div>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Available tools:</p>
              <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                <li><code className="bg-background/50 px-1 rounded">search_memory</code> — Hybrid vector + full-text search</li>
                <li><code className="bg-background/50 px-1 rounded">save_memory</code> — Save with auto-embedding &amp; dedup</li>
                <li><code className="bg-background/50 px-1 rounded">get_recent_memories</code> — Latest memories by date</li>
                <li><code className="bg-background/50 px-1 rounded">save_daily_log</code> — Add to today's daily log</li>
              </ul>
            </div>
          </div>

          <Separator className="my-4" />

          {/* REST API */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">📡 REST API (ChatGPT, Webhooks)</h4>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Send memories from any tool:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-foreground/80">
{`curl -X POST \\
  https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/memory-ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode UI",
    "source_agent": "chatgpt",
    "tags": ["preference", "ui"],
    "memory_type": "preference"
  }'`}
              </pre>
            </div>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Batch ingestion (up to 50):</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-foreground/80">
{`{
  "memories": [
    { "content": "Project uses React 18", "source_agent": "cursor", "tags": ["tech"] },
    { "content": "Brand color is #6366f1", "source_agent": "claude", "tags": ["brand"] }
  ]
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
