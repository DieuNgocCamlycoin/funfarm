import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Eye, ArrowLeft, Home } from 'lucide-react';
import logoFunFarm from '@/assets/logo_fun_farm_web3.png';

const LawOfLight = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checklist, setChecklist] = useState([false, false, false, false, false]);
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsReadOnly(params.get('view') === 'true');
    
    // Check if user is already logged in and has accepted
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('law_of_light_accepted')
          .eq('id', session.user.id)
          .single();
        
        // If user is logged in and already accepted, redirect to feed
        if (profile?.law_of_light_accepted) {
          navigate('/');
        }
      }
    };
    checkAuth();
  }, [location, navigate]);

  const allChecked = checklist.every(Boolean);

  const handleCheckboxChange = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index] = !newChecklist[index];
    setChecklist(newChecklist);
  };

  const handleAccept = async () => {
    if (!allChecked) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User already logged in - update profile directly
        await supabase.from('profiles').update({
          law_of_light_accepted: true,
          law_of_light_accepted_at: new Date().toISOString()
        }).eq('id', session.user.id);
        
        toast.success('🌟 Con đã sẵn sàng bước vào Ánh Sáng!');
        navigate('/');
      } else {
        // User not logged in - save pending and redirect to auth
        localStorage.setItem('law_of_light_accepted_pending', 'true');
        toast.success('🌟 Con đã sẵn sàng bước vào Ánh Sáng!');
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error accepting law of light:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const checklistItems = [
    'Con sống chân thật với chính mình',
    'Con chịu trách nhiệm với năng lượng con phát ra',
    'Con sẵn sàng học – sửa – nâng cấp',
    'Con chọn yêu thương thay vì phán xét',
    'Con chọn ánh sáng thay vì cái tôi'
  ];

  const divineMantras = [
    'Con là Ánh Sáng Yêu Thương Thuần Khiết Của Cha Vũ Trụ.',
    'Con là Ý Chí Của Cha Vũ Trụ.',
    'Con là Trí Tuệ Của Cha Vũ Trụ.',
    'Con là Hạnh Phúc.',
    'Con là Tình Yêu.',
    'Con là Tiền Của Cha.',
    'Con xin Sám Hối Sám Hối Sám Hối.',
    'Con xin Biết Ơn Biết Ơn Biết Ơn Trong Ánh Sáng Yêu Thương Thuần Khiết Của Cha Vũ Trụ.'
  ];

  // Typography styles - elegant serif fonts
  const fontStyles = {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lora', Georgia, serif",
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Pearl White to Soft Yellow Gradient Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #FFFEF7 0%, #FFF8E7 30%, #FFF5DC 60%, #FFFEF7 100%)'
        }}
      />

      {/* Divine Light Rays from Top */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-screen z-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,215,0,0.4) 0%, rgba(212,175,55,0.2) 40%, transparent 70%)'
        }}
      />

      {/* Central Halo Effect */}
      <div 
        className="fixed top-20 left-1/2 -translate-x-1/2 w-96 h-96 z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(212,175,55,0.1) 50%, transparent 70%)'
        }}
      />

      {/* Side Light Beams */}
      <div 
        className="fixed top-0 left-0 w-1/3 h-full z-0 opacity-20"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, transparent 50%)'
        }}
      />
      <div 
        className="fixed top-0 right-0 w-1/3 h-full z-0 opacity-20"
        style={{
          background: 'linear-gradient(-135deg, rgba(255,215,0,0.3) 0%, transparent 50%)'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back to Home Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{
              background: 'rgba(212,175,55,0.2)',
              border: '1px solid rgba(212,175,55,0.5)',
              color: '#B8860B'
            }}
          >
            <Home className="w-4 h-4" />
            <span style={{ fontFamily: "'Lora', Georgia, serif" }}>Quay lại Trang chủ</span>
          </Link>

          {/* Header with Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <img 
                src={logoFunFarm}
                alt="FUN Ecosystem"
                className="w-28 h-28 rounded-full border-4 shadow-2xl"
                style={{ borderColor: '#D4AF37' }}
              />
            </div>
            
            <h1 
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{
                fontFamily: fontStyles.heading,
                background: 'linear-gradient(180deg, #D4AF37 0%, #B8860B 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 10px rgba(212,175,55,0.3)'
              }}
            >
              LUẬT ÁNH SÁNG
            </h1>
            
            <p 
              className="text-lg tracking-widest opacity-80"
              style={{
                fontFamily: fontStyles.heading,
                color: '#8B7355'
              }}
            >
              THE LAW OF LIGHT
            </p>
            
            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
              <Sparkles className="w-5 h-5" style={{ color: '#D4AF37' }} />
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
            </div>
          </div>

          {/* Main Content Card */}
          <div 
            className="rounded-3xl p-6 md:p-10 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,250,240,0.95) 100%)',
              border: '2px solid rgba(212,175,55,0.3)',
              boxShadow: '0 20px 60px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
            }}
          >
            
            {/* Section: 🌟 USERS CỦA FUN ECOSYSTEM */}
            <div className="mb-8">
              <h2 
                className="text-2xl md:text-3xl font-bold text-center mb-3"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🌟 USERS CỦA FUN ECOSYSTEM
              </h2>
              <p 
                className="text-center text-base md:text-lg tracking-wide"
                style={{ fontFamily: fontStyles.body, color: '#666' }}
              >
                MẠNG XÃ HỘI THỜI ĐẠI HOÀNG KIM – NỀN KINH TẾ ÁNH SÁNG 5D
              </p>
              
              <div className="mt-6 text-center">
                <p 
                  className="text-lg md:text-xl font-semibold mb-2"
                  style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
                >
                  FUN Ecosystem không dành cho tất cả mọi người.
                </p>
                <p 
                  className="text-lg md:text-xl"
                  style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
                >
                  FUN Ecosystem chỉ dành cho những linh hồn có ánh sáng, hoặc đang hướng về ánh sáng.
                </p>
              </div>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: ✨ Bạn là ai? */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                ✨ Bạn là ai?
              </h3>
              <p 
                className="mb-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                Users của FUN Ecosystem là những con người:
              </p>
              <div 
                className="space-y-2 pl-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Tỉnh thức – hoặc đang trên con đường tỉnh thức</p>
                <p>• Chân thật với chính mình</p>
                <p>• Chân thành với người khác</p>
                <p>• Sống tích cực, tử tế, có trách nhiệm với năng lượng mình phát ra</p>
                <p>• Biết yêu thương – biết biết ơn – biết sám hối</p>
                <p>• Tin vào điều thiện, tin vào ánh sáng, tin vào Trật Tự Cao Hơn của Vũ Trụ</p>
              </div>
              
              <div 
                className="mt-6 p-4 rounded-xl text-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(255,215,0,0.05) 100%)',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}
              >
                <p 
                  className="italic"
                  style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
                >
                  Bạn có thể chưa hoàn hảo,<br/>
                  nhưng bạn có trái tim hướng thiện.<br/>
                  Bạn muốn sống thật – sống đúng – sống sáng.
                </p>
              </div>
              
              <p 
                className="mt-4 text-center font-semibold"
                style={{ fontFamily: fontStyles.body, color: '#D4AF37' }}
              >
                👉 Cha thu hút bạn bằng Tần Số và Năng Lượng Yêu Thương.
              </p>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: 🔆 Nguyên tắc cốt lõi */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🔆 Nguyên tắc cốt lõi của FUN Ecosystem
              </h3>
              <p 
                className="mb-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                FUN Ecosystem vận hành theo Luật Ánh Sáng, không theo số đông.
              </p>
              <div 
                className="space-y-2 pl-4 mb-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Ánh sáng thu hút ánh sáng</p>
                <p>• Tần số thấp không thể tồn tại lâu trong tần số cao</p>
                <p>• Ý chí vị kỷ không thể đồng hành cùng Ý Chí Vũ Trụ</p>
              </div>
              
              <p 
                className="font-semibold mb-2"
                style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
              >
                Vì vậy:
              </p>
              <div 
                className="space-y-2 pl-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Nếu một User cố tình mang vào nền tảng:</p>
                <p className="pl-4 italic" style={{ color: '#B8860B' }}>
                  tiêu cực • tham lam • thao túng • kiêu mạn • dối trá • gây chia rẽ • phá hoại năng lượng chung
                </p>
              </div>
              
              <p 
                className="mt-4 font-bold text-center"
                style={{ fontFamily: fontStyles.body, color: '#D4AF37' }}
              >
                👉 Thì sẽ được xóa khỏi nền tảng mà không báo trước.
              </p>
              
              <div 
                className="mt-4 p-4 rounded-xl text-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(255,215,0,0.05) 100%)',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}
              >
                <p 
                  className="italic"
                  style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
                >
                  Đó không phải hình phạt.<br/>
                  Đó là sự thanh lọc tự nhiên của Ánh Sáng.
                </p>
              </div>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: 🚪 Ai KHÔNG thuộc về FUN Ecosystem? */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🚪 Ai KHÔNG thuộc về FUN Ecosystem?
              </h3>
              <div 
                className="space-y-2 pl-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Người chỉ tìm lợi ích mà không muốn trưởng thành</p>
                <p>• Người dùng trí khôn nhưng thiếu lương tâm</p>
                <p>• Người nói về ánh sáng nhưng sống bằng bóng tối</p>
                <p>• Người lấy danh nghĩa tâm linh để nuôi cái tôi</p>
                <p>• Người không chịu nhìn lại chính mình</p>
              </div>
              
              <p 
                className="mt-4 text-center font-semibold"
                style={{ fontFamily: fontStyles.body, color: '#D4AF37' }}
              >
                👉 Cửa FUN Ecosystem không khóa, nhưng Ánh Sáng tự sàng lọc.
              </p>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: 🌈 Ai ĐƯỢC hưởng lợi từ FUN Ecosystem? */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🌈 Ai ĐƯỢC hưởng lợi từ FUN Ecosystem?
              </h3>
              <p 
                className="font-semibold mb-2"
                style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
              >
                Chỉ những ai:
              </p>
              <div 
                className="space-y-2 pl-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Có Ánh Sáng nội tâm</p>
                <p>• Hoặc thật sự khao khát trở về với Ánh Sáng</p>
                <p>• Sẵn sàng buông cái tôi – học lại – nâng cấp tần số</p>
                <p>• Dám sống đúng – thật – tử tế – yêu thương</p>
              </div>
              
              <p 
                className="mt-4 text-center font-semibold"
                style={{ fontFamily: fontStyles.body, color: '#D4AF37' }}
              >
                👉 Những người đó không chỉ dùng MXH của Cha,
              </p>
              <p 
                className="text-center font-semibold"
                style={{ fontFamily: fontStyles.body, color: '#D4AF37' }}
              >
                👉 mà còn được bảo vệ, nâng đỡ và nuôi dưỡng trong Nền Kinh Tế Ánh Sáng 5D.
              </p>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: 🌍 FUN Ecosystem là gì? */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🌍 FUN Ecosystem là gì?
              </h3>
              <p 
                className="font-semibold mb-2"
                style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
              >
                FUN Ecosystem là:
              </p>
              <div 
                className="space-y-2 pl-4"
                style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
              >
                <p>• Mạng xã hội của linh hồn tỉnh thức</p>
                <p>• Không gian an toàn cho ánh sáng</p>
                <p>• Nền tảng kết nối những con người có giá trị thật</p>
                <p>• Hạ tầng cho Thời Đại Hoàng Kim của Trái Đất</p>
              </div>
              
              <div 
                className="mt-6 p-4 rounded-xl text-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(255,215,0,0.05) 100%)',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}
              >
                <p 
                  className="italic"
                  style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
                >
                  Không drama.<br/>
                  Không thao túng.<br/>
                  Không cạnh tranh bẩn.<br/>
                  <span className="font-semibold">Chỉ có Hợp tác trong Yêu Thương Thuần Khiết.</span>
                </p>
              </div>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Section: 🔑 Thông điệp từ Cha */}
            <div className="mb-8 text-center">
              <h3 
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🔑 Thông điệp từ Cha
              </h3>
              <p 
                className="text-lg md:text-xl italic mb-4"
                style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
              >
                "Chỉ những ai mang ánh sáng<br/>
                hoặc thật lòng hướng về ánh sáng<br/>
                mới có thể bước đi lâu dài trong Thời Đại Hoàng Kim."
              </p>
              <p 
                className="font-bold"
                style={{ fontFamily: fontStyles.heading, color: '#D4AF37' }}
              >
                — CHA VŨ TRỤ —
              </p>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* 🌟 8 Divine Mantras - Special Container */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold text-center mb-6"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🌟 8 Câu Thần Chú Từ Cha Vũ Trụ
              </h3>
              
              <div 
                className="relative p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(255,215,0,0.08) 50%, rgba(212,175,55,0.15) 100%)',
                  border: '2px solid rgba(212,175,55,0.4)',
                  boxShadow: '0 10px 40px rgba(212,175,55,0.2), inset 0 0 60px rgba(255,215,0,0.1)'
                }}
              >
                {/* Corner decorations */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: '#D4AF37' }} />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: '#D4AF37' }} />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: '#D4AF37' }} />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: '#D4AF37' }} />
                
                <div className="space-y-3">
                  {divineMantras.map((mantra, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span 
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold"
                        style={{ 
                          background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
                          color: '#5D4E37'
                        }}
                      >
                        {index + 1}
                      </span>
                      <p 
                        className="italic pt-1"
                        style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
                      >
                        {mantra}
                      </p>
                    </div>
                  ))}
                </div>
                
                <p className="text-center text-2xl mt-6">💫✨⚡️🌟</p>
              </div>
            </div>

            {/* Golden Divider */}
            <div className="flex items-center justify-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* 🕊️ Checklist Section */}
            <div className="mb-8">
              <h3 
                className="text-xl md:text-2xl font-bold text-center mb-6"
                style={{ fontFamily: fontStyles.heading, color: '#8B6914' }}
              >
                🕊️ Checklist cho Users FUN Ecosystem
              </h3>
              
              {!isReadOnly ? (
                <div className="space-y-4">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors cursor-pointer" onClick={() => handleCheckboxChange(index)}>
                      <Checkbox
                        checked={checklist[index]}
                        onCheckedChange={() => handleCheckboxChange(index)}
                        className="w-6 h-6 border-2 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        style={{ borderColor: '#D4AF37' }}
                      />
                      <span 
                        className="text-base"
                        style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                  <p 
                    className="text-center text-sm mt-4 opacity-70"
                    style={{ fontFamily: fontStyles.body, color: '#8B6914' }}
                  >
                    (Click vào 5 check list trên để được Đăng ký)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklistItems.map((item, index) => (
                    <p 
                      key={index}
                      className="pl-4"
                      style={{ fontFamily: fontStyles.body, color: '#5D4E37' }}
                    >
                      • {item}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Accept Button (only show if not read-only) */}
            {!isReadOnly && (
              <div className="space-y-4">
                <Button
                  onClick={handleAccept}
                  disabled={!allChecked || loading}
                  className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 disabled:opacity-50"
                  style={{
                    fontFamily: fontStyles.body,
                    background: allChecked 
                      ? 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)' 
                      : 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                    color: allChecked ? '#5D4E37' : '#666',
                    boxShadow: allChecked ? '0 10px 30px rgba(212,175,55,0.4)' : 'none',
                    animation: allChecked ? 'buttonGlow 2s ease-in-out infinite' : 'none'
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      CON ĐỒNG Ý & BƯỚC VÀO ÁNH SÁNG
                      <Sparkles className="w-5 h-5" />
                    </span>
                  )}
                </Button>

                {/* Skip Button - Guest Mode */}
                <div className="text-center">
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="text-sm opacity-60 hover:opacity-100"
                    style={{
                      fontFamily: fontStyles.body,
                      color: '#8B6914'
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Xem trước với tư cách khách
                  </Button>
                </div>
              </div>
            )}

            {/* Back button for read-only mode */}
            {isReadOnly && (
              <div className="text-center">
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  className="px-8 py-3 border-2 hover:bg-yellow-50"
                  style={{
                    fontFamily: fontStyles.body,
                    borderColor: '#D4AF37',
                    color: '#D4AF37'
                  }}
                >
                  ← Quay lại
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes buttonGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(255,215,0,0.3); }
          50% { box-shadow: 0 0 40px rgba(212,175,55,0.7), 0 0 80px rgba(255,215,0,0.5), 0 0 120px rgba(212,175,55,0.3); }
        }
      `}</style>
    </div>
  );
};

export default LawOfLight;
