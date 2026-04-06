import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    // Check if user email matches the dispatcher email
    if (user.email === "natalijadjurkovicc@gmail.com") {
      // Check if already has dispecer role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "dispecer")
        .maybeSingle();

      if (!existingRole) {
        // Update existing role to dispecer
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "dispecer" })
          .eq("user_id", user.id);
      }

      return new Response(JSON.stringify({ role: "dispecer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the user's actual role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return new Response(JSON.stringify({ role: roleData?.role || "kupac" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
