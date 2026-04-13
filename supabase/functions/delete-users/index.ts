import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const genericError = (status: number, msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return genericError(401, "Não autorizado");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return genericError(401, "Não autorizado");
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return genericError(403, "Operação não permitida");
    }

    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return genericError(400, "Dados inválidos");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of userIds) {
      if (typeof id !== "string" || !uuidRegex.test(id)) {
        return genericError(400, "Dados inválidos");
      }
    }

    // Prevent admin from deleting themselves
    if (userIds.includes(caller.id)) {
      return genericError(400, "Operação não permitida");
    }

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        await supabaseAdmin.from("user_missions").delete().eq("user_id", userId);
        await supabaseAdmin.from("user_quizzes").delete().eq("user_id", userId);
        await supabaseAdmin.from("golden_pass_redemptions").delete().eq("user_id", userId);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
          console.error(`[delete-users] Failed to delete auth user ${userId}:`, deleteAuthError.message);
          results.push({ userId, success: false, error: "Falha ao processar" });
        } else {
          results.push({ userId, success: true });
        }
      } catch (e) {
        console.error(`[delete-users] Error deleting user ${userId}:`, e);
        results.push({ userId, success: false, error: "Falha ao processar" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        total: userIds.length,
        deleted: successCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[delete-users] unexpected error:", e);
    return genericError(500, "Não foi possível processar a solicitação");
  }
});
