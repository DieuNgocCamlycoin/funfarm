import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type } = await req.json();
    
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ isValid: true, reason: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ isValid: true, reason: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Bạn là hệ thống kiểm duyệt nội dung cho FUN FARM - một nền tảng mạng xã hội nông sản sạch.

QUAN TRỌNG: Hãy KHOAN DUNG và chỉ từ chối nội dung RÕ RÀNG vi phạm.

Nội dung VI PHẠM (CHỈ từ chối những điều này):
- Spam rõ ràng: Nội dung lặp lại vô nghĩa, chỉ toàn ký tự đặc biệt vô nghĩa
- Thù địch/Xúc phạm: Chửi bới trực tiếp, kích động thù hận, đe dọa bạo lực
- Lừa đảo rõ ràng: Hứa hẹn giàu nhanh, đầu tư ảo, yêu cầu chuyển tiền
- Nội dung 18+: Khiêu dâm, bạo lực đẫm máu

Nội dung HỢP LỆ (CHẤP NHẬN tất cả những điều này):
- BẤT KỲ chia sẻ đời thường: cuộc sống, công việc, gia đình, bạn bè
- BẤT KỲ ảnh chụp: phong cảnh, con người, đồ ăn, sản phẩm, selfie
- BẤT KỲ câu chuyện cá nhân: vui, buồn, tâm sự
- BẤT KỲ lời chào, cảm ơn, chúc mừng, động viên
- Quảng cáo sản phẩm nông nghiệp, thực phẩm
- Hỏi đáp, thảo luận bình thường
- Biểu cảm như emoji, cảm xúc tích cực/tiêu cực bình thường

LƯU Ý: Nếu nội dung KHÔNG RÕ RÀNG vi phạm → CHẤP NHẬN (isValid: true)

Trả về JSON: {"isValid": true/false, "reason": "lý do ngắn gọn nếu vi phạm hoặc null nếu hợp lệ"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Kiểm tra ${type === 'comment' ? 'bình luận' : 'bài viết'} này:\n\n"${content}"` }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status);
      return new Response(
        JSON.stringify({ isValid: true, reason: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    
    // Parse JSON from AI response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // Default to valid if parsing fails
    return new Response(
      JSON.stringify({ isValid: true, reason: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ isValid: true, reason: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
