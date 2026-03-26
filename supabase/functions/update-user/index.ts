import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!caller) throw new Error("Invalid token");

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();
    if (!callerRole) throw new Error("Not authorized");

    const { user_id, first_name, last_name, role, pole_ids, is_active } = await req.json();

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ first_name, last_name, is_active })
      .eq("user_id", user_id);
    if (profileError) throw profileError;

    // Update roles: delete then insert
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    const rolesToInsert = [{ user_id, role: "user" }];
    if (role === "admin") {
      rolesToInsert.push({ user_id, role: "admin" });
    }
    const { error: rolesError } = await supabaseAdmin.from("user_roles").insert(rolesToInsert);
    if (rolesError) throw rolesError;

    // Update poles: delete then insert
    await supabaseAdmin.from("user_poles").delete().eq("user_id", user_id);
    if (pole_ids && pole_ids.length > 0) {
      const { error: polesError } = await supabaseAdmin
        .from("user_poles")
        .insert(pole_ids.map((pid: string) => ({ user_id, pole_id: pid })));
      if (polesError) throw polesError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
