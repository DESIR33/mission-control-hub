import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClockIcon } from "lucide-react";
import { useSnoozeEmail, getSnoozeOptions } from "@/hooks/use-snooze";
import { toast } from "sonner";

interface SnoozeMenuProps {
  emailId: string;
  variant?: "ghost" | "outline";
  size?: "sm" | "default" | "icon";
}

export function SnoozeMenu({ emailId, variant = "ghost", size = "sm" }: SnoozeMenuProps) {
  const snooze = useSnoozeEmail();
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const options = getSnoozeOptions();

  const handleSnooze = (until: Date) => {
    snooze.mutate(
      { id: emailId, snoozed_until: until.toISOString() },
      {
        onSuccess: () => toast.success(`Snoozed until ${until.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`),
        onError: () => toast.error("Failed to snooze"),
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} title="Snooze">
            <ClockIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {options.map((opt) => (
            <DropdownMenuItem key={opt.label} onClick={() => handleSnooze(opt.getValue())}>
              {opt.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCustomOpen(true)}>
            Pick date & time...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Snooze until</DialogTitle>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (customDate) {
                  handleSnooze(new Date(customDate));
                  setCustomOpen(false);
                }
              }}
            >
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
