import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";

interface CompanyChipProps {
  companyId: number | string;
}

export default function CompanyChip({ companyId }: CompanyChipProps) {
  const { workspaceId } = useWorkspace();

  const { data: company } = useQuery({
    queryKey: ["company-chip", workspaceId, companyId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("id", String(companyId))
        .eq("workspace_id", workspaceId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!workspaceId && !!companyId,
  });

  if (!company) return null;

  return (
    <div className="flex items-center gap-1.5">
      {company.logo_url ? (
        <Avatar className="h-5 w-5">
          <AvatarImage src={company.logo_url} alt={company.name} />
          <AvatarFallback className="text-[9px]">
            {company.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className="text-xs text-muted-foreground">{company.name}</span>
    </div>
  );
}
