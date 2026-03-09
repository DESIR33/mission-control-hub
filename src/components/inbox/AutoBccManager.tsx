import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useAutoBccRules, useCreateAutoBccRule, useDeleteAutoBccRule } from "@/hooks/use-auto-bcc";

export function AutoBccManager() {
  const { data: rules = [] } = useAutoBccRules();
  const createRule = useCreateAutoBccRule();
  const deleteRule = useDeleteAutoBccRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bccEmail, setBccEmail] = useState("");
  const [conditionType, setConditionType] = useState("always");
  const [conditionValue, setConditionValue] = useState("");

  const handleCreate = () => {
    if (!bccEmail.trim()) return;
    createRule.mutate({
      bcc_email: bccEmail,
      condition_type: conditionType,
      condition_value: conditionValue || undefined,
    }, { onSuccess: () => { setDialogOpen(false); setBccEmail(""); setConditionValue(""); } });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CopyIcon className="h-4 w-4 text-primary" />
            Auto BCC Rules
          </CardTitle>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setDialogOpen(true)}>
            <PlusIcon className="h-3 w-3" /> Add Rule
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Automatically BCC addresses on outgoing emails</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No auto-BCC rules configured</p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{rule.bcc_email}</p>
              <p className="text-[10px] text-muted-foreground">
                {rule.condition_type === "always" ? "All outgoing emails" :
                 rule.condition_type === "label" ? `When label: ${rule.condition_value}` :
                 rule.condition_type === "contact_tier" ? `Contact tier: ${rule.condition_value}` : rule.condition_type}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
              <Trash2Icon className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add Auto BCC Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="BCC email address" value={bccEmail} onChange={(e) => setBccEmail(e.target.value)} />
            <Select value={conditionType} onValueChange={setConditionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="always">All outgoing emails</SelectItem>
                <SelectItem value="label">When label matches</SelectItem>
                <SelectItem value="contact_tier">When contact tier is</SelectItem>
              </SelectContent>
            </Select>
            {conditionType !== "always" && (
              <Input placeholder="Condition value..." value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRule.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
