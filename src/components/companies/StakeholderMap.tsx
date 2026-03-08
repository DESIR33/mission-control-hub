import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Shield, UserCheck } from "lucide-react";
import { useState } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

interface Stakeholder {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  vipTier: string;
  avatarUrl: string | null;
  influence: "decision_maker" | "champion" | "influencer" | "end_user";
}

function inferInfluence(role: string | null, vipTier: string): Stakeholder["influence"] {
  const r = (role || "").toLowerCase();
  if (r.includes("ceo") || r.includes("founder") || r.includes("director") || r.includes("vp") || r.includes("head"))
    return "decision_maker";
  if (vipTier === "platinum" || vipTier === "gold") return "champion";
  if (r.includes("manager") || r.includes("lead")) return "influencer";
  return "end_user";
}

export function StakeholderMap() {
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const { workspaceId } = useWorkspace();

  const { data: companyContacts = [] } = useQuery({
    queryKey: ["stakeholder-contacts", workspaceId, selectedCompanyId],
    queryFn: async () => {
      if (!workspaceId || !selectedCompanyId) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, role, vip_tier, avatar_url")
        .eq("workspace_id", workspaceId)
        .eq("company_id", selectedCompanyId)
        .is("deleted_at", null);
      return data ?? [];
    },
    enabled: !!workspaceId && !!selectedCompanyId,
  });

  const stakeholders: Stakeholder[] = companyContacts.map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name || ""}`.trim(),
    email: c.email,
    role: c.role,
    vipTier: c.vip_tier || "none",
    avatarUrl: c.avatar_url,
    influence: inferInfluence(c.role, c.vip_tier || "none"),
  }));

  const grouped = {
    decision_maker: stakeholders.filter((s) => s.influence === "decision_maker"),
    champion: stakeholders.filter((s) => s.influence === "champion"),
    influencer: stakeholders.filter((s) => s.influence === "influencer"),
    end_user: stakeholders.filter((s) => s.influence === "end_user"),
  };

  const influenceConfig = {
    decision_maker: { label: "Decision Makers", icon: <Crown className="h-4 w-4 text-amber-500" />, color: "destructive" as const },
    champion: { label: "Champions", icon: <Shield className="h-4 w-4 text-primary" />, color: "default" as const },
    influencer: { label: "Influencers", icon: <UserCheck className="h-4 w-4 text-blue-500" />, color: "secondary" as const },
    end_user: { label: "End Users", icon: <Users className="h-4 w-4 text-muted-foreground" />, color: "outline" as const },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Stakeholder Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a company..." />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCompanyId && stakeholders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No contacts linked to this company</p>
        ) : (
          Object.entries(grouped).map(([key, people]) => {
            if (people.length === 0) return null;
            const config = influenceConfig[key as keyof typeof influenceConfig];
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className="text-sm font-medium">{config.label}</span>
                  <Badge variant={config.color} className="text-xs ml-auto">{people.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {people.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatarUrl || ""} />
                        <AvatarFallback className="text-xs">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.role || p.email || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
