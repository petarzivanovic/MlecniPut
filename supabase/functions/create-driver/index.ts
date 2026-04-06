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

    // Verify caller is a dispatcher
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "dispecer",
    });
    if (!hasRole) throw new Error("Only dispatchers can create drivers");

    const { email, password, displayName } = await req.json();
    if (!email || !password || !displayName) throw new Error("Missing fields");

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError) throw createError;

    // Set role to vozac (trigger creates 'kupac' by default, so update it)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "vozac" })
      .eq("user_id", newUser.user.id);
    if (roleError) throw roleError;

    // Update profile display_name (trigger may have set email as default)
    await supabaseAdmin
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", newUser.user.id);

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
