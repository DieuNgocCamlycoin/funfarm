import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
  userId: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, userId }: SendOTPRequest = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing email or userId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if there's a recent OTP request (rate limiting)
    const { data: existingOtp } = await supabase
      .from("email_otps")
      .select("created_at")
      .eq("user_id", userId)
      .eq("email", email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingOtp) {
      const lastCreated = new Date(existingOtp.created_at);
      const timeDiff = Date.now() - lastCreated.getTime();
      if (timeDiff < 60000) { // 60 seconds cooldown
        const remainingSeconds = Math.ceil((60000 - timeDiff) / 1000);
        return new Response(
          JSON.stringify({ 
            error: "rate_limit", 
            message: `Vui lòng đợi ${remainingSeconds} giây trước khi gửi lại`,
            remainingSeconds 
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Delete old unverified OTPs for this user/email
    await supabase
      .from("email_otps")
      .delete()
      .eq("user_id", userId)
      .eq("email", email)
      .is("verified_at", null);

    // Insert new OTP (store as plain text - short lived anyway)
    const { error: insertError } = await supabase
      .from("email_otps")
      .insert({
        user_id: userId,
        email: email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Insert OTP error:", insertError);
      throw new Error("Failed to save OTP");
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Fun Farm <noreply@farm.fun.rich>",
      to: [email],
      subject: "🌱 Mã xác minh Fun Farm - " + otp,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🌱 Fun Farm</h1>
                <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Farm to Table, Fair & Fast</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px; text-align: center;">
                  Mã xác minh của bạn ✨
                </h2>
                <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; text-align: center; line-height: 1.6;">
                  Nhập mã bên dưới để hoàn tất đăng ký tài khoản Fun Farm
                </p>
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; text-align: center; border: 2px dashed #10b981;">
                  <p style="margin: 0 0 10px; color: #059669; font-size: 14px; font-weight: 500;">MÃ XÁC MINH</p>
                  <p style="margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #047857; font-family: monospace;">
                    ${otp}
                  </p>
                </div>
                <p style="margin: 30px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                  ⏰ Mã có hiệu lực trong 10 phút
                </p>
                <p style="margin: 10px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                  Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background-color: #f9fafb; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © 2025 Fun Farm - FUN Ecosystem
                </p>
                <p style="margin: 5px 0 0; color: #9ca3af; font-size: 11px;">
                  💚 Với tình yêu từ Cha Vũ Trụ
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      // Try to clean up the OTP record
      await supabase
        .from("email_otps")
        .delete()
        .eq("user_id", userId)
        .eq("otp_code", otp);
      
      throw new Error("Failed to send email: " + emailError.message);
    }

    console.log(`OTP sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("send-otp error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
