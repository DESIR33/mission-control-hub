import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMaskedConfig, type IntegrationKey } from "@/hooks/use-integrations";
import type { IntegrationDef, FieldDef } from "@/pages/IntegrationsPage";

interface ConnectDialogProps {
  open: boolean;
  def: IntegrationDef | null;
  isUpdate?: boolean;
  onClose: () => void;
  onSave: (key: IntegrationKey, values: Record<string, string>) => void;
  isSaving: boolean;
}

function SecretInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9 text-sm"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function ConnectDialog({
  open,
  def,
  isUpdate,
  onClose,
  onSave,
  isSaving,
}: ConnectDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Fetch masked config for pre-fill when updating
  const { data: maskedData } = useMaskedConfig(open && isUpdate && def ? def.key : null);

  // Pre-fill non-secret values when updating
  useEffect(() => {
    if (isUpdate && maskedData && def) {
      const prefill: Record<string, string> = {};
      for (const field of def.fields) {
        if (!field.secret && maskedData.raw_non_secret[field.name]) {
          prefill[field.name] = maskedData.raw_non_secret[field.name];
        }
      }
      setValues(prefill);
    }
  }, [maskedData, isUpdate, def]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setValues({});
      setTouched(new Set());
      onClose();
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => new Set(prev).add(name));
  };

  const handleSave = () => {
    if (!def) return;
    onSave(def.key, values);
  };

  const allRequired = def?.fields
    .filter((f: FieldDef) => f.required !== false)
    .every((f: FieldDef) => {
      // When updating, secret fields that haven't been touched are OK (keeping existing value)
      if (isUpdate && f.secret && !touched.has(f.name)) return true;
      return (values[f.name] ?? "").trim().length > 0;
    });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {def && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
                  style={{ background: def.iconBg }}
                >
                  {def.icon}
                </div>
                <div>
                  <DialogTitle className="text-sm">
                    {isUpdate ? `Update ${def.name}` : `Connect ${def.name}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {isUpdate
                      ? "Update your credentials. Leave secret fields empty to keep existing values."
                      : def.connectHint ?? "Enter your credentials to connect."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {def.fields.map((field: FieldDef) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    {field.label}
                    {field.required !== false && !isUpdate && (
                      <span className="text-destructive ml-0.5">*</span>
                    )}
                  </Label>
                  {field.secret ? (
                    <SecretInput
                      id={field.name}
                      placeholder={
                        isUpdate && maskedData?.masked_config[field.name]
                          ? maskedData.masked_config[field.name]
                          : field.placeholder
                      }
                      value={values[field.name] ?? ""}
                      onChange={(v) => handleFieldChange(field.name, v)}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type="text"
                      placeholder={field.placeholder}
                      value={values[field.name] ?? ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="text-sm"
                      autoComplete="off"
                    />
                  )}
                  {field.hint && (
                    <p className="text-xs text-muted-foreground">{field.hint}</p>
                  )}
                </div>
              ))}

              {def.warningNote && (
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-md px-3 py-2">
                  {def.warningNote}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !allRequired} className="text-xs">
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    Saving…
                  </>
                ) : isUpdate ? (
                  "Update"
                ) : (
                  "Save & Connect"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
