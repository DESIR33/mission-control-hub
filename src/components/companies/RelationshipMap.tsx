import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, User, Building2, Handshake, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

interface RelationshipNode {
  id: string;
  type: "company" | "contact" | "deal";
  name: string;
  connections: { targetId: string; targetName: string; targetType: string; relation: string }[];
}

export function RelationshipMap() {
  const { workspaceId } = useWorkspace();

  const { data: nodes = [], isLoading } = useQuery<RelationshipNode[]>({
    queryKey: ["relationship-map", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const [companiesRes, contactsRes, dealsRes] = await Promise.all([
        (supabase as any).from("companies").select("id, name").eq("workspace_id", workspaceId).is("deleted_at", null).limit(30),
        (supabase as any).from("contacts").select("id, first_name, last_name, company_id").eq("workspace_id", workspaceId).is("deleted_at", null).limit(50),
        (supabase as any).from("deals").select("id, title, company_id, contact_id").eq("workspace_id", workspaceId).is("deleted_at", null).limit(30),
      ]);

      const companies = companiesRes.data || [];
      const contacts = contactsRes.data || [];
      const deals = dealsRes.data || [];

      const companyMap = new Map(companies.map((c: any) => [c.id, c.name]));
      const contactMap = new Map(contacts.map((c: any) => [c.id, `${c.first_name} ${c.last_name || ""}`.trim()]));

      const result: RelationshipNode[] = [];

      for (const company of companies) {
        const conns: RelationshipNode["connections"] = [];
        for (const contact of contacts) {
          if (contact.company_id === company.id) {
            conns.push({ targetId: contact.id, targetName: `${contact.first_name} ${contact.last_name || ""}`.trim(), targetType: "contact", relation: "employs" });
          }
        }
        for (const deal of deals) {
          if (deal.company_id === company.id) {
            conns.push({ targetId: deal.id, targetName: deal.title, targetType: "deal", relation: "has deal" });
          }
        }
        if (conns.length > 0) {
          result.push({ id: company.id, type: "company", name: company.name, connections: conns });
        }
      }

      // Add contacts with deals but no company node
      for (const contact of contacts) {
        const existingNode = result.find((n) => n.id === contact.id);
        if (!existingNode) {
          const conns: RelationshipNode["connections"] = [];
          for (const deal of deals) {
            if (deal.contact_id === contact.id) {
              conns.push({ targetId: deal.id, targetName: deal.title, targetType: "deal", relation: "owns deal" });
            }
          }
          if (contact.company_id && companyMap.has(contact.company_id)) {
            conns.push({ targetId: contact.company_id, targetName: companyMap.get(contact.company_id) || "Unknown", targetType: "company", relation: "works at" });
          }
          if (conns.length > 0) {
            result.push({ id: contact.id, type: "contact", name: `${contact.first_name} ${contact.last_name || ""}`.trim(), connections: conns });
          }
        }
      }

      return result.sort((a, b) => b.connections.length - a.connections.length);
    },
    enabled: !!workspaceId,
  });

  const typeIcons: Record<string, React.ReactNode> = {
    company: <Building2 className="h-3.5 w-3.5 text-blue-500" />,
    contact: <User className="h-3.5 w-3.5 text-green-500" />,
    deal: <Handshake className="h-3.5 w-3.5 text-amber-500" />,
  };

  const typeColors: Record<string, string> = {
    company: "border-blue-500/30 bg-blue-500/5",
    contact: "border-green-500/30 bg-green-500/5",
    deal: "border-amber-500/30 bg-amber-500/5",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          Relationship Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Building map...</p>
          ) : nodes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No relationships to display yet.</p>
          ) : (
            <div className="space-y-3">
              {nodes.slice(0, 15).map((node) => (
                <div key={node.id} className={`border rounded-lg p-3 ${typeColors[node.type]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {typeIcons[node.type]}
                    <span className="text-xs font-medium">{node.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                      {node.connections.length} links
                    </Badge>
                  </div>
                  <div className="space-y-1 pl-5">
                    {node.connections.slice(0, 5).map((conn) => (
                      <div key={conn.targetId} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span className="text-muted-foreground">{conn.relation}</span>
                        {typeIcons[conn.targetType]}
                        <span className="font-medium text-foreground truncate">{conn.targetName}</span>
                      </div>
                    ))}
                    {node.connections.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+{node.connections.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
