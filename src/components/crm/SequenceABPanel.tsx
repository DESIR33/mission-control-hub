import { useState } from "react";
import { useEmailSequences } from "@/hooks/use-email-sequences";
import { useUpdateEmailSequence } from "@/hooks/use-email-sequences";
import {
  useSequenceABTesting,
  useAddVariant,
  type ABTestResult,
  type ABVariant,
} from "@/hooks/use-sequence-ab-testing";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FlaskConical, Trophy, Plus, Check } from "lucide-react";
import { chartTooltipStyle, cartesianGridDefaults, xAxisDefaults, yAxisDefaults } from "@/lib/chart-theme";

function WinnerBadge({ winner }: { winner: "A" | "B" | "none" }) {
  if (winner === "none") return null;
  return (
    <Badge className="ml-2 bg-green-600 text-white">
      <Trophy className="w-3 h-3 mr-1" />
      Variant {winner} wins
    </Badge>
  );
}

function VariantComparisonCard({
  variant,
  result,
  sequenceId,
  onAddVariant,
}: {
  variant: ABVariant | null;
  result: ABTestResult | null;
  sequenceId: string;
  onAddVariant: (stepNumber: number) => void;
}) {
  const stepNumber = variant?.stepNumber ?? result?.stepNumber ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Step {stepNumber}</CardTitle>
          {result && <WinnerBadge winner={result.winner} />}
        </div>
      </CardHeader>
      <CardContent>
        {variant ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">A</Badge>
                <span className="text-xs text-muted-foreground">Original</span>
              </div>
              <p className="text-sm font-medium truncate">{variant.variantA.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{variant.variantA.body}</p>
            </div>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">B</Badge>
                <span className="text-xs text-muted-foreground">Variant</span>
              </div>
              <p className="text-sm font-medium truncate">{variant.variantB.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{variant.variantB.body}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No variant B for this step</p>
            <Button variant="outline" size="sm" onClick={() => onAddVariant(stepNumber)}>
              <Plus className="w-3 h-3 mr-1" />
              Add Variant B
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddVariantForm({
  sequenceId,
  stepNumber,
  onClose,
}: {
  sequenceId: string;
  stepNumber: number;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const addVariant = useAddVariant();

  const handleSubmit = () => {
    if (!subject.trim()) return;
    addVariant.mutate(
      { sequenceId, stepNumber, subject, body },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Add Variant B for Step {stepNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`variant-subject-${stepNumber}`}>Subject Line</Label>
          <Input
            id={`variant-subject-${stepNumber}`}
            placeholder="Enter variant B subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`variant-body-${stepNumber}`}>Body</Label>
          <Textarea
            id={`variant-body-${stepNumber}`}
            placeholder="Enter variant B body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!subject.trim() || addVariant.isPending}
          >
            {addVariant.isPending ? "Adding..." : "Add Variant"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsTable({ results }: { results: ABTestResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No A/B test results yet. Add variant B to steps to start testing.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead className="text-center" colSpan={3}>
            Variant A
          </TableHead>
          <TableHead className="text-center" colSpan={3}>
            Variant B
          </TableHead>
          <TableHead className="text-center">Significance</TableHead>
          <TableHead className="text-center">Winner</TableHead>
        </TableRow>
        <TableRow>
          <TableHead />
          <TableHead className="text-center text-xs">Sent</TableHead>
          <TableHead className="text-center text-xs">Open %</TableHead>
          <TableHead className="text-center text-xs">Reply %</TableHead>
          <TableHead className="text-center text-xs">Sent</TableHead>
          <TableHead className="text-center text-xs">Open %</TableHead>
          <TableHead className="text-center text-xs">Reply %</TableHead>
          <TableHead />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.stepNumber}>
            <TableCell className="font-medium">Step {r.stepNumber}</TableCell>
            <TableCell className="text-center">{r.variantA.sent}</TableCell>
            <TableCell className="text-center">{r.variantA.openRate.toFixed(1)}%</TableCell>
            <TableCell className="text-center">{r.variantA.replyRate.toFixed(1)}%</TableCell>
            <TableCell className="text-center">{r.variantB.sent}</TableCell>
            <TableCell className="text-center">{r.variantB.openRate.toFixed(1)}%</TableCell>
            <TableCell className="text-center">{r.variantB.replyRate.toFixed(1)}%</TableCell>
            <TableCell className="text-center">
              <Badge variant={r.significance >= 90 ? "default" : "secondary"}>
                {r.significance.toFixed(0)}%
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              {r.winner !== "none" ? (
                <Badge className="bg-green-600 text-white">
                  <Trophy className="w-3 h-3 mr-1" />
                  {r.winner}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FunnelChart({
  funnel,
}: {
  funnel: { step: string; enrolled: number; sent: number; opened: number; replied: number }[];
}) {
  if (funnel.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Overall Sequence Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="step" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar dataKey="enrolled" name="Enrolled" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="sent" name="Sent" fill="hsl(220 70% 55%)" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="opened" name="Opened" fill="hsl(150 60% 45%)" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="replied" name="Replied" fill="hsl(40 90% 55%)" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function SequenceABPanel() {
  const { data: sequences = [], isLoading: seqListLoading } = useEmailSequences();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingVariantStep, setAddingVariantStep] = useState<number | null>(null);
  const { data: abData, isLoading: abLoading } = useSequenceABTesting(selectedId);
  const updateSequence = useUpdateEmailSequence();

  const isLoading = seqListLoading || abLoading;

  const selectedSequence = sequences.find((s) => s.id === selectedId);
  const steps = (selectedSequence as any)?.steps ?? [];

  // Build variant map keyed by step number for quick lookup
  const variantMap = new Map<number, ABVariant>();
  if (abData) {
    for (const v of abData.variants) {
      variantMap.set(v.stepNumber, v);
    }
  }

  const resultMap = new Map<number, ABTestResult>();
  if (abData) {
    for (const r of abData.results) {
      resultMap.set(r.stepNumber, r);
    }
  }

  const handleUseWinner = (result: ABTestResult) => {
    if (!selectedSequence || result.winner === "none") return;

    const variant = variantMap.get(result.stepNumber);
    if (!variant) return;

    const winnerContent =
      result.winner === "A" ? variant.variantA : variant.variantB;

    // Replace step subject/body with winner and remove variant
    const updatedSteps = steps.map((step: any) => {
      if (step.step_number === result.stepNumber) {
        return {
          ...step,
          subject_template: winnerContent.subject,
          body_template: winnerContent.body,
        };
      }
      return step;
    });

    updateSequence.mutate({ id: selectedSequence.id, steps: updatedSteps });
  };

  return (
    <div className="space-y-6">
      {/* Header + Sequence Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">A/B Testing</h2>
        </div>
        <div className="w-72">
          <Select
            value={selectedId ?? ""}
            onValueChange={(val) => {
              setSelectedId(val || null);
              setAddingVariantStep(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a sequence" />
            </SelectTrigger>
            <SelectContent>
              {sequences.map((seq) => (
                <SelectItem key={seq.id} value={seq.id}>
                  {seq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* No sequence selected */}
      {!isLoading && !selectedId && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a sequence above to view or create A/B tests for individual steps.
          </p>
        </div>
      )}

      {/* Main content */}
      {!isLoading && selectedId && abData && (
        <>
          {/* Variant comparison cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Step Variants</h3>
            <div className="grid gap-4">
              {steps.map((step: any) => {
                const stepNum = step.step_number as number;
                const variant = variantMap.get(stepNum) ?? null;

                if (addingVariantStep === stepNum && !variant) {
                  return (
                    <AddVariantForm
                      key={stepNum}
                      sequenceId={selectedId}
                      stepNumber={stepNum}
                      onClose={() => setAddingVariantStep(null)}
                    />
                  );
                }

                return (
                  <VariantComparisonCard
                    key={stepNum}
                    variant={variant}
                    result={resultMap.get(stepNum) ?? null}
                    sequenceId={selectedId}
                    onAddVariant={(sn) => setAddingVariantStep(sn)}
                  />
                );
              })}
            </div>
          </div>

          {/* Results table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultsTable results={abData.results} />
              {/* Use Winner buttons */}
              {abData.results.some((r) => r.winner !== "none") && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {abData.results
                    .filter((r) => r.winner !== "none")
                    .map((r) => (
                      <Button
                        key={r.stepNumber}
                        variant="outline"
                        size="sm"
                        onClick={() => handleUseWinner(r)}
                        disabled={updateSequence.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Use Winner for Step {r.stepNumber}
                      </Button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funnel chart */}
          <FunnelChart funnel={abData.overallFunnel} />
        </>
      )}
    </div>
  );
}
