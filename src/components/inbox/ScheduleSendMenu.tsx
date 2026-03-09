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
import { CalendarClockIcon } from "lucide-react";

interface ScheduleSendMenuProps {
  onSchedule: (date: Date) => void;
  disabled?: boolean;
}

function getScheduleOptions(): Array<{ label: string; getValue: () => Date }> {
  return [
    {
      label: "Tomorrow morning (9 AM)",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Tomorrow afternoon (1 PM)",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(13, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Monday morning (9 AM)",
      getValue: () => {
        const d = new Date();
        const day = d.getDay();
        const daysUntilMon = day === 1 ? 7 : ((8 - day) % 7);
        d.setDate(d.getDate() + daysUntilMon);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];
}

export function ScheduleSendMenu({ onSchedule, disabled }: ScheduleSendMenuProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const options = getScheduleOptions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
            <CalendarClockIcon className="h-3.5 w-3.5" />
            Schedule
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {options.map((opt) => (
            <DropdownMenuItem key={opt.label} onClick={() => onSchedule(opt.getValue())}>
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
            <DialogTitle>Schedule send</DialogTitle>
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
                  onSchedule(new Date(customDate));
                  setCustomOpen(false);
                }
              }}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
