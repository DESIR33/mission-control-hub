import { useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Mail,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Clock,
  Users,
  ListOrdered,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import {
  useEmailSequences,
  useCreateEmailSequence,
  useUpdateEmailSequence,
  useDeleteEmailSequence,
  useSequenceEnrollments,
  type SequenceStep,
  type EmailSequence,
  type SequenceEnrollment,
} from "@/hooks/use-email-sequences";
import { useSequenceTracking, useLogSequenceEvent } from "@/hooks/use-sequence-tracking";
import { BarChart3, Send } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  archived: "bg-gray-500/15 text-gray-500 border-gray-500/30",
};

const enrollmentStatusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  replied: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

function emptyStep(stepNumber: number): SequenceStep {
  return {
    step_number: stepNumber,
    delay_days: stepNumber === 1 ? 0 : 3,
    subject_template: "",
    body_template: "",
  };
}

// ---------- Sequence Analytics ----------

function SequenceAnalyticsSection({
  sequenceId,
  steps,
  enrollments,
}: {
  sequenceId: string;
  steps: SequenceStep[];
  enrollments: SequenceEnrollment[];
}) {
  const { data: tracking } = useSequenceTracking(sequenceId);
  const logEvent = useLogSequenceEvent();

  const handleLogEvent = async (enrollmentId: string, stepNumber: number, eventType: string) => {
    try {
      await logEvent.mutateAsync({ enrollmentId, stepNumber, eventType: eventType as any });
      toast.success(`Logged "${eventType}" event`);
    } catch {
      toast.error("Failed to log event");
    }
  };

  const eventTypes = ["sent", "delivered", "opened", "replied", "bounced"];

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" />
        Analytics
      </h4>
      {tracking && tracking.totalSent > 0 ? (
        <div className="space-y-3">
          {/* Funnel KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Sent</p>
              <p className="text-sm font-bold font-mono text-blue-500">{tracking.totalSent}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Open Rate</p>
              <p className="text-sm font-bold font-mono text-green-500">{tracking.openRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Reply Rate</p>
              <p className="text-sm font-bold font-mono text-purple-500">{tracking.replyRate.toFixed(1)}%</p>
            </div>
          </div>
          {/* Rates */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Delivery: <span className="font-mono text-foreground">{tracking.deliveryRate.toFixed(1)}%</span></span>
            <span>Bounce: <span className="font-mono text-foreground">{tracking.bounceRate.toFixed(1)}%</span></span>
          </div>
          {/* Per-step breakdown */}
          {tracking.stepMetrics.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Per Step</p>
              {tracking.stepMetrics.map((step) => (
                <div key={step.stepNumber} className="flex items-center gap-3 text-xs rounded-md bg-muted/20 px-2 py-1">
                  <span className="font-mono text-muted-foreground w-8">#{step.stepNumber}</span>
                  <span className="text-foreground">{step.sent}s</span>
                  <span className="text-green-500">{step.opened}o</span>
                  <span className="text-purple-500">{step.replied}r</span>
                  <span className="ml-auto text-muted-foreground">
                    {step.openRate.toFixed(0)}% open
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">No tracking events yet.</p>
          {enrollments.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Log events manually for enrolled contacts:</p>
              {enrollments.slice(0, 3).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center gap-1 justify-center flex-wrap">
                  <span className="text-[10px] font-mono text-foreground">{enrollment.contact_id.slice(0, 8)}...</span>
                  {eventTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleLogEvent(enrollment.id, enrollment.current_step, type)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Sequence Detail (expanded card) ----------

function SequenceDetail({
  sequence,
  onToggleStatus,
  isTogglingStatus,
}: {
  sequence: EmailSequence;
  onToggleStatus: () => void;
  isTogglingStatus: boolean;
}) {
  const { data: enrollments = [], isLoading: enrollmentsLoading } =
    useSequenceEnrollments(sequence.id);

  return (
    <div className="mt-4 space-y-5 border-t border-border pt-4">
      {/* Pause / Resume */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Sequence Control</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleStatus}
          disabled={isTogglingStatus}
        >
          {sequence.status === "active" ? (
            <>
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Pause Sequence
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Resume Sequence
            </>
          )}
        </Button>
      </div>

      {/* Steps */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">
          Steps ({sequence.steps.length})
        </h4>
        <div className="space-y-2">
          {sequence.steps.map((step) => (
            <div
              key={step.step_number}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {step.step_number}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {step.subject_template || "(no subject)"}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {step.delay_days === 0
                    ? "Immediately"
                    : `${step.delay_days} day${step.delay_days !== 1 ? "s" : ""} delay`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 ml-7">
                {step.body_template || "(no body)"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <SequenceAnalyticsSection sequenceId={sequence.id} steps={sequence.steps} enrollments={enrollments} />

      {/* Enrollments */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">
          Enrolled Contacts ({enrollments.length})
        </h4>
        {enrollmentsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No contacts enrolled in this sequence yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Contact ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Current Step
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                    Enrolled
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">
                    Next Send
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment: SequenceEnrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-3 py-2 text-foreground font-mono truncate max-w-[120px]">
                      {enrollment.contact_id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      Step {enrollment.current_step}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          enrollmentStatusColors[enrollment.status] ?? ""
                        )}
                      >
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {format(new Date(enrollment.enrolled_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                      {enrollment.next_send_at
                        ? format(new Date(enrollment.next_send_at), "MMM d, h:mm a")
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Create / Edit Dialog ----------

function SequenceFormDialog({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: EmailSequence | null;
}) {
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [steps, setSteps] = useState<SequenceStep[]>(
    initialData?.steps?.length
      ? initialData.steps
      : [emptyStep(1)]
  );

  const createMutation = useCreateEmailSequence();
  const updateMutation = useUpdateEmailSequence();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleAddStep = () => {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
  };

  const handleStepChange = (
    index: number,
    field: keyof SequenceStep,
    value: string | number
  ) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Sequence name is required.");
      return;
    }

    if (steps.length === 0) {
      toast.error("Add at least one step to the sequence.");
      return;
    }

    const hasEmptySubject = steps.some((s) => !s.subject_template.trim());
    if (hasEmptySubject) {
      toast.error("Every step must have a subject line.");
      return;
    }

    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          name: name.trim(),
          description: description.trim() || undefined,
          steps,
        });
        toast.success("Sequence updated successfully.");
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          steps,
        });
        toast.success("Sequence created successfully.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save sequence.");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset form state when closing
      setName(initialData?.name ?? "");
      setDescription(initialData?.description ?? "");
      setSteps(
        initialData?.steps?.length ? initialData.steps : [emptyStep(1)]
      );
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Sequence" : "Create Email Sequence"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="seq-name">Name</Label>
            <Input
              id="seq-name"
              placeholder="e.g. Cold Outreach Follow-up"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="seq-description">Description</Label>
            <Textarea
              id="seq-description"
              placeholder="Brief description of this sequence"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Steps builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStep}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Use merge tags in subject and body:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {"{{first_name}}"}
              </code>{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {"{{company_name}}"}
              </code>{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {"{{last_name}}"}
              </code>
            </p>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Step {step.step_number}
                    </span>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveStep(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Delay (days)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={(e) =>
                          handleStepChange(
                            index,
                            "delay_days",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Subject</Label>
                      <Input
                        placeholder="e.g. Hey {{first_name}}, quick question"
                        value={step.subject_template}
                        onChange={(e) =>
                          handleStepChange(index, "subject_template", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Body</Label>
                    <Textarea
                      placeholder="Hi {{first_name}}, I noticed {{company_name}} is..."
                      value={step.body_template}
                      onChange={(e) =>
                        handleStepChange(index, "body_template", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
              ? "Save Changes"
              : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Content ----------

function EmailSequencesContent() {
  const { data: sequences = [], isLoading } = useEmailSequences();
  const deleteMutation = useDeleteEmailSequence();
  const updateMutation = useUpdateEmailSequence();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Sequence deleted.");
      setDeleteConfirmId(null);
      if (expandedId === id) setExpandedId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete sequence.");
    }
  };

  const handleToggleStatus = async (sequence: EmailSequence) => {
    const nextStatus = sequence.status === "active" ? "paused" : "active";
    try {
      await updateMutation.mutateAsync({ id: sequence.id, status: nextStatus });
      toast.success(
        nextStatus === "active" ? "Sequence resumed." : "Sequence paused."
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update sequence status.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage automated email outreach sequences
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      {/* Sequence Cards */}
      {sequences.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No email sequences yet. Create your first sequence to start automating
            outreach.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sequence
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((sequence) => {
            const isExpanded = expandedId === sequence.id;

            return (
              <div
                key={sequence.id}
                className="rounded-lg border border-border bg-card p-4 transition-colors"
              >
                {/* Card header */}
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => handleToggleExpand(sequence.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {sequence.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          statusColors[sequence.status] ?? ""
                        )}
                      >
                        {sequence.status}
                      </Badge>
                    </div>
                    {sequence.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {sequence.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ListOrdered className="h-3 w-3" />
                        {sequence.steps.length} step
                        {sequence.steps.length !== 1 ? "s" : ""}
                      </span>
                      <SequenceEnrollmentCount sequenceId={sequence.id} />
                      <span className="hidden sm:inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {format(new Date(sequence.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSequence(sequence);
                      }}
                      title="Edit sequence"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(sequence.id);
                      }}
                      title="Delete sequence"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <SequenceDetail
                    sequence={sequence}
                    onToggleStatus={() => handleToggleStatus(sequence)}
                    isTogglingStatus={updateMutation.isPending}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <SequenceFormDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
        }}
      />

      {/* Edit Dialog */}
      {editingSequence && (
        <SequenceFormDialog
          open={!!editingSequence}
          onOpenChange={(open) => {
            if (!open) setEditingSequence(null);
          }}
          initialData={editingSequence}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Sequence</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this sequence? This action cannot be undone
            and will remove all enrolled contacts from this sequence.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Enrollment count badge (avoids loading all enrollments upfront) ----------

function SequenceEnrollmentCount({ sequenceId }: { sequenceId: string }) {
  const { data: enrollments = [] } = useSequenceEnrollments(sequenceId);

  return (
    <span className="inline-flex items-center gap-1">
      <Users className="h-3 w-3" />
      {enrollments.length} enrolled
    </span>
  );
}

// ---------- Page export ----------

export default function EmailSequencesPage() {
  return (
    <WorkspaceProvider>
      <EmailSequencesContent />
    </WorkspaceProvider>
  );
}
