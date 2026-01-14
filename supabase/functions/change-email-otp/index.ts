import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChangeEmailRequest {
  userId: string;
  oldEmail: string;
  newEmail: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, oldEmail, newEmail }: ChangeEmailRequest = await req.json();

    console.log(`📧 Change email request: ${oldEmail} -> ${newEmail} for user ${userId}`);

    // Validate inputs
    if (!userId || !oldEmail || !newEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "missing_fields",
          message: "Vui lòng điền đầy đủ thông tin",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_email",
          message: "Email không hợp lệ",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if same email
    if (oldEmail.toLowerCase() === newEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "same_email",
          message: "Email mới phải khác email cũ",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Check if new email already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "email_exists",
          message: "Email này đã được sử dụng bởi tài khoản khác",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update email in auth.users
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
    });

    if (updateAuthError) {
      console.error("❌ Failed to update auth.users email:", updateAuthError);
      throw updateAuthError;
    }

    console.log("✅ Updated email in auth.users");

    // Update email in profiles table
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ email: newEmail, email_verified: false })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("❌ Failed to update profiles email:", updateProfileError);
      // Try to rollback auth.users email
      await supabaseAdmin.auth.admin.updateUserById(userId, { email: oldEmail });
      throw updateProfileError;
    }

    console.log("✅ Updated email in profiles");

    // Delete old OTPs for this user
    await supabaseAdmin
      .from("email_otps")
      .delete()
      .eq("user_id", userId);

    console.log("🗑️ Deleted old OTPs");

    // Generate and store new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: insertOTPError } = await supabaseAdmin.from("email_otps").insert({
      user_id: userId,
      email: newEmail,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString(),
    });

    if (insertOTPError) {
      console.error("❌ Failed to insert new OTP:", insertOTPError);
      throw insertOTPError;
    }

    console.log("✅ Created new OTP");

    // Send OTP email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác minh email mới - Fun Farm</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">🌱 FUN FARM</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Email mới của bạn</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding:32px;">
                    <h2 style="margin:0 0 16px;color:#1f2937;font-size:24px;text-align:center;">Mã xác minh của bạn</h2>
                    
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;text-align:center;line-height:1.6;">
                      Bạn vừa yêu cầu đổi email. Nhập mã bên dưới để xác minh email mới:
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:2px dashed #22c55e;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Mã OTP</p>
                      <p style="margin:0;font-size:36px;font-weight:700;color:#16a34a;letter-spacing:8px;font-family:monospace;">${otpCode}</p>
                    </div>
                    
                    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;text-align:center;">
                      ⏰ Mã có hiệu lực trong <strong>10 phút</strong>
                    </p>
                    
                    <!-- Warning -->
                    <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
                      <p style="margin:0;color:#92400e;font-size:13px;">
                        ⚠️ Nếu bạn không yêu cầu đổi email, vui lòng bỏ qua email này.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                      Email mới: <strong>${newEmail}</strong>
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:12px;">
                      © 2026 Fun Farm - Farmers rich, Eaters happy 🌾
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Fun Farm <noreply@farm.fun.rich>",
      to: [newEmail],
      subject: `🔐 Mã xác minh email mới: ${otpCode}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("❌ Failed to send email:", emailError);
      // Clean up OTP on email failure
      await supabaseAdmin.from("email_otps").delete().eq("user_id", userId);
      throw emailError;
    }

    console.log("📧 Sent OTP email to new address");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Đã gửi mã OTP đến email mới",
        email: newEmail,
        expires_at: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Change email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Không thể đổi email. Vui lòng thử lại sau.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
