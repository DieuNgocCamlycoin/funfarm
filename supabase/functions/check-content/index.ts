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

    const systemPrompt = `Bạn là hệ thống kiểm duyệt nội dung cho FUN FARM - một nền tảng nông sản sạch, nơi bà con nông dân chia sẻ sản phẩm và câu chuyện.

Nhiệm vụ: Phân tích nội dung và xác định có vi phạm hay không.

Nội dung VI PHẠM bao gồm:
- Spam: Nội dung lặp lại vô nghĩa, toàn ký tự đặc biệt, không có giá trị
- Tiêu cực: Xúc phạm, chửi bới, kích động thù địch, đe dọa
- Lừa đảo: Hứa hẹn lợi nhuận không thực, mời chào đầu tư ảo
- Không phù hợp: Nội dung người lớn, bạo lực, chính trị nhạy cảm

Nội dung HỢP LỆ bao gồm:
- Chia sẻ sản phẩm nông nghiệp thật
- Câu chuyện về cuộc sống nông thôn
- Hỏi đáp về canh tác, chăn nuôi
- Lời chào, cảm ơn, động viên tích cực
- Bình luận ngắn gọn nhưng chân thành

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
