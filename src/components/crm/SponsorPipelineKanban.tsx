import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@/types/crm";

const COLUMNS = [
  { key: "not_contacted", label: "Not Contacted", color: "bg-muted-foreground" },
  { key: "researching", label: "Researching", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { key: "in_conversation", label: "In Conversation", color: "bg-orange-500" },
  { key: "negotiating", label: "Negotiating", color: "bg-purple-500" },
  { key: "sponsor", label: "Sponsor", color: "bg-emerald-500" },
  { key: "former_sponsor", label: "Former Sponsor", color: "bg-teal-500" },
  { key: "passed", label: "Passed", color: "bg-destructive" },
  { key: "not_a_fit", label: "Not a Fit", color: "bg-muted-foreground/60" },
];

function formatFunding(v: number | null) {
  if (!v) return "";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

interface SponsorPipelineKanbanProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
}

export function SponsorPipelineKanban({ companies, onSelectCompany }: SponsorPipelineKanbanProps) {
  const updateCompany = useUpdateCompany();
  const { toast } = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Company[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const c of companies) {
      const status = c.outreach_status ?? "not_contacted";
      if (map[status]) map[status].push(c);
      else map["not_contacted"].push(c);
    }
    return map;
  }, [companies]);

  const handleDragStart = (e: React.DragEvent, companyId: string) => {
    e.dataTransfer.setData("text/plain", companyId);
    setDragging(companyId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const companyId = e.dataTransfer.getData("text/plain");
    setDragging(null);
    setDragOver(null);

    const company = companies.find((c) => c.id === companyId);
    if (!company || (company.outreach_status ?? "not_contacted") === newStatus) return;

    try {
      await updateCompany.mutateAsync({ id: companyId, outreach_status: newStatus });
      toast({ title: `Moved to ${newStatus.replace(/_/g, " ")}` });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {COLUMNS.map((col) => {
        const items = grouped[col.key] ?? [];
        return (
          <div
            key={col.key}
            className={cn(
              "flex-shrink-0 w-[220px] rounded-lg border border-border bg-card/50 flex flex-col",
              dragOver === col.key && "ring-2 ring-primary/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider truncate">{col.label}</span>
              <Badge variant="outline" className="text-xs ml-auto">{items.length}</Badge>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
              {items.map((company) => (
                <div
                  key={company.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, company.id)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => onSelectCompany(company)}
                  className={cn(
                    "rounded-lg border border-border bg-card p-2.5 cursor-pointer transition-all hover:border-primary/40",
                    dragging === company.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{company.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {company.competitor_group && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{company.competitor_group}</Badge>
                    )}
                    {company.sponsor_fit_score != null && (
                      <span className={cn("text-[10px] font-bold font-mono",
                        company.sponsor_fit_score <= 3 ? "text-destructive" :
                        company.sponsor_fit_score <= 6 ? "text-yellow-500" : "text-emerald-500"
                      )}>Fit: {company.sponsor_fit_score}</span>
                    )}
                    {company.total_funding != null && company.total_funding > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">{formatFunding(company.total_funding)}</span>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Drop here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
