import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "(••) •••••-••••";
  const last4 = digits.slice(-4);
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    return `(${ddd}) •••••-${last4}`;
  }
  return `•••••-${last4}`;
}

function fakeMaskedPhone(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  const last4 = String(Math.abs(hash) % 10000).padStart(4, "0");
  const ddd = String((Math.abs(hash >> 8) % 90) + 10);
  return `(${ddd}) •••••-${last4}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonResponse({ error: "Dados inválidos" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone, registration_type")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[get-reset-hint] profile lookup error:", profileError.message);
      // Return fake data to prevent enumeration — pretend it's a complete registration
      return jsonResponse({ maskedPhone: fakeMaskedPhone(normalizedEmail), requiresPhone: true });
    }

    if (!profile) {
      // User not found — return fake data to prevent enumeration
      return jsonResponse({ maskedPhone: fakeMaskedPhone(normalizedEmail), requiresPhone: true });
    }

    const hasPhone = !!profile.phone && profile.phone.replace(/\D/g, "").length >= 8;
    const isComplete = profile.registration_type === "complete";

    if (isComplete && hasPhone) {
      // Complete registration with phone — require phone confirmation
      return jsonResponse({ maskedPhone: maskPhone(profile.phone), requiresPhone: true });
    }

    // Simple registration or no phone — skip phone verification
    return jsonResponse({ maskedPhone: null, requiresPhone: false });
  } catch (err) {
    console.error("[get-reset-hint] unexpected error:", err);
    return jsonResponse({ error: "Não foi possível processar a solicitação" }, 500);
  }
});
