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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: subs, error: subsErr }, { data: ords, error: ordsErr }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("status", "active"),
      supabase.from("orders").select("*"),
    ]);

    if (subsErr) throw subsErr;
    if (ordsErr) throw ordsErr;

    console.log(`Fetched ${subs?.length ?? 0} subscriptions, ${ords?.length ?? 0} orders`);

    const res = await fetch("https://mlecniput-1.onrender.com/api/predict-demand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptions: subs || [],
        orders: ords || [],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`External API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("predict-demand error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
