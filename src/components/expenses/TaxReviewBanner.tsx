import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";

interface Props {
  expenseId: string;
  expenseTitle: string;
  expenseAmount: number;
  expenseVendor: string;
  expenseCategory: string;
  onDone: () => void;
}

interface TaxReviewResult {
  is_deductible: boolean;
  confidence: number;
  reason: string;
  category_suggestion: string;
  follow_up_questions: string[];
}

export function TaxReviewBanner({ expenseId, expenseTitle, expenseAmount, expenseVendor, expenseCategory, onDone }: Props) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<TaxReviewResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [manualDeductible, setManualDeductible] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  const handleManualToggle = async (checked: boolean) => {
    setManualDeductible(checked);
    setSavingManual(true);
    try {
      await supabase
        .from("expenses")
        .update({
          is_tax_deductible: checked,
          tax_review_status: "reviewed",
        } as any)
        .eq("id", expenseId)
        .eq("workspace_id", workspaceId);
      queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] });
    } catch {
      // silently fail
    } finally {
      setSavingManual(false);
    }
  };

  const runReview = async (additionalContext?: string) => {
    setReviewing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("tax-deductibility-review", {
        body: {
          workspace_id: workspaceId,
          expense_id: expenseId,
          title: expenseTitle,
          amount: expenseAmount,
          vendor: expenseVendor,
          category: expenseCategory,
          additional_context: additionalContext,
        },
      });
      if (fnError) throw fnError;
      setResult(data as TaxReviewResult);
      queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] });
    } catch (e: any) {
      setError(e.message || "Failed to review");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">Expense Saved!</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>{expenseTitle}</strong> — ${expenseAmount.toFixed(2)}
        </p>

        {!result && !reviewing && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Want AI to assess if this expense could be tax deductible?
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onDone}>
                Skip <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button onClick={() => runReview()} className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Review Tax Deductibility
              </Button>
            </div>
          </div>
        )}

        {reviewing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">AI is analyzing this expense...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive py-2">
            {error}
            <Button variant="link" size="sm" onClick={() => runReview()}>Retry</Button>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">AI Tax Assessment</h3>
            <Badge variant={result.is_deductible ? "default" : "secondary"}>
              {result.is_deductible ? "Likely Deductible" : "Likely Not Deductible"}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>

          <p className="text-sm text-muted-foreground">{result.reason}</p>

          {result.category_suggestion && (
            <p className="text-xs text-muted-foreground">
              <strong>Tax category:</strong> {result.category_suggestion}
            </p>
          )}

          {result.follow_up_questions?.length > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-sm font-medium text-foreground">
                To improve accuracy, can you clarify:
              </p>
              {result.follow_up_questions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm text-muted-foreground">{q}</p>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    placeholder="Your answer..."
                    value={answers[i] || ""}
                    onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                  />
                </div>
              ))}
              <Button
                size="sm"
                onClick={() => {
                  const context = result.follow_up_questions
                    .map((q, i) => `Q: ${q}\nA: ${answers[i] || "N/A"}`)
                    .join("\n");
                  setResult(null);
                  runReview(context);
                }}
                disabled={reviewing}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Re-assess with Answers
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onDone}>
              Done <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
