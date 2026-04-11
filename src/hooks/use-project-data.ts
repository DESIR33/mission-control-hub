import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export function useProjectExpenses(projectId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["project-expenses", projectId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      const { data, error } = await query("expenses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!projectId,
  });
}

export function useProjectRevenue(projectId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["project-revenue", projectId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      const { data, error } = await query("revenue_transactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!projectId,
  });
}

export function useProjectDeals(projectId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["project-deals", projectId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      const { data, error } = await query("deals")
        .select("*, companies(name, logo_url), contacts(first_name, last_name, email)")
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!projectId,
  });
}

export function useProjectContacts(projectId?: string) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["project-contacts", projectId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      const { data, error } = await query("project_contacts")
        .select("*, contacts(id, first_name, last_name, email, company, avatar_url)")
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!projectId,
  });

  const linkContact = useMutation({
    mutationFn: async ({ contactId, role }: { contactId: string; role?: string }) => {
      if (!workspaceId || !projectId) throw new Error("Missing context");
      const { error } = await query("project_contacts").insert({
        project_id: projectId,
        contact_id: contactId,
        workspace_id: workspaceId,
        role: role || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contact linked"); qc.invalidateQueries({ queryKey: ["project-contacts", projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkContact = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await query("project_contacts").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contact unlinked"); qc.invalidateQueries({ queryKey: ["project-contacts", projectId] }); },
  });

  return { ...contactsQuery, contacts: contactsQuery.data ?? [], linkContact, unlinkContact };
}

export function useProjectCompanies(projectId?: string) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ["project-companies", projectId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      const { data, error } = await query("project_companies")
        .select("*, companies(id, name, logo_url, industry, website)")
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!projectId,
  });

  const linkCompany = useMutation({
    mutationFn: async ({ companyId, role }: { companyId: string; role?: string }) => {
      if (!workspaceId || !projectId) throw new Error("Missing context");
      const { error } = await query("project_companies").insert({
        project_id: projectId,
        company_id: companyId,
        workspace_id: workspaceId,
        role: role || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company linked"); qc.invalidateQueries({ queryKey: ["project-companies", projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkCompany = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await query("project_companies").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company unlinked"); qc.invalidateQueries({ queryKey: ["project-companies", projectId] }); },
  });

  return { ...companiesQuery, companies: companiesQuery.data ?? [], linkCompany, unlinkCompany };
}
