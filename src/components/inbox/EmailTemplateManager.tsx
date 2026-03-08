import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Copy } from "lucide-react";
import { useEmailTemplates, useCreateEmailTemplate, useDeleteEmailTemplate } from "@/hooks/use-email-templates";
import { toast } from "sonner";

interface EmailTemplateManagerProps {
  onUseTemplate?: (subject: string, body: string) => void;
}

const CATEGORIES = ["sponsor_outreach", "follow_up", "rate_negotiation", "thank_you", "general"];

export function EmailTemplateManager({ onUseTemplate }: EmailTemplateManagerProps) {
  const { data: templates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createTemplate.mutate(
      { name, category, subject_template: subject, body_template: body, variables: [] },
      { onSuccess: () => { setShowCreate(false); setName(""); setSubject(""); setBody(""); } }
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Smart Templates
            </span>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No templates yet. Create one to speed up replies.</p>
          ) : (
            templates.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    {t.category.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {onUseTemplate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onUseTemplate(t.subject_template, t.body_template);
                        toast.success("Template applied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Email Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Subject template (use {{variable}})" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Body template..." value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
            <p className="text-xs text-muted-foreground">Use {"{{contact_name}}"}, {"{{company}}"}, {"{{channel_stats}}"} as variables</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
