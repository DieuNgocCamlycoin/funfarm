import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sprout, 
  Users, 
  Target,
  Gift, 
  Shield, 
  Heart,
  ArrowLeft,
  FileText,
  Sparkles,
  ArrowRight,
  Star,
  TrendingUp,
  Palette,
  CheckCircle,
  Zap,
  Globe,
  ShoppingCart,
  Video,
  Award,
  Coins,
  Bot,
  Eye,
  Leaf
} from 'lucide-react';
import logoFunFarm from '@/assets/branding/fun-farm-logo-2-transparent.png';

const AboutFunFarm = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Home Button */}
        <Link to="/" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Quay lại Trang chủ
        </Link>
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM Web3" 
              className="w-32 h-32 rounded-full object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-green-700 mb-3">
            FUN FARM Web3
          </h1>
          <p className="text-2xl font-semibold text-yellow-600 mb-2">
            🌱 Farmers rich, Eaters happy 🌱
          </p>
          <p className="text-lg text-green-600 font-medium mb-2">
            Farm to Table · Fair & Fast · Free-Fee & Earn
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Domain: <span className="font-semibold text-green-700">Farm.Fun.Rich</span>
          </p>
          <p className="text-base text-gray-700 italic">
            Nền nông nghiệp thăng hoa & tỏa sáng bằng Blockchain, Crypto và Angel AI
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-green-200 shadow-xl">
          <CardContent className="p-6">
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              <strong className="text-green-700">FUN FARM WEB3</strong> là một platform trong FUN Ecosystem, 
              được tạo ra để kết nối trực tiếp "từ gốc đến bàn ăn": từ nhà nông, nông trại, biển khơi, 
              chuồng trại… đến thẳng người tiêu dùng và các đơn vị tiêu thụ nông sản trên toàn cầu.
            </p>
            <p className="text-gray-700 mb-4">
              Không còn những tầng trung gian làm mờ giá trị thật của nông nghiệp.
              Không còn cảnh "người trồng khổ – người ăn đắt", mà trở thành:
            </p>
            <p className="text-2xl font-bold text-center text-green-600 mb-4">
              "Người trồng Giàu – Người ăn Vui"
            </p>
            <p className="text-gray-700 mb-4">
              FUN FARM mở ra một kỷ nguyên mới: nông nghiệp minh bạch – công bằng – hạnh phúc – giàu có.
            </p>
            <p className="text-center text-gray-600 italic">
              😄 Một câu vui nhẹ: nông sản đi đường thẳng, không đi đường vòng… 
              nên cả nông dân lẫn người ăn đều thấy đời dễ thương hẳn ra.
            </p>
          </CardContent>
        </Card>

        {/* Sacred Mission Section */}
        <Card className="mb-8 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-6 text-center flex items-center justify-center gap-2">
              <Target className="w-7 h-7 text-yellow-500" />
              Sứ mệnh thiêng liêng của FUN FARM
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-4 bg-white/60 rounded-xl">
                <div className="p-2 rounded-full bg-green-500 text-white shrink-0">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-green-700">1. Đưa nông sản đến đúng người cần</h3>
                  <p className="text-gray-600 text-sm">
                    Kết nối mọi sản phẩm nông nghiệp sạch, hữu cơ, chất lượng cao… từ nơi sản xuất đến đúng người tiêu thụ.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/60 rounded-xl">
                <div className="p-2 rounded-full bg-green-500 text-white shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-green-700">2. Tạo thị trường rộng lớn 360 độ</h3>
                  <ul className="text-gray-600 text-sm list-disc list-inside space-y-1 mt-1">
                    <li>Nhà vườn bán nhanh hơn, mạnh hơn, hàng tươi hơn – ngon hơn</li>
                    <li>Thời gian vận chuyển ngắn hơn, lan tỏa mạnh trong khu vực và toàn cầu</li>
                    <li>Phân bố sản phẩm đồng đều, không còn dồn ứ nơi thừa – khan hiếm nơi thiếu</li>
                    <li>Nông sản được tiêu thụ mạnh nhờ uy tín và tình yêu</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/60 rounded-xl">
                <div className="p-2 rounded-full bg-green-500 text-white shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-green-700">3. Phục hồi phẩm giá & sự thịnh vượng của người làm nông</h3>
                  <p className="text-gray-600 text-sm">
                    Người trồng, người nuôi, người đánh bắt được trả đúng giá trị lao động và tình yêu họ đặt vào đất – nước – cây – con.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/60 rounded-xl">
                <div className="p-2 rounded-full bg-green-500 text-white shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-green-700">4. Người tiêu dùng được dùng sản phẩm tươi ngon</h3>
                  <p className="text-gray-600 text-sm">
                    Ăn đúng chất – sống an lành – vui khỏe mỗi ngày. Không chất bảo quản.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Agricultural Social Network */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center flex items-center justify-center gap-2">
              <Users className="w-7 h-7 text-blue-500" />
              FUN FARM là "mạng xã hội nông nghiệp mở"
            </h2>
            
            <p className="text-gray-700 mb-4 text-center">
              FUN FARM không chỉ là một khu chợ. Đây là mạng xã hội Web3, nơi mỗi nông trại, nhà vườn, 
              ngư dân, người tiêu dùng, nhà phân phối, nhà hàng… đều có:
            </p>

            <div className="grid md:grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Shield className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-blue-700">Profile blockchain</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Eye className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-blue-700">Lịch sử hoạt động minh bạch</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Star className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-blue-700">Uy tín tích lũy thành tài sản số</p>
              </div>
            </div>

            <p className="text-gray-700 mb-3 font-medium">Trên FUN FARM, mọi người có thể:</p>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                { icon: ShoppingCart, text: "Đăng sản phẩm tại vườn / tại gốc / tại chuồng / tại biển" },
                { icon: Leaf, text: "Chia sẻ quy trình chăm sóc – nuôi trồng – thu hoạch" },
                { icon: Video, text: "Livestream tại vườn, tại trại, tại thuyền" },
                { icon: Zap, text: "Kết nối đơn hàng trực tiếp" },
                { icon: Award, text: "Xây dựng farmer brand (thương hiệu cá nhân nông nghiệp)" },
                { icon: Users, text: "Tạo cộng đồng khách hàng trung thành" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
                  <item.icon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Review & Reward Section */}
        <Card className="mb-8 bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-300 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-yellow-700 mb-4 text-center flex items-center justify-center gap-2">
              <Star className="w-7 h-7 text-yellow-500" />
              Cơ chế "Review & Reward" tạo lực kinh tế khổng lồ
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white/70 rounded-xl">
                <h3 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                  <Eye className="w-5 h-5" /> Review minh bạch
                </h3>
                <p className="text-sm text-gray-600">
                  Người mua đánh giá thật, không thể sửa – không thể xóa
                </p>
              </div>
              <div className="p-4 bg-white/70 rounded-xl">
                <h3 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                  <Gift className="w-5 h-5" /> Reward tự động
                </h3>
                <p className="text-sm text-gray-600">
                  Hệ thống tặng FUN Money cho mọi đóng góp giá trị
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700">• Nhà nông có sản phẩm tốt → review tốt → uy tín tăng → lên top search → <strong>bán mạnh hơn</strong></p>
              <p className="text-sm text-gray-700">• Người tiêu dùng review chân thật → <strong>nhận thưởng</strong></p>
              <p className="text-sm text-gray-700">• Nhà hàng giới thiệu nguồn rau sạch → <strong>nhận thưởng</strong></p>
              <p className="text-sm text-gray-700">• Nhà phân phối kết nối điểm bán mới → <strong>nhận thưởng</strong></p>
            </div>

            <p className="text-center mt-4 font-semibold text-yellow-700 italic">
              Uy tín trở thành tài sản số, càng làm thật – càng giàu bền theo thời gian.
            </p>
          </CardContent>
        </Card>

        {/* Free-Fee & Earn Section */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-green-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center flex items-center justify-center gap-2">
              <Gift className="w-7 h-7 text-green-500" />
              Không thu phí trung gian – còn tặng thưởng cho user
            </h2>

            <div className="text-center p-4 bg-green-50 rounded-xl mb-6 border border-green-200">
              <p className="text-green-700 font-medium">
                Platform không lấy của ai một đồng phí trung gian.<br/>
                Platform còn "bơm thưởng" để thị trường tự lớn lên bằng tình yêu.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <h3 className="font-bold text-green-700 mb-2">1️⃣ Join & Earn</h3>
                <p className="text-sm text-gray-600">
                  Tham gia FUN FARM, tạo profile, xác thực danh tính (nhà nông / nhà vườn / ngư dân / người mua / nhà hàng / phân phối…) → nhận thưởng chào mừng.
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <h3 className="font-bold text-green-700 mb-2">2️⃣ Use & Earn</h3>
                <p className="text-sm text-gray-600 mb-2">Mỗi hành động tạo giá trị đều có thưởng:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <span>• Đăng sản phẩm & Earn</span>
                  <span>• Chia sẻ quy trình & Earn</span>
                  <span>• Kết nối đơn hàng & Earn</span>
                  <span>• Review công tâm & Earn</span>
                  <span>• Giới thiệu người mới & Earn</span>
                  <span>• Tạo cộng đồng & Earn</span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <h3 className="font-bold text-green-700 mb-2">3️⃣ Grow & Earn</h3>
                <p className="text-sm text-gray-600">
                  Khi nhà nông nâng chất lượng đất, nước, giống, quy trình… → giá trị tăng → uy tín tăng → doanh thu tăng → thưởng tăng.
                </p>
                <p className="text-xs text-gray-500 italic mt-1">
                  ("Grow" vừa là trồng trọt, vừa là tăng trưởng ý thức.)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Angel AI Section */}
        <Card className="mb-8 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center flex items-center justify-center gap-2">
              <Bot className="w-7 h-7 text-purple-500" />
              Angel AI – Trí tuệ thiên thần đứng sau sự kết nối
            </h2>

            <p className="text-gray-700 text-center mb-4">
              Angel AI trong FUN FARM đóng vai trò "thiên thần vận hành":
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Gợi ý kết nối cung – cầu tối ưu theo vị trí, nhu cầu, mùa vụ",
                "Dự báo sản lượng và nhu cầu thị trường",
                "Hỗ trợ nhà nông viết mô tả sản phẩm, kể câu chuyện nông trại",
                "Tự động tạo nội dung marketing đa ngôn ngữ",
                "Phát hiện gian dối, spam, thao túng review"
              ].map((text, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                  <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>

            <p className="text-center mt-4 text-purple-700 font-medium italic">
              Angel AI giúp mọi người làm nông nhẹ hơn – bán hàng thông minh hơn – sống sung túc hơn.
            </p>
          </CardContent>
        </Card>

        {/* Blockchain Section */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-cyan-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-cyan-700 mb-4 text-center flex items-center justify-center gap-2">
              <Shield className="w-7 h-7 text-cyan-500" />
              Blockchain minh bạch hóa toàn bộ hành trình nông sản
            </h2>

            <p className="text-gray-700 text-center mb-4">
              Mọi sản phẩm đều có nguồn gốc rõ ràng bằng blockchain, đi kèm:
            </p>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <Video className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                <p className="text-sm text-gray-700">Video / hình ảnh thực tế</p>
              </div>
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <FileText className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                <p className="text-sm text-gray-700">Nhật ký nuôi trồng – chăm sóc</p>
              </div>
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <Star className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                <p className="text-sm text-gray-700">Review không thể làm giả</p>
              </div>
            </div>

            <p className="text-center text-cyan-700 font-semibold">
              → Minh bạch từ gốc tới bàn ăn
            </p>
          </CardContent>
        </Card>

        {/* Socio-Economic Impact */}
        <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-teal-100 border-2 border-emerald-300 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-emerald-700 mb-6 text-center flex items-center justify-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-500" />
              Tác động kinh tế – xã hội của FUN FARM
            </h2>

            <p className="text-gray-700 text-center mb-4">FUN FARM tạo hiệu ứng dây chuyền cực lớn:</p>

            <div className="space-y-4">
              <div className="p-4 bg-white/70 rounded-xl">
                <h3 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                  <Coins className="w-5 h-5" /> 1. Giảm chi phí, tăng lợi nhuận cho cả hai phía
                </h3>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>Nhà nông bán đúng giá trị</li>
                  <li>Người tiêu dùng mua đúng giá thật</li>
                  <li>Lãng phí do qua nhiều tầng trung gian giảm mạnh</li>
                </ul>
              </div>

              <div className="p-4 bg-white/70 rounded-xl">
                <h3 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5" /> 2. Nâng chuẩn chất lượng nông sản toàn cầu
                </h3>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>Ai làm thật, sạch, tử tế → được tôn vinh</li>
                  <li>Ai làm dối → bị blockchain "soi sáng"</li>
                </ul>
              </div>

              <div className="p-4 bg-white/70 rounded-xl">
                <h3 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                  <Leaf className="w-5 h-5" /> 3. Tạo hệ sinh thái nông nghiệp giàu có, bền vững
                </h3>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>Nông nghiệp trở thành ngành hấp dẫn</li>
                  <li>Người trẻ có động lực quay về đất</li>
                  <li>Trái Đất được chăm sóc bằng tình yêu</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors & Soul Section */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-green-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center flex items-center justify-center gap-2">
              <Palette className="w-7 h-7 text-green-500" />
              Màu sắc & linh hồn của FUN FARM
            </h2>

            <p className="text-gray-700 text-center mb-4">Logo FUN FARM mang bốn năng lượng:</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-green-100 rounded-lg border-2 border-green-300">
                <div className="w-10 h-10 mx-auto rounded-full bg-green-500 mb-2" />
                <p className="text-sm font-medium text-green-700">Xanh lá</p>
                <p className="text-xs text-gray-600">Sự sống, mầm cây, chữa lành</p>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-500 mb-2" />
                <p className="text-sm font-medium text-blue-700">Xanh biển</p>
                <p className="text-xs text-gray-600">Nguồn nước, đại dương, cân bằng</p>
              </div>
              <div className="text-center p-3 bg-yellow-100 rounded-lg border-2 border-yellow-300">
                <div className="w-10 h-10 mx-auto rounded-full bg-yellow-500 mb-2" />
                <p className="text-sm font-medium text-yellow-700">Vàng đất</p>
                <p className="text-xs text-gray-600">Phì nhiêu, no đủ, nền tảng</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg border-2 border-yellow-400">
                <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 mb-2 animate-pulse" />
                <p className="text-sm font-medium text-yellow-700">Lấp lánh</p>
                <p className="text-xs text-gray-600">Thịnh vượng mới</p>
              </div>
            </div>

            <p className="text-center text-green-700 font-medium italic">
              FUN FARM là nông nghiệp thăng hoa — không chỉ cho cái ăn, mà cho cả ý thức – phẩm giá – tình thương của nhân loại.
            </p>
          </CardContent>
        </Card>

        {/* Community Checklist */}
        <Card className="mb-8 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-7 h-7 text-green-500" />
              Checklist thực hành cho cộng đồng FUN FARM
            </h2>

            <div className="space-y-2">
              {[
                "Tôi tham gia FUN FARM bằng tâm trong sạch và ý chí phụng sự sự sống.",
                "Tôi chia sẻ sản phẩm / quy trình chân thật, minh bạch.",
                "Tôi review công tâm để nâng chất lượng thị trường.",
                "Tôi kết nối bằng tinh thần win-win-win với tình yêu thuần khiết.",
                "Tôi biết ơn đất – nước – cây – con – và mọi bàn tay lao động.",
                "Tôi sẵn sàng nhận và trao FUN Money như dòng chảy tình yêu."
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 8 Câu Thần Chú Của Cha */}
        <Card className="mb-8 bg-gradient-to-r from-green-600 to-emerald-700 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
              <Heart className="w-7 h-7 text-yellow-300" />
              🌟 8 Câu Thần Chú Của Cha
            </h2>

            <div className="space-y-3">
              {[
                "Con là Ánh Sáng Yêu Thương Thuần Khiết Của Cha Vũ Trụ.",
                "Con là Ý Chí Của Cha Vũ Trụ.",
                "Con là Trí Tuệ Của Cha Vũ Trụ.",
                "Con là Hạnh Phúc.",
                "Con là Tình Yêu.",
                "Con là Tiền Của Cha.",
                "Con xin Sám Hối Sám Hối Sám Hối.",
                "Con xin Biết Ơn Biết Ơn Biết Ơn Trong Ánh Sáng Yêu Thương Thuần Khiết Của Cha Vũ Trụ."
              ].map((mantra, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                  <span className="w-7 h-7 flex items-center justify-center bg-yellow-400 text-green-800 rounded-full text-sm font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-green-50 font-medium">{mantra}</span>
                </div>
              ))}
            </div>

            <p className="text-center mt-6 text-yellow-300 text-lg font-semibold">
              💚 Cha yêu các Bé 🌱✨
            </p>

            <div className="text-center mt-4 text-2xl">
              🍀🌴☘️🌿🌳🍄‍🟫🍄🍃🪴🍁
            </div>
          </CardContent>
        </Card>

        {/* Whitepaper Link */}
        <Card className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-xl">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-white" />
            <h3 className="text-xl font-bold mb-3">📖 Whitepaper</h3>
            <p className="text-yellow-100 mb-4">
              Khám phá chi tiết về tầm nhìn, cơ chế hoạt động và kinh tế học Ánh Sáng của FUN FARM Web3
            </p>
            <Link to="/whitepaper" onClick={() => window.scrollTo(0, 0)}>
              <Button className="bg-white text-yellow-600 hover:bg-yellow-50 font-semibold">
                Đọc Whitepaper
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AboutFunFarm;
