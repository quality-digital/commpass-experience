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

/**
 * Strips all non-digit characters from a phone string for comparison.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, phone, newPassword } = await req.json();

    if (!email || !phone || !newPassword) {
      return genericError(400, "Dados inválidos");
    }

    if (newPassword.length < 6) {
      return genericError(400, "A senha deve ter pelo menos 6 caracteres");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 8) {
      // SECURITY: return generic error, don't hint what's wrong
      return genericError(400, "Dados inválidos");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, phone")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[reset-password] profile lookup error:", profileError.message);
      return genericError(500, "Não foi possível processar a solicitação");
    }

    // SECURITY: If user not found or phone doesn't match, return success to prevent enumeration
    if (!profile || !profile.phone) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storedPhone = normalizePhone(profile.phone);

    if (storedPhone !== normalizedPhone) {
      // SECURITY: return success to prevent enumeration
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Both email and phone match — update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
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
