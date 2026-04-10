import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuthResult {
  valid: boolean;
  workspaceId?: string;
  apiKeyId?: string;
  permissions?: string[];
  error?: string;
}

export async function validateApiKey(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey || apiKey.length < 32) {
    return { valid: false, error: "Missing or invalid API key" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Hash the key with Web Crypto API (SHA-256)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Look up the key
  const { data: keyRow, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, permissions, rate_limit_per_minute, is_active, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !keyRow) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!keyRow.is_active) {
    return { valid: false, error: "API key is deactivated" };
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Rate limiting check
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);

  const { data: usage } = await supabase
    .from("api_key_usage_log")
    .select("request_count")
    .eq("api_key_id", keyRow.id)
    .eq("endpoint", "memory-ingest")
    .gte("window_start", windowStart.toISOString())
    .maybeSingle();

  const currentCount = usage?.request_count || 0;
  if (currentCount >= keyRow.rate_limit_per_minute) {
    return { valid: false, error: "Rate limit exceeded" };
  }

  // Log usage (upsert for current minute window)
  await supabase.from("api_key_usage_log").upsert(
    {
      api_key_id: keyRow.id,
      endpoint: "memory-ingest",
      request_count: currentCount + 1,
      window_start: windowStart.toISOString(),
    },
    { onConflict: "api_key_id,endpoint,window_start", ignoreDuplicates: false }
  ).then(() => {
    // Also update last_used_at on the key
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id)
      .then(() => {});
  });

  return {
    valid: true,
    workspaceId: keyRow.workspace_id,
    apiKeyId: keyRow.id,
    permissions: keyRow.permissions,
  };
}
