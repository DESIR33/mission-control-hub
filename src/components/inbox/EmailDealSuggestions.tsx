import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmailDealSuggestions, useActionDealSuggestion } from "@/hooks/use-email-deal-suggestions";
import { DollarSign, Link2, ArrowUpRight, X, Check, Mail } from "lucide-react";

export function EmailDealSuggestions() {
  const { data: suggestions = [], isLoading } = useEmailDealSuggestions();
  const actionSuggestion = useActionDealSuggestion();

  if (isLoading) return null;
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Deal Suggestions
          <Badge variant="secondary" className="text-[10px] ml-auto">{suggestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {s.suggestion_type === "create_deal" ? (
                <DollarSign className="w-4 h-4 text-primary" />
              ) : s.suggestion_type === "update_stage" ? (
                <ArrowUpRight className="w-4 h-4 text-warning" />
              ) : (
                <Link2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground capitalize">
                {s.suggestion_type.replace(/_/g, " ")}
              </p>
              {s.context_snippet && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.context_snippet}</p>
              )}
              {s.suggested_value && (
                <Badge variant="outline" className="text-[10px] mt-1 border-success/30 text-success">
                  ${s.suggested_value.toLocaleString()}
                </Badge>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {Math.round(s.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                onClick={() => actionSuggestion.mutate({ id: s.id, status: "accepted" })}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => actionSuggestion.mutate({ id: s.id, status: "dismissed" })}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
