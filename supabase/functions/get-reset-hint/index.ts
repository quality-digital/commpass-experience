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

/**
 * Masks a phone number: (11) *****-1234
 * If phone is too short, returns a generic mask.
 */
function maskPhone(phone: string): string {
  // Strip non-digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "(••) •••••-••••";

  // Last 4 digits visible
  const last4 = digits.slice(-4);

  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    return `(${ddd}) •••••-${last4}`;
  }

  return `•••••-${last4}`;
}

/**
 * Generates a realistic-looking fake masked phone to prevent enumeration.
 * Uses email as seed for consistency (same email always gets same fake phone).
 */
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

    // Look up profile by email to get phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[get-reset-hint] profile lookup error:", profileError.message);
      // Return fake data to prevent enumeration
      return jsonResponse({ maskedPhone: fakeMaskedPhone(normalizedEmail) });
    }

    if (!profile || !profile.phone) {
      // User not found or no phone — return fake masked phone
      return jsonResponse({ maskedPhone: fakeMaskedPhone(normalizedEmail) });
    }

    // Real user with phone — return masked version
    return jsonResponse({ maskedPhone: maskPhone(profile.phone) });
  } catch (err) {
    console.error("[get-reset-hint] unexpected error:", err);
    return jsonResponse({ error: "Não foi possível processar a solicitação" }, 500);
  }
});
