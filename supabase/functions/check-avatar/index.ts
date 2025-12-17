// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckAvatarRequest {
  imageUrl: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId }: CheckAvatarRequest = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ isValid: false, reason: "Không có ảnh avatar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.log("No LOVABLE_API_KEY, auto-approving avatar");
      return new Response(
        JSON.stringify({ isValid: true, reason: "Auto-approved (no API key)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sử dụng AI để kiểm tra avatar
    const systemPrompt = `Bạn là hệ thống AI kiểm tra avatar cho mạng xã hội nông nghiệp FUN FARM.

NHIỆM VỤ: Kiểm tra xem ảnh avatar có phải là ảnh NGƯỜI THẬT không.

CHẤP NHẬN:
- Ảnh chân dung người thật (selfie, ảnh thẻ, ảnh đời thường)
- Ảnh người đang làm việc, hoạt động
- Ảnh gia đình, nhóm người
- Ảnh người với phong cảnh, nông trại

TỪ CHỐI:
- Meme, ảnh chế, ảnh hài hước
- Ảnh hoạt hình, anime, cartoon
- Ảnh logo, biểu tượng
- Ảnh động vật đơn thuần (không có người)
- Ảnh phong cảnh không có người
- Ảnh sao chép từ người nổi tiếng (celebrity)
- Ảnh AI-generated rõ ràng
- Ảnh không phù hợp, bạo lực, khiêu dâm

TRẢ LỜI CHÍNH XÁC JSON:
{"isValid": true/false, "reason": "lý do ngắn gọn tiếng Việt"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Kiểm tra avatar này:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      // Nếu AI lỗi, auto-approve để không chặn user
      return new Response(
        JSON.stringify({ isValid: true, reason: "Auto-approved (API error)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", content);

    // Parse JSON từ response
    try {
      // Tìm JSON trong response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            isValid: result.isValid === true,
            reason: result.reason || "Đã kiểm tra"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
    }

    // Default nếu không parse được
    return new Response(
      JSON.stringify({ isValid: true, reason: "Đã kiểm tra avatar" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-avatar:", error);
    return new Response(
      JSON.stringify({ isValid: false, reason: "Lỗi hệ thống, vui lòng thử lại" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
