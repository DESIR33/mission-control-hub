import { format } from "date-fns";
import { Building2, Calendar, User2 } from "lucide-react";
import type { Deal } from "@/hooks/use-deals";

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("dealId", deal.id)}
      onClick={onClick}
      className="p-3 rounded-lg border bg-card hover:border-primary cursor-pointer transition-colors"
    >
      <h4 className="text-sm font-medium leading-tight truncate">{deal.title}</h4>

      {deal.value != null && (
        <p className="text-base font-mono font-semibold text-primary mt-1">
          {deal.currency === "EUR" ? "€" : "$"}
          {deal.value.toLocaleString()}
        </p>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        {deal.company && (
          <span className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </span>
        )}
        {deal.contact && (
          <span className="flex items-center gap-1 truncate">
            <User2 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {deal.contact.first_name} {deal.contact.last_name ?? ""}
            </span>
          </span>
        )}
      </div>

      {deal.expected_close_date && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(deal.expected_close_date), "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  );
}
