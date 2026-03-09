import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SparklesIcon, Loader2Icon, CopyIcon } from "lucide-react";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { toast } from "sonner";

interface SnippetsWithVariablesProps {
  onInsert: (text: string) => void;
}

export function SnippetsWithVariables({ onInsert }: SnippetsWithVariablesProps) {
  const { data: templates = [] } = useEmailTemplates();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [preview, setPreview] = useState("");

  const fillVariables = (template: string, contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    const deal = deals.find((d) => d.contact_id === contactId);

    let filled = template;
    if (contact) {
      filled = filled
        .replace(/\{\{first_name\}\}/gi, contact.first_name || "")
        .replace(/\{\{last_name\}\}/gi, contact.last_name || "")
        .replace(/\{\{email\}\}/gi, contact.email || "")
        .replace(/\{\{company\}\}/gi, "")
        .replace(/\{\{phone\}\}/gi, contact.phone || "");
    }
    if (deal) {
      filled = filled
        .replace(/\{\{deal_title\}\}/gi, deal.title || "")
        .replace(/\{\{deal_value\}\}/gi, deal.value?.toString() || "")
        .replace(/\{\{deal_stage\}\}/gi, deal.stage || "");
    }
    // Clean any remaining variables
    filled = filled.replace(/\{\{[^}]+\}\}/g, "___");
    return filled;
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      const filled = selectedContact
        ? fillVariables(tpl.body_template, selectedContact)
        : tpl.body_template;
      setPreview(filled);
    }
  };

  const handleContactChange = (id: string) => {
    setSelectedContact(id);
    const tpl = templates.find((t) => t.id === selectedTemplate);
    if (tpl) {
      setPreview(fillVariables(tpl.body_template, id));
    }
  };

  if (templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs">Snippet</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Choose template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs">Auto-fill from</Label>
          <Select value={selectedContact} onValueChange={handleContactChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select contact..." />
            </SelectTrigger>
            <SelectContent>
              {contacts.slice(0, 50).map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.first_name} {c.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {preview && (
        <div className="relative">
          <p className="text-xs bg-muted rounded-md p-2 whitespace-pre-wrap">{preview}</p>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={() => {
              onInsert(preview);
              toast.success("Snippet inserted");
            }}
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
