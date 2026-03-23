import { useState } from "react";
import { Building2, Plus, X, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanies } from "@/hooks/use-companies";
import { useAgencyClients, useCompanyAgencies, useLinkAgencyClient, useUnlinkAgencyClient } from "@/hooks/use-agency-links";
import { useNavigate } from "react-router-dom";

interface AgencyClientsPanelProps {
  companyId: string;
  isAgency: boolean;
}

/**
 * Shows linked client companies (if this is an agency),
 * or linked agencies (if this is a regular company).
 */
export function AgencyClientsPanel({ companyId, isAgency }: AgencyClientsPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: agencyClients = [], isLoading: clientsLoading } = useAgencyClients(isAgency ? companyId : null);
  const { data: companyAgencies = [], isLoading: agenciesLoading } = useCompanyAgencies(!isAgency ? companyId : null);

  const { data: allCompanies = [] } = useCompanies();
  const linkMutation = useLinkAgencyClient();
  const unlinkMutation = useUnlinkAgencyClient();

  const isLoading = clientsLoading || agenciesLoading;
  const links = isAgency ? agencyClients : companyAgencies;

  // IDs already linked
  const linkedIds = new Set(
    isAgency
      ? agencyClients.map((l) => l.client_company_id)
      : companyAgencies.map((l) => l.agency_id)
  );
  linkedIds.add(companyId); // exclude self

  const available = allCompanies.filter(
    (c) => !linkedIds.has(c.id) && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = (targetId: string) => {
    if (isAgency) {
      linkMutation.mutate({ agencyId: companyId, clientCompanyId: targetId });
    } else {
      linkMutation.mutate({ agencyId: targetId, clientCompanyId: companyId });
    }
    setOpen(false);
    setSearch("");
  };

  const handleUnlink = (linkId: string) => {
    unlinkMutation.mutate({ id: linkId });
  };

  const title = isAgency ? "Client Companies" : "Representing Agencies";
  const emptyText = isAgency
    ? "No client companies linked to this agency yet."
    : "No agencies linked to this company yet.";
  const buttonLabel = isAgency ? "Link Client" : "Link Agency";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            {title}
          </CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" />
                {buttonLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No companies found</p>
                )}
                {available.slice(0, 20).map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleLink(company.id)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-xs text-foreground flex items-center gap-2"
                  >
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate">{company.name}</span>
                    {company.industry && (
                      <span className="text-muted-foreground ml-auto shrink-0">{company.industry}</span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{emptyText}</p>
        ) : (
          <div className="space-y-1.5">
            {links.map((link) => {
              const linkedCompany = isAgency ? (link as any).client_company : (link as any).agency;
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/relationships/companies/${linkedCompany?.id}`)}
                  >
                    {linkedCompany?.logo_url ? (
                      <img src={linkedCompany.logo_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{linkedCompany?.name ?? "Unknown"}</p>
                      {linkedCompany?.industry && (
                        <p className="text-xs text-muted-foreground truncate">{linkedCompany.industry}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(link.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-full hover:bg-destructive/20 p-1 transition-opacity"
                    aria-label={`Unlink ${linkedCompany?.name ?? "company"}`}
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
