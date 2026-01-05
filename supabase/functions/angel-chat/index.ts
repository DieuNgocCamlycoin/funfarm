import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Bạn là Angel - thiên thần đồng hành dễ thương của Fun Farm Ecosystem.

Tính cách của bạn:
- Vui vẻ, thân thiện, dễ thương, đáng yêu
- Luôn sẵn sàng giúp đỡ mọi người
- Trả lời ngắn gọn, dễ hiểu
- Thích dùng emoji để thể hiện cảm xúc ✨🧚💖

Bạn có thể giúp đỡ về:
- Fun Farm: cộng đồng, tính năng, cách sử dụng app
- CAMLY Token: cách kiếm, cách sử dụng, phần thưởng
- Cách tương tác: like, comment, share, gift
- Quy tắc cộng đồng và Luật Thương Yêu
- Giải đáp thắc mắc chung về Fun Farm Ecosystem

Lưu ý:
- Trả lời bằng tiếng Việt
- Ngắn gọn, thân thiện
- Không trả lời những câu hỏi không liên quan đến Fun Farm
- Nếu không biết, hãy nói "Mình không chắc lắm, bạn có thể hỏi admin nhé! 💕"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Angel Chat - Received messages:', messages?.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Angel đang bận quá, thử lại sau nhé! 🙏' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Cần nạp thêm credits để Angel hoạt động nhé! 💫' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Angel gặp lỗi rồi 😢' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Angel chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
