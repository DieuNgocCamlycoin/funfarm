import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  userId: string;
  otp: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, userId, otp }: VerifyOTPRequest = await req.json();

    if (!email || !userId || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the latest OTP for this user/email
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("user_id", userId)
      .eq("email", email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log("OTP not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "invalid_otp", message: "Mã OTP không hợp lệ hoặc đã hết hạn" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase.from("email_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "expired", message: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      // Delete OTP after too many attempts
      await supabase.from("email_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "max_attempts", message: "Quá nhiều lần thử sai. Vui lòng yêu cầu mã mới." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from("email_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      const remainingAttempts = otpRecord.max_attempts - otpRecord.attempts - 1;
      return new Response(
        JSON.stringify({ 
          error: "wrong_otp", 
          message: `Mã OTP không đúng. Còn ${remainingAttempts} lần thử.`,
          remainingAttempts 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP is correct - mark as verified
    await supabase
      .from("email_otps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Update user profile to mark email as verified
    // Note: Only update email_verified column (email_verified_at doesn't exist in schema)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
      // Don't fail the request - OTP was verified
    }

    // Update auth user metadata (optional - may not work with service role)
    try {
      await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
    } catch (authError) {
      console.log("Could not update auth metadata:", authError);
      // This is optional, continue anyway
    }

    console.log(`Email verified successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email xác minh thành công! 🎉",
        verified: true
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("verify-otp error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
