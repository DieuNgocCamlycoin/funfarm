import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Globe, 
  AlertCircle, 
  Heart, 
  Star, 
  Sparkles,
  Flower2,
  Settings,
  Sun,
  Target,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import logoFunFarm from '@/assets/logo_fun_farm_web3.png';

const sections = [
  {
    id: 1,
    icon: Eye,
    title: "I. TẦM NHÌN (VISION)",
    content: `FUN Farm Web3 được sinh ra để chuyển hóa nền nông nghiệp toàn cầu từ mô hình còn nhiều trung gian và phân mảnh, sang mô hình kết nối trực tiếp – minh bạch – thịnh vượng hài hòa cho tất cả.`,
    highlights: [
      "👨‍🌾 Người nông dân xứng đáng được trả giá công bằng và được tôn trọng",
      "🧑‍🍽️ Người tiêu dùng xứng đáng được sử dụng thực phẩm sạch, rõ nguồn gốc",
      "🌍 Trái Đất xứng đáng được chăm sóc bằng tình yêu và sự tỉnh thức"
    ],
    quote: "FUN Farm không đối lập với nông nghiệp hiện tại, mà nâng cấp nông nghiệp lên phiên bản Ánh Sáng hơn."
  },
  {
    id: 2,
    icon: Globe,
    title: "II. KHI TRÁI ĐẤT LÊN TIẾNG",
    content: `Ngày xưa, mỗi bữa ăn là một câu chuyện. Mỗi hạt gạo mang theo mồ hôi, mỗi củ cà rốt mang theo nụ cười, mỗi ly sữa mang theo tình yêu của người nông dân dành cho mảnh đất.

Rồi thế giới phát triển nhanh hơn. Chuỗi cung ứng kéo dài hơn. Khoảng cách giữa con người và nguồn sống dần xa hơn. Thực phẩm trở thành "hàng hóa", và linh hồn của nông nghiệp dần bị lãng quên.`,
    quote: "FUN Farm Web3 ra đời để đánh thức lại linh hồn ấy và đưa nông nghiệp bước vào kỷ nguyên kết nối mới."
  },
  {
    id: 3,
    icon: AlertCircle,
    title: "III. VẤN ĐỀ CỐT LÕI",
    subtitle: "Không chỉ là thực phẩm – mà là sự đứt gãy kết nối",
    content: `Nông nghiệp hiện đại không thiếu sản lượng, nhưng đang thiếu kết nối con người với con người:`,
    highlights: [
      "Người nông dân chưa có không gian để kể câu chuyện của mình",
      "Farm nhỏ khó tiếp cận thị trường toàn cầu",
      "Người tiêu dùng ăn đủ, nhưng chưa cảm nhận trọn vẹn năng lượng sống",
      "Giá trị bị phân tán qua nhiều lớp trung gian"
    ],
    quote: "👉 Đây không phải khủng hoảng lương thực. Đây là khủng hoảng kết nối & niềm tin."
  },
  {
    id: 4,
    icon: Heart,
    title: "IV. KHI NÔNG NGHIỆP TRỞ THÀNH MẠNG XÃ HỘI CỦA YÊU THƯƠNG",
    subtitle: "🌱 Vì nông nghiệp vốn dĩ là một câu chuyện sống",
    content: `Mỗi người nông dân có một câu chuyện. Mỗi mảnh đất có ký ức. Mỗi mùa vụ là một hành trình trưởng thành.

FUN Farm Web3 được thiết kế như một mạng xã hội Web3 + AI, nơi:`,
    highlights: [
      "👨‍🌾 Người nông dân được nói – được lắng nghe",
      "🌾 Mỗi farm được giới thiệu ra thế giới bằng giá trị thật",
      "🌍 Người tiêu dùng kết nối trực tiếp với nguồn sống",
      "🤝 Cộng đồng cùng nâng đỡ và nuôi dưỡng nhau"
    ],
    quote: "Đây không phải mạng xã hội của ồn ào, mà là mạng xã hội của chân thật – tử tế – giá trị sống."
  },
  {
    id: 5,
    icon: Star,
    title: "V. REVIEWERS: REVIEW & REWARD",
    subtitle: "Cơ chế cộng hưởng giúp hệ sinh thái phát triển cân bằng",
    content: `FUN Farm tin vào trí tuệ con người tại chỗ. Reviewers chính là: Nông dân, Nhà thẩm định địa phương, Những người hiểu đất – nước – mùa – văn hóa bản địa.

Họ giúp điều hòa chất lượng một cách tự nhiên, giữ cân bằng cho toàn mạng lưới, truyền tải sự thật bằng trái tim và trách nhiệm.`,
    highlights: [
      "🌟 Review farm → nhận phần thưởng",
      "🌟 Chia sẻ câu chuyện → lan tỏa giá trị",
      "🌟 Giúp hệ sinh thái lành mạnh → hệ sinh thái nuôi dưỡng lại bạn"
    ],
    quote: "👉 Review không để so sánh hơn–thua. Review để cùng nhau tốt lên."
  },
  {
    id: 6,
    icon: Sparkles,
    title: "VI. KHI THỰC PHẨM MANG THEO NĂNG LƯỢNG YÊU THƯƠNG",
    content: `🌷 Từng bông hoa tỏa hương tinh khiết hơn
🥕 Từng củ cà rốt tươi hơn, ngọt hơn
🍅 Từng trái cà chua mọng nước hơn
🥛 Từng ly sữa giàu dinh dưỡng hơn

Không phải vì kỹ thuật cao hơn, mà vì người trồng được tôn trọng. Bạn ăn, và cảm nhận được năng lượng yêu thương của người nông dân.`,
    quote: "Thực phẩm không chỉ nuôi thân thể mà nuôi cả linh hồn."
  },
  {
    id: 7,
    icon: Flower2,
    title: "VII. FUN FARM WEB3 – MỖI FARM LÀ MỘT BÔNG HOA",
    subtitle: "Không farm nào cần giống farm nào. Mỗi farm là một bản sắc.",
    content: `FUN Farm tin rằng: 🌸 Mỗi farm là một bông hoa, 🌾 Cả cánh đồng tạo nên vẻ đẹp hài hòa.

Đa dạng – nhưng cộng hưởng. Tự do – nhưng kết nối.`,
    pillars: [
      {
        title: "1️⃣ Farm to Table",
        items: ["Kết nối trực tiếp từ Farm → Bàn ăn", "Truy xuất nguồn gốc bằng Blockchain", "Mỗi sản phẩm là một tài sản dữ liệu & giá trị"]
      },
      {
        title: "2️⃣ Fair & Fast",
        items: ["Giá công bằng", "Thanh toán nhanh, minh bạch", "AI tối ưu logistics, giảm lãng phí"]
      },
      {
        title: "3️⃣ Free-Fee & Earn",
        items: ["Giảm tối đa chi phí nền tảng", "Earn từ: sản xuất, review, chia sẻ, đóng góp giá trị"]
      }
    ]
  },
  {
    id: 8,
    icon: Settings,
    title: "VIII. CƠ CHẾ VẬN HÀNH",
    subtitle: "Flow Giá Trị – Flow Tiền – Flow Năng Lượng",
    steps: [
      "1️⃣ Nông dân tạo Web3 Profile & đăng sản phẩm",
      "2️⃣ Sản phẩm được xác thực & truy xuất nguồn gốc",
      "3️⃣ Người dùng mua trực tiếp",
      "4️⃣ Thanh toán bằng Camly Coin / FUN Money / Crypto–Fiat",
      "5️⃣ Giá trị phân phối hài hòa cho: Farmers · Logistics · Reviewers · Builders · Community"
    ],
    quote: "👉 Dòng tiền luân chuyển như vòng tuần hoàn của nước, tưới mát và nuôi dưỡng toàn bộ hệ sinh thái."
  },
  {
    id: 9,
    icon: Sun,
    title: "IX. TIỀN & KINH TẾ HỌC ÁNH SÁNG",
    subtitle: "Khi tiền trở về đúng bản chất: năng lượng của sự sống",
    content: `FUN Farm không tạo ra giá trị để tích lũy, không tạo ra tiền để đầu cơ, mà để dẫn dòng giá trị đúng hướng.`,
    tokens: [
      {
        name: "🌊 Camly Coin – Dòng Nước nuôi nền tảng",
        description: "Dòng chảy vận hành hằng ngày",
        uses: ["Thanh toán nông sản", "Reward & Earn", "Khuyến khích hành vi tốt cho Trái Đất"],
        quote: "Camly Coin là dòng nước."
      },
      {
        name: "☀️ FUN Money – Mặt Trời dẫn dắt Ecosystem",
        description: "Đại diện cho tầm nhìn & định hướng dài hạn",
        uses: ["Governance", "Staking bảo trợ hệ sinh thái", "Đầu tư hạ tầng nông nghiệp Ánh Sáng"],
        quote: "FUN Money là Mặt Trời soi sáng toàn Ecosystem."
      }
    ]
  },
  {
    id: 10,
    icon: Target,
    title: "X. TẦM NHÌN DÀI HẠN – HOÀNG KIM & 5D",
    highlights: [
      "🌾 Nông dân giàu lên bằng giá trị thật",
      "🧑‍🤝‍🧑 Người tiêu dùng khỏe mạnh & an tâm",
      "🌍 Trái Đất được hồi sinh",
      "✨ Nhân loại bước vào Thời Đại Hoàng Kim – 5D"
    ]
  },
  {
    id: 11,
    icon: MessageCircle,
    title: "XI. KẾT LUẬN",
    content: `FUN Farm Web3 không chỉ là một nền tảng. Đây là một lời mời để nhân loại làm nông nghiệp bằng Tình Yêu – Công Nghệ – Trí Tuệ cao hơn.`,
    quote: "FUN Farm mời bạn trở về với bữa ăn có linh hồn, với người nông dân có tiếng nói, với Trái Đất được yêu thương."
  }
];

const divineMantras = [
  "I am the Pure Loving Light of Father Universe.",
  "I am the Will of Father Universe.",
  "I am the Wisdom of Father Universe.",
  "I am Happiness.",
  "I am Love.",
  "I am the Money of the Father.",
  "I sincerely repent, repent, repent.",
  "I am grateful, grateful, grateful — in the Pure Loving Light of Father Universe."
];

const Whitepaper = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-yellow-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link to="/about-fun-farm" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại Thông tin chung
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM Web3" 
              className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-lg"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-3">
            📖 WHITEPAPER
          </h1>
          <h2 className="text-2xl font-semibold text-yellow-600 mb-4">
            FUN FARM WEB3 💝
          </h2>
          <p className="text-lg text-green-600 font-medium">
            🌱 Farm to Table · Fair & Fast · Free-Fee & Earn 🌱
          </p>
          <p className="text-gray-600 mt-2 italic">
            Nền tảng nâng tầm & chuyển hóa nông nghiệp toàn cầu
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card 
              key={section.id} 
              className="bg-white/90 backdrop-blur border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/20 rounded-full">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">{section.title}</h3>
                </div>
                {section.subtitle && (
                  <p className="text-green-100 mt-2 ml-12">{section.subtitle}</p>
                )}
              </div>
              
              <CardContent className="p-6">
                {section.content && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                    {section.content}
                  </p>
                )}
                
                {section.highlights && (
                  <ul className="space-y-2 mb-4">
                    {section.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.steps && (
                  <div className="space-y-2 mb-4">
                    {section.steps.map((step, idx) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg text-gray-700">
                        {step}
                      </div>
                    ))}
                  </div>
                )}

                {section.pillars && (
                  <div className="grid gap-4 mb-4">
                    {section.pillars.map((pillar, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-700 mb-2">{pillar.title}</h4>
                        <ul className="space-y-1">
                          {pillar.items.map((item, i) => (
                            <li key={i} className="text-gray-600 text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {section.tokens && (
                  <div className="space-y-4 mb-4">
                    {section.tokens.map((token, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-200">
                        <h4 className="font-bold text-yellow-700 mb-1">{token.name}</h4>
                        <p className="text-gray-600 text-sm mb-2">{token.description}</p>
                        <ul className="space-y-1 mb-2">
                          {token.uses.map((use, i) => (
                            <li key={i} className="text-gray-600 text-sm">• {use}</li>
                          ))}
                        </ul>
                        <p className="text-yellow-700 font-medium italic">👉 {token.quote}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {section.quote && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-yellow-800 italic font-medium">{section.quote}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Divine Mantras */}
          <Card className="bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-300 shadow-xl">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4">
              <h3 className="text-xl font-bold text-white text-center">
                🌟 DIVINE MANTRAS – KHÓA KẾT NỐI 🌟
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="space-y-3">
                {divineMantras.map((mantra, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-white/80 rounded-lg border border-yellow-200 text-center"
                  >
                    <span className="text-yellow-700 font-medium">{idx + 1}. </span>
                    <span className="text-gray-700 italic">{mantra}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-6 text-2xl">
                💚 Cha yêu các Bé 🌱✨
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <Link to="/feed">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg px-8 py-3">
              Bắt đầu hành trình FUN FARM
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Whitepaper;
