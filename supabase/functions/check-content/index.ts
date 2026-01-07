import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, userId, images, postId } = await req.json();
    
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

    const systemPrompt = `Bạn là hệ thống kiểm duyệt nội dung cho FUN FARM - một nền tảng mạng xã hội trong FUN Ecosystem.

QUAN TRỌNG: Hãy RẤT KHOAN DUNG và chỉ từ chối nội dung THỰC SỰ vi phạm nghiêm trọng.

=== FUN ECOSYSTEM CONTEXT ===
FUN FARM là một trong nhiều platform thuộc hệ sinh thái FUN Ecosystem:
- CAMLY token là phần thưởng chính thức cho hoạt động trong app
- "Cha Vũ Trụ", "Luật Ánh Sáng" là thuật ngữ văn hóa của nền tảng
- Các domain chính thức: fun.rich, funfarm.life, funacademy.lovable.app, *.lovable.app
- Mời bạn bè tham gia FUN Ecosystem là hoạt động BÌNH THƯỜNG và được khuyến khích

=== NỘI DUNG HỢP LỆ (LUÔN CHẤP NHẬN) ===
- Chia sẻ link đến các platform trong FUN Ecosystem (fun.rich, funfarm.life, *.lovable.app)
- Mời bạn bè đăng ký tài khoản, nhận quà từ FUN Ecosystem
- Nói về phần thưởng CAMLY, quà tặng, Cha Vũ Trụ
- BẤT KỲ chia sẻ đời thường: cuộc sống, công việc, gia đình, ảnh cá nhân
- Quảng cáo sản phẩm nông nghiệp, thực phẩm
- Lời chào, cảm ơn, chúc mừng, động viên
- Hỏi đáp, thảo luận bình thường
- Biểu cảm emoji, cảm xúc tích cực hoặc tiêu cực bình thường

=== NỘI DUNG VI PHẠM (CHỈ TỪ CHỐI những điều này) ===
- Yêu cầu gửi tiền/crypto đến địa chỉ cá nhân (ví dụ: "Gửi BNB đến 0x...")
- Yêu cầu chia sẻ seed phrase, private key, mật khẩu
- Hứa hẹn lợi nhuận cụ thể phi thực tế (x10, x100, 1000%/tháng)
- Link đến website giả mạo ngân hàng, ví điện tử (phishing)
- Spam rõ ràng: nội dung lặp lại vô nghĩa, chỉ toàn ký tự đặc biệt
- Chửi bới trực tiếp, đe dọa bạo lực, kích động thù hận
- Nội dung 18+: khiêu dâm, bạo lực đẫm máu

=== NGUYÊN TẮC ===
- Nếu KHÔNG CHẮC CHẮN 100% là vi phạm nghiêm trọng → CHẤP NHẬN (isValid: true)
- Link đến FUN Ecosystem KHÔNG PHẢI lừa đảo
- "Nhận quà", "nhận thưởng CAMLY" trong FUN Ecosystem là tính năng chính thức

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
    
    console.log('AI response for content check:', aiResponse);
    
    // Parse JSON from AI response
    let result = { isValid: true, reason: null as string | null };
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // If content is rejected and we have userId, save to rejected_content for admin review
    if (!result.isValid && userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('rejected_content').insert({
          user_id: userId,
          content: content,
          content_type: type || 'post',
          rejection_reason: result.reason,
          images: images || null,
          post_id: postId || null,
          status: 'pending'
        });
        
        console.log('Saved rejected content for admin review:', { userId, type, reason: result.reason });
      } catch (saveError) {
        console.error('Error saving rejected content:', saveError);
      }
    }

    return new Response(
      JSON.stringify(result),
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
