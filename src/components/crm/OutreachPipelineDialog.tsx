import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddToPipeline } from "@/hooks/use-outreach-pipeline";
import { useEmailSequences } from "@/hooks/use-email-sequences";
import { Plus, Loader2, CheckCircle2, Rocket } from "lucide-react";

const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Gaming",
  "Finance",
  "Health & Wellness",
  "Education",
  "Food & Beverage",
  "Technology",
  "Media & Entertainment",
  "Travel",
  "Fashion & Apparel",
  "Consumer Electronics",
  "Automotive",
  "Real Estate",
  "Other",
] as const;

export function OutreachPipelineDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [industry, setIndustry] = useState<string>("");
  const [sequenceId, setSequenceId] = useState<string>("");

  const addToPipeline = useAddToPipeline();
  const { data: sequences = [] } = useEmailSequences();

  const activeSequences = sequences.filter((s) => s.status === "active");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const companyName = form.get("companyName") as string;
    const contactFirstName = form.get("contactFirstName") as string;
    const contactLastName = (form.get("contactLastName") as string) || undefined;
    const contactEmail = (form.get("contactEmail") as string) || undefined;
    const website = (form.get("website") as string) || undefined;
    const dealValueRaw = form.get("dealValue") as string;
    const dealValue = dealValueRaw ? parseFloat(dealValueRaw) : undefined;

    await addToPipeline.mutateAsync({
      companyName,
      contactFirstName,
      contactLastName,
      contactEmail,
      website,
      industry: industry || undefined,
      dealValue: dealValue && !isNaN(dealValue) ? dealValue : undefined,
      sequenceId: sequenceId && sequenceId !== "none" ? sequenceId : undefined,
    });

    setShowSuccess(true);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowSuccess(false);
      setIndustry("");
      setSequenceId("");
    }
    setOpen(nextOpen);
  };

  const handleAddAnother = () => {
    setShowSuccess(false);
    setIndustry("");
    setSequenceId("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add to Pipeline
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Add to Outreach Pipeline
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Successfully added to pipeline!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Company, contact, and deal have been created.
                {sequenceId &&
                  " The contact has been enrolled in the selected email sequence."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Close
              </Button>
              <Button size="sm" onClick={handleAddAnother}>
                Add Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                name="companyName"
                required
                placeholder="e.g. Acme Corp"
                className="bg-secondary border-border"
              />
            </div>

            {/* Contact Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactFirstName">Contact First Name *</Label>
                <Input
                  id="contactFirstName"
                  name="contactFirstName"
                  required
                  placeholder="Jane"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactLastName">Contact Last Name</Label>
                <Input
                  id="contactLastName"
                  name="contactLastName"
                  placeholder="Smith"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="jane@acmecorp.com"
                className="bg-secondary border-border"
              />
            </div>

            {/* Website & Industry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  placeholder="https://..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deal Value */}
            <div className="space-y-1.5">
              <Label htmlFor="dealValue">Estimated Deal Value ($)</Label>
              <Input
                id="dealValue"
                name="dealValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="5000"
                className="bg-secondary border-border"
              />
            </div>

            {/* Email Sequence */}
            <div className="space-y-1.5">
              <Label>Email Sequence</Label>
              <Select value={sequenceId} onValueChange={setSequenceId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="None (skip auto-outreach)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeSequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                      {seq.steps.length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({seq.steps.length} step
                          {seq.steps.length !== 1 ? "s" : ""})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optionally enroll the contact in an automated email sequence.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addToPipeline.isPending}>
                {addToPipeline.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Add to Pipeline
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
