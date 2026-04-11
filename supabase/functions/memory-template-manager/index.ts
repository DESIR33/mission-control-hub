/**
 * Feature 8: Memory Templates & Workspace Snapshots
 * Export/import memory configurations as portable templates.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/api-key-auth.ts";
import { recordAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TemplateManifest {
  version: string;
  name: string;
  description?: string;
  folders: Array<{ name: string; description?: string; color?: string; children?: any[] }>;
  pipeline_configs: Array<{ event_type: string; is_enabled: boolean; default_retain_strategy?: string }>;
  mental_model_schemas: Array<{ name: string; model_type: string; description?: string; trigger_config?: Record<string, unknown> }>;
  webhook_configs: Array<{ name: string; event_types: string[] }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return json({ error: auth.error }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (req.method === "GET" || action === "export") {
      // EXPORT: Generate template manifest from current workspace config
      if (!auth.permissions?.includes("memory:write")) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      // Gather workspace configuration
      const [foldersRes, pipelinesRes, modelsRes, webhooksRes] = await Promise.all([
        supabase
          .from("memory_folders")
          .select("name, description, color, icon, parent_id")
          .eq("workspace_id", auth.workspaceId)
          .is("parent_id", null),
        supabase
          .from("memory_pipeline_config")
          .select("event_type, is_enabled, default_retain_strategy")
          .eq("workspace_id", auth.workspaceId),
        supabase
          .from("mental_models")
          .select("name, model_type, description, trigger_config")
          .eq("workspace_id", auth.workspaceId)
          .eq("status", "active"),
        supabase
          .from("memory_webhook_config")
          .select("name, event_types")
          .eq("workspace_id", auth.workspaceId)
          .eq("is_active", true),
      ]);

      const manifest: TemplateManifest = {
        version: "1.0.0",
        name: `Workspace Template - ${new Date().toISOString().split("T")[0]}`,
        folders: (foldersRes.data || []).map((f: any) => ({
          name: f.name,
          description: f.description,
          color: f.color,
        })),
        pipeline_configs: (pipelinesRes.data || []).map((p: any) => ({
          event_type: p.event_type,
          is_enabled: p.is_enabled,
          default_retain_strategy: p.default_retain_strategy,
        })),
        mental_model_schemas: (modelsRes.data || []).map((m: any) => ({
          name: m.name,
          model_type: m.model_type,
          description: m.description,
          trigger_config: m.trigger_config,
        })),
        webhook_configs: (webhooksRes.data || []).map((w: any) => ({
          name: w.name,
          event_types: w.event_types,
        })),
      };

      recordAudit(supabase, {
        workspace_id: auth.workspaceId!,
        action: "template.export",
        target_type: "template",
        actor_type: "api",
        actor_id: auth.apiKeyId,
      });

      return json({ manifest });
    }

    if (req.method === "POST" && action === "import") {
      // IMPORT: Apply template manifest to workspace
      if (!auth.permissions?.includes("memory:write")) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      const body = await req.json();
      const manifest: TemplateManifest = body.manifest;

      if (!manifest || !manifest.version) {
        return json({ error: "Invalid template manifest" }, 400);
      }

      const results = { folders: 0, pipelines: 0, models: 0, webhooks: 0, errors: [] as string[] };

      // Create folders
      for (const folder of manifest.folders || []) {
        const { error } = await supabase.from("memory_folders").insert({
          workspace_id: auth.workspaceId,
          name: folder.name,
          description: folder.description || null,
          color: folder.color || null,
        });
        if (error) {
          results.errors.push(`Folder "${folder.name}": ${error.message}`);
        } else {
          results.folders++;
        }
      }

      // Create pipeline configs
      for (const pipeline of manifest.pipeline_configs || []) {
        const { error } = await supabase.from("memory_pipeline_config").upsert({
          workspace_id: auth.workspaceId,
          event_type: pipeline.event_type,
          is_enabled: pipeline.is_enabled,
          default_retain_strategy: pipeline.default_retain_strategy || "atomic_facts",
        }, { onConflict: "workspace_id,event_type" });
        if (!error) results.pipelines++;
      }

      // Create mental model shells
      for (const model of manifest.mental_model_schemas || []) {
        const { error } = await supabase.from("mental_models").insert({
          workspace_id: auth.workspaceId,
          name: model.name,
          model_type: model.model_type,
          description: model.description || null,
          trigger_config: model.trigger_config || { min_new_observations: 5 },
          status: "active",
        });
        if (!error) results.models++;
      }

      recordAudit(supabase, {
        workspace_id: auth.workspaceId!,
        action: "template.import",
        target_type: "template",
        actor_type: "api",
        actor_id: auth.apiKeyId,
        metadata: { template_name: manifest.name, results },
      });

      return json({
        status: "imported",
        template_name: manifest.name,
        ...results,
      });
    }

    if (req.method === "POST" && action === "save") {
      // SAVE: Save manifest as a reusable template
      if (!auth.permissions?.includes("memory:write")) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      const body = await req.json();
      const { name, description, manifest, is_public = false } = body;

      if (!name || !manifest) {
        return json({ error: "name and manifest are required" }, 400);
      }

      const { data, error } = await supabase
        .from("memory_templates")
        .insert({
          workspace_id: auth.workspaceId,
          name,
          description: description || null,
          manifest,
          is_public,
        })
        .select("id")
        .single();

      if (error) {
        return json({ error: error.message }, 500);
      }

      return json({ status: "saved", template_id: data.id });
    }

    if (req.method === "GET" && action === "list") {
      // LIST: List available templates
      const { data } = await supabase
        .from("memory_templates")
        .select("id, name, description, is_public, version, created_at")
        .or(`workspace_id.eq.${auth.workspaceId},is_public.eq.true`)
        .order("created_at", { ascending: false });

      return json({ templates: data || [] });
    }

    return json({ error: "Invalid action. Use ?action=export|import|save|list" }, 400);
  } catch (error) {
    console.error("Template manager error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
