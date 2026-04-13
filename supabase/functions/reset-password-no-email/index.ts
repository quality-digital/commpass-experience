import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return genericError(400, "Dados inválidos");
    }

    if (newPassword.length < 6) {
      return genericError(400, "A senha deve ter pelo menos 6 caracteres");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email
    const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("[reset-password] listUsers error:", listError.message);
      return genericError(500, "Não foi possível processar a solicitação");
    }

    const user = userData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // SECURITY: Do NOT reveal that the email was not found.
      // Return success to prevent user enumeration.
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[reset-password] updateUser error:", updateError.message);
      return genericError(500, "Não foi possível processar a solicitação");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return genericError(500, "Não foi possível processar a solicitação");
  }
});
