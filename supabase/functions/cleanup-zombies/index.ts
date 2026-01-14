import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧹 Starting zombie accounts cleanup...");

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`📅 Looking for unverified accounts created before: ${cutoffDate}`);

    // Find zombie accounts: email_verified = false AND created more than 7 days ago
    const { data: zombieProfiles, error: queryError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, created_at")
      .eq("email_verified", false)
      .lt("created_at", cutoffDate);

    if (queryError) {
      console.error("❌ Error querying zombie profiles:", queryError);
      throw queryError;
    }

    if (!zombieProfiles || zombieProfiles.length === 0) {
      console.log("✅ No zombie accounts found. Database is clean!");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No zombie accounts found",
          deleted_count: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🧟 Found ${zombieProfiles.length} zombie accounts to delete`);

    // Delete each zombie account from auth.users (cascades to profiles)
    let deletedCount = 0;
    const errors: string[] = [];

    for (const zombie of zombieProfiles) {
      try {
        console.log(`🗑️ Deleting user: ${zombie.id} (${zombie.email || 'no email'})`);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(zombie.id);
        
        if (deleteError) {
          console.error(`❌ Failed to delete ${zombie.id}:`, deleteError);
          errors.push(`${zombie.id}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`✅ Deleted: ${zombie.id}`);
        }
      } catch (err: any) {
        console.error(`❌ Error deleting ${zombie.id}:`, err);
        errors.push(`${zombie.id}: ${err.message}`);
      }
    }

    console.log(`🎉 Cleanup complete! Deleted ${deletedCount}/${zombieProfiles.length} zombie accounts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${deletedCount} zombie accounts`,
        deleted_count: deletedCount,
        total_found: zombieProfiles.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Cleanup zombies error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
