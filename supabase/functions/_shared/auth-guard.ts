import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validates that the caller is either:
 * 1. An authenticated user who is a member of the given workspace, OR
 * 2. Using the service role key (for cron/scheduled invocations)
 *
 * Returns { authorized: true, userId } on success, or a Response to return on failure.
 */
export async function validateCallerOrServiceRole(
  req: Request,
  workspaceId?: string
): Promise<{ authorized: true; userId: string | null } | { authorized: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // If the token IS the service role key, this is a cron/internal call — allow it
  if (token === serviceRoleKey) {
    return { authorized: true, userId: null };
  }

  // Otherwise validate as a user JWT
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const userId = claimsData.claims.sub as string;

  // If a workspace_id was provided, verify membership
  if (workspaceId) {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );
    const { data: membership } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return {
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
  }

  return { authorized: true, userId };
}
