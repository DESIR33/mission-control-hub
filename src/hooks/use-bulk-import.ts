import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface ImportJob {
  id: string;
  file_name: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  enriched_rows: number;
  errors: any[];
  field_mapping: Record<string, string>;
  created_at: string;
  completed_at: string | null;
}

export interface ParsedRow {
  [key: string]: string;
}

export function useImportJobs() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["import-jobs", workspaceId],
    queryFn: async (): Promise<ImportJob[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("import_jobs" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as ImportJob[];
    },
    enabled: !!workspaceId,
  });
}

export function useBulkImportContacts() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      rows: ParsedRow[];
      fieldMapping: Record<string, string>;
      fileName: string;
      enrichYouTube: boolean;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create import job
      const { data: job, error: jobError } = await supabase
        .from("import_jobs" as any)
        .insert({
          workspace_id: workspaceId,
          file_name: input.fileName,
          status: "processing",
          total_rows: input.rows.length,
          processed_rows: 0,
          enriched_rows: 0,
          field_mapping: input.fieldMapping,
        } as any)
        .select()
        .single();
      if (jobError) throw jobError;

      const errors: any[] = [];
      let processed = 0;
      let enriched = 0;

      for (const row of input.rows) {
        try {
          const contact: Record<string, any> = {
            workspace_id: workspaceId,
            created_by: user?.id,
            status: "lead",
          };

          // Map fields
          for (const [csvCol, dbField] of Object.entries(input.fieldMapping)) {
            if (row[csvCol] && dbField) {
              contact[dbField] = row[csvCol];
            }
          }

          if (!contact.first_name) {
            errors.push({ row: processed + 1, error: "Missing first_name" });
            processed++;
            continue;
          }

          // YouTube enrichment
          if (input.enrichYouTube && (contact.social_youtube || contact.website)) {
            try {
              const channelUrl = contact.social_youtube || contact.website;
              contact.enrichment_youtube = {
                source_url: channelUrl,
                enriched_at: new Date().toISOString(),
                status: "pending",
              };
              enriched++;
            } catch {
              // Skip enrichment errors
            }
          }

          // Calculate sponsor fit score
          const youtubeData = contact.enrichment_youtube as any;
          if (youtubeData?.subscriber_count) {
            const subCount = youtubeData.subscriber_count;
            let fitScore = 50;
            if (subCount >= 10000 && subCount <= 500000) fitScore += 20;
            if (contact.email) fitScore += 15;
            if (contact.company_id) fitScore += 15;
            contact.custom_fields = {
              ...(contact.custom_fields || {}),
              sponsor_fit_score: fitScore,
            };
          }

          const { error: insertError } = await supabase
            .from("contacts")
            .insert(contact);

          if (insertError) {
            errors.push({ row: processed + 1, error: insertError.message });
          }

          processed++;

          // Update job progress every 10 rows
          if (processed % 10 === 0) {
            await supabase
              .from("import_jobs" as any)
              .update({
                processed_rows: processed,
                enriched_rows: enriched,
              } as any)
              .eq("id", (job as any).id);
          }
        } catch (err: any) {
          errors.push({ row: processed + 1, error: err.message });
          processed++;
        }
      }

      // Finalize job
      await supabase
        .from("import_jobs" as any)
        .update({
          status: errors.length > 0 ? "completed_with_errors" : "completed",
          processed_rows: processed,
          enriched_rows: enriched,
          errors,
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", (job as any).id);

      return { processed, enriched, errors, jobId: (job as any).id };
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.processed} contacts (${data.enriched} enriched)`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });
}

export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}
