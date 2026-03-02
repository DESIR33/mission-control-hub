import { useMemo } from "react";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { Users, DollarSign, TrendingUp, Clock } from "lucide-react";

type PartnershipType = "sponsor" | "affiliate" | "collaborator" | "general";

const STATUS_COLUMNS = ["lead", "active", "customer", "inactive"] as const;
const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  active: "Active",
  customer: "Customer",
  inactive: "Inactive",
};
const STATUS_COLORS: Record<string, string> = {
  lead: "border-t-blue-500",
  active: "border-t-green-500",
  customer: "border-t-amber-500",
  inactive: "border-t-gray-400",
};

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

interface Props {
  partnershipType: PartnershipType;
}

export function PartnershipPipeline({ partnershipType }: Props) {
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();

  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      const pt = c.custom_fields?.partnership_type ?? null;
      return pt === partnershipType;
    });
  }, [contacts, partnershipType]);

  const dealsByContact = useMemo(() => {
    const map = new Map<string, number>();
    for (const deal of deals) {
      const cid = (deal as any).contact_id;
      if (cid) {
        map.set(cid, (map.get(cid) ?? 0) + (Number((deal as any).value) || 0));
      }
    }
    return map;
  }, [deals]);

  const columns = useMemo(() => {
    return STATUS_COLUMNS.map((status) => {
      const cards = filtered.filter((c: any) => c.status === status);
      const totalValue = cards.reduce((s: number, c: any) => s + (dealsByContact.get(c.id) ?? 0), 0);
      return { status, cards, totalValue };
    });
  }, [filtered, dealsByContact]);

  const totalInPipeline = filtered.length;
  const totalValue = filtered.reduce((s: number, c: any) => s + (dealsByContact.get(c.id) ?? 0), 0);
  const activeCount = filtered.filter((c: any) => c.status === "active").length;

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No {partnershipType} contacts yet. Tag contacts with partnership type to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Pipeline</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{totalInPipeline}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Value</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(totalValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {totalInPipeline > 0 ? `${((columns[2].cards.length / totalInPipeline) * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => (
          <div key={col.status} className={`rounded-lg border border-border bg-card border-t-4 ${STATUS_COLORS[col.status]}`}>
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground">{STATUS_LABELS[col.status]}</h4>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{col.cards.length}</span>
              </div>
              {col.totalValue > 0 && (
                <p className="text-[10px] text-green-500 font-mono mt-0.5">{fmtMoney(col.totalValue)}</p>
              )}
            </div>
            <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
              {col.cards.map((contact: any) => {
                const dealValue = dealsByContact.get(contact.id) ?? 0;
                return (
                  <div key={contact.id} className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-xs font-medium text-foreground truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.company_name && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{contact.company_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {contact.vip_tier && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                          {contact.vip_tier}
                        </span>
                      )}
                      {dealValue > 0 && (
                        <span className="text-[10px] text-green-500 font-mono">{fmtMoney(dealValue)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
