import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  useReminders,
  useCreateReminder,
  useCompleteReminder,
  useDeleteReminder,
} from "@/hooks/use-reminders";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2, CalendarClock, X } from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

interface FollowUpRemindersProps {
  entityId: string;
  entityType: "contact" | "company";
}

function getReminderStatus(dueDate: string, completedAt: string | null) {
  if (completedAt) {
    return { label: "Completed", color: "bg-muted text-muted-foreground border-border" };
  }
  const due = new Date(dueDate);
  if (isPast(due) && !isToday(due)) {
    return { label: "Overdue", color: "bg-destructive/15 text-destructive border-destructive/30" };
  }
  if (isToday(due)) {
    return { label: "Due today", color: "bg-warning/15 text-warning border-warning/30" };
  }
  if (isTomorrow(due)) {
    return { label: "Tomorrow", color: "bg-warning/15 text-warning border-warning/30" };
  }
  return { label: "Upcoming", color: "bg-success/15 text-success border-success/30" };
}

export function FollowUpReminders({ entityId, entityType }: FollowUpRemindersProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const { data: reminders = [], isLoading } = useReminders(entityId, entityType);
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) return;

    try {
      await createReminder.mutateAsync({
        entity_id: entityId,
        entity_type: entityType,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: new Date(dueDate).toISOString(),
      });
      setTitle("");
      setDueDate("");
      setDescription("");
      setShowForm(false);
      toast({ title: "Reminder created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReminder.mutateAsync(id);
      toast({ title: "Reminder completed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder.mutateAsync(id);
      toast({ title: "Reminder deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading reminders...
      </div>
    );
  }

  const pendingReminders = reminders.filter((r) => !r.completed_at);
  const completedReminders = reminders.filter((r) => r.completed_at);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Follow-up Reminders
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            <>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
          <Input
            placeholder="Reminder title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-secondary border-border h-8 text-sm"
          />
          <Input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-secondary border-border h-8 text-sm"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-secondary border-border text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreate}
              disabled={!title.trim() || !dueDate || createReminder.isPending}
            >
              {createReminder.isPending && (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              )}
              Add Reminder
            </Button>
          </div>
        </div>
      )}

      {pendingReminders.length === 0 && completedReminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
          <CalendarClock className="w-8 h-8 mb-2 opacity-40" />
          <p>No reminders yet</p>
        </div>
      )}

      {pendingReminders.length > 0 && (
        <ul className="space-y-2">
          {pendingReminders.map((reminder) => {
            const status = getReminderStatus(reminder.due_date, reminder.completed_at);
            return (
              <li
                key={reminder.id}
                className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={false}
                  onCheckedChange={() => handleComplete(reminder.id)}
                  disabled={completeReminder.isPending}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {reminder.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs uppercase tracking-wider", status.color)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  {reminder.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reminder.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Due {safeFormatDistanceToNow(reminder.due_date, { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(reminder.id)}
                  disabled={deleteReminder.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {completedReminders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Completed ({completedReminders.length})
          </p>
          <ul className="space-y-1.5">
            {completedReminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 opacity-60"
              >
                <Checkbox checked disabled className="mt-0" />
                <span className="text-sm text-muted-foreground line-through flex-1 truncate">
                  {reminder.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(reminder.id)}
                  disabled={deleteReminder.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
