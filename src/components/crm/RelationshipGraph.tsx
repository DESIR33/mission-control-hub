import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Briefcase, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, Company, Deal } from "@/types/crm";

interface RelationshipGraphProps {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  onSelectContact?: (contact: Contact) => void;
  onSelectCompany?: (company: Company) => void;
}

interface CompanyNode {
  company: Company;
  contacts: Contact[];
  deals: Deal[];
}

const stageColors: Record<string, string> = {
  prospecting: "bg-blue-500/15 text-blue-500",
  qualification: "bg-yellow-500/15 text-yellow-500",
  proposal: "bg-orange-500/15 text-orange-500",
  negotiation: "bg-purple-500/15 text-purple-500",
  closed_won: "bg-green-500/15 text-green-500",
  closed_lost: "bg-red-500/15 text-red-500",
};

export function RelationshipGraph({
  contacts,
  companies,
  deals,
  onSelectContact,
  onSelectCompany,
}: RelationshipGraphProps) {
  const graph = useMemo(() => {
    const companyMap = new Map<string, CompanyNode>();

    // Build company nodes
    for (const company of companies) {
      companyMap.set(company.id, { company, contacts: [], deals: [] });
    }

    // Associate contacts with companies
    for (const contact of contacts) {
      if (contact.company_id && companyMap.has(contact.company_id)) {
        companyMap.get(contact.company_id)!.contacts.push(contact);
      }
    }

    // Associate deals with companies
    for (const deal of deals) {
      if (deal.company_id && companyMap.has(deal.company_id)) {
        companyMap.get(deal.company_id)!.deals.push(deal);
      }
    }

    // Unaffiliated contacts (no company)
    const unaffiliated = contacts.filter((c) => !c.company_id);

    // Orphan deals (no company)
    const orphanDeals = deals.filter((d) => !d.company_id);

    return {
      companyNodes: Array.from(companyMap.values()).sort(
        (a, b) => b.contacts.length + b.deals.length - (a.contacts.length + a.deals.length)
      ),
      unaffiliated,
      orphanDeals,
    };
  }, [contacts, companies, deals]);

  const totalRelationships =
    graph.companyNodes.reduce((acc, n) => acc + n.contacts.length + n.deals.length, 0) +
    graph.unaffiliated.length +
    graph.orphanDeals.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{companies.length}</p>
          <p className="text-xs text-muted-foreground">Companies</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Contacts</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{deals.length}</p>
          <p className="text-xs text-muted-foreground">Deals</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRelationships}</p>
          <p className="text-xs text-muted-foreground">Relationships</p>
        </div>
      </div>

      {/* Company nodes with connections */}
      <div className="space-y-4">
        {graph.companyNodes.map((node) => (
          <div key={node.company.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Company header */}
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
              onClick={() => onSelectCompany?.(node.company)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{node.company.name}</p>
                <p className="text-xs text-muted-foreground">
                  {node.company.industry ?? "Unknown industry"}
                  {node.company.location ? ` - ${node.company.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {node.contacts.length} contact{node.contacts.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {node.deals.length} deal{node.deals.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </button>

            {/* Connected contacts & deals */}
            {(node.contacts.length > 0 || node.deals.length > 0) && (
              <div className="border-t border-border px-3 py-2 space-y-1">
                {node.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors text-left"
                    onClick={() => onSelectContact?.(contact)}
                  >
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.role && (
                      <span className="text-xs text-muted-foreground ml-1 truncate">{contact.role}</span>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] ml-auto shrink-0", {
                      "bg-success/15 text-success": contact.status === "active",
                      "bg-primary/15 text-primary": contact.status === "lead",
                    })}>
                      {contact.status}
                    </Badge>
                  </button>
                ))}
                {node.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded"
                  >
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{deal.title}</span>
                    {deal.value && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ${deal.value.toLocaleString()}
                      </span>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] ml-auto shrink-0", stageColors[deal.stage])}>
                      {deal.stage.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unaffiliated contacts */}
      {graph.unaffiliated.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold text-muted-foreground">
              Unaffiliated Contacts ({graph.unaffiliated.length})
            </p>
          </div>
          <div className="px-3 py-2 space-y-1">
            {graph.unaffiliated.map((contact) => (
              <button
                key={contact.id}
                className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors text-left"
                onClick={() => onSelectContact?.(contact)}
              >
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {contact.first_name} {contact.last_name}
                </span>
                <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                  {contact.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
