import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarIcon, Loader2Icon, CopyIcon, CheckIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface ShareAvailabilityButtonProps {
  onInsert: (text: string) => void;
}

export function ShareAvailabilityButton({ onInsert }: ShareAvailabilityButtonProps) {
  const { workspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("outlook-calendar-availability", {
        body: { workspace_id: workspaceId, days: 5 },
      });
      if (error) throw error;
      setSlots(data?.slots || generateFallbackSlots());
    } catch {
      // Fallback to generated slots
      setSlots(generateFallbackSlots());
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackSlots = () => {
    const slots: string[] = [];
    const now = new Date();
    for (let d = 1; d <= 5; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      slots.push(`• ${dateStr} at 10:00 AM`);
      slots.push(`• ${dateStr} at 2:00 PM`);
    }
    return slots.slice(0, 6);
  };

  const handleInsert = () => {
    const text = `I'm available at the following times:\n\n${slots.join("\n")}\n\nLet me know what works best for you!`;
    onInsert(text);
    setOpen(false);
    toast.success("Availability inserted");
  };

  const handleCopy = () => {
    const text = slots.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs gap-1.5"
        onClick={() => { setOpen(true); fetchAvailability(); }}
      >
        <CalendarIcon className="h-3 w-3" />
        Share Availability
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Share Availability
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
                {slots.map((slot, i) => (
                  <p key={i} className="text-sm text-foreground">{slot}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" onClick={handleInsert} disabled={loading} className="gap-1.5">
              Insert in Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
