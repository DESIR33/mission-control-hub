import { useState } from "react";
import { Building2, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/hooks/use-companies";
import { useVideoCompanies, useLinkVideoCompany, useUnlinkVideoCompany } from "@/hooks/use-video-companies";
import { Badge } from "@/components/ui/badge";

interface Props {
  youtubeVideoId: string;
}

export function VideoCompaniesPanel({ youtubeVideoId }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: linkedCompanies = [], isLoading } = useVideoCompanies(youtubeVideoId);
  const { data: allCompanies = [] } = useCompanies();
  const linkMutation = useLinkVideoCompany();
  const unlinkMutation = useUnlinkVideoCompany();

  const linkedIds = new Set(linkedCompanies.map((lc) => lc.company_id));
  const available = allCompanies.filter(
    (c) => !linkedIds.has(c.id) && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = (companyId: string) => {
    linkMutation.mutate({ youtubeVideoId, companyId });
    setOpen(false);
    setSearch("");
  };

  const handleUnlink = (id: string) => {
    unlinkMutation.mutate({ id, youtubeVideoId });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          Linked Companies
        </h3>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Plus className="w-3 h-3" />
              Link Company
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
                  {company.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : linkedCompanies.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No companies linked to this video yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {linkedCompanies.map((lc) => (
            <Badge key={lc.id} variant="secondary" className="gap-1.5 pr-1">
              {lc.company?.logo_url && (
                <img src={lc.company.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
              )}
              {lc.company?.name ?? "Unknown"}
              <button
                onClick={() => handleUnlink(lc.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
