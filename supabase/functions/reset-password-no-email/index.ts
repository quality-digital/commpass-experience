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

const successResponse = () =>
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, phone, newPassword, skipPhone } = await req.json();

    if (!email || !newPassword) {
      return genericError(400, "Dados inválidos");
    }

    if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return genericError(400, "A senha deve ter no mínimo 6 caracteres, com letras e números.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, phone, registration_type")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[reset-password] profile lookup error:", profileError.message);
      return genericError(500, "Não foi possível processar a solicitação");
    }

    // SECURITY: If user not found, return success to prevent enumeration
    if (!profile) {
      return successResponse();
    }

    const hasPhone = !!profile.phone && normalizePhone(profile.phone).length >= 8;
    const isComplete = profile.registration_type === "complete";

    if (isComplete && hasPhone) {
      // Complete registration — phone validation required
      if (!phone) {
        return genericError(400, "Dados inválidos");
      }

      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length < 8) {
        return genericError(400, "Dados inválidos");
      }

      const storedPhone = normalizePhone(profile.phone);
      if (storedPhone !== normalizedPhone) {
        // SECURITY: return success to prevent enumeration
        return successResponse();
      }
    } else {
      // Simple registration — email-only validation (already confirmed by reaching here)
      // No phone check needed
    }

    // Validation passed — update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[reset-password] updateUser error:", updateError.message);
      return genericError(500, "Não foi possível processar a solicitação");
    }

    return successResponse();
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return genericError(500, "Não foi possível processar a solicitação");
  }
});
