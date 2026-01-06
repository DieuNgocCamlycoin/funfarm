import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sprout, 
  Users, 
  Coins, 
  Gift, 
  Shield, 
  Heart,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import logoFunFarm from '@/assets/logo_fun_farm_web3.png';

const features = [
  {
    icon: Sprout,
    title: "Kết nối trực tiếp",
    description: "Nông dân và người tiêu dùng giao dịch trực tiếp, không qua trung gian"
  },
  {
    icon: Coins,
    title: "Thanh toán CAMLY",
    description: "Sử dụng CAMLY Token để thanh toán nhanh chóng, minh bạch"
  },
  {
    icon: Gift,
    title: "Nhận thưởng",
    description: "Mọi hoạt động đều được ghi nhận và nhận thưởng xứng đáng"
  },
  {
    icon: Shield,
    title: "Blockchain minh bạch",
    description: "Truy xuất nguồn gốc rõ ràng với công nghệ Blockchain"
  },
  {
    icon: Heart,
    title: "Tặng quà yêu thương",
    description: "Chia sẻ yêu thương qua tính năng tặng quà cho nhau"
  },
  {
    icon: Users,
    title: "Cộng đồng tỉnh thức",
    description: "Xây dựng cộng đồng những người sống có ý thức và trách nhiệm"
  }
];

const AboutFunFarm = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM Web3" 
              className="w-32 h-32 rounded-full border-4 border-yellow-400 shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-green-700 mb-3">
            FUN FARM Web3
          </h1>
          <p className="text-2xl font-semibold text-yellow-600 mb-4">
            🌱 Nông dân giàu – Người ăn vui 🌱
          </p>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Farm to Table · Fair & Fast · Free-Fee & Earn
          </p>
        </div>

        {/* Description Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-green-200 shadow-xl">
          <CardContent className="p-6">
            <p className="text-gray-700 text-lg leading-relaxed text-center">
              FUN FARM Web3 là nền tảng mạng xã hội nông nghiệp Web3 đầu tiên, 
              kết nối trực tiếp nông dân với người tiêu dùng. Chúng tôi tin rằng 
              người nông dân xứng đáng được trả giá công bằng, người tiêu dùng 
              xứng đáng được sử dụng thực phẩm sạch, và Trái Đất xứng đáng được 
              chăm sóc bằng tình yêu.
            </p>
          </CardContent>
        </Card>

        {/* Features Section */}
        <h2 className="text-2xl font-bold text-green-700 mb-6 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          Tính năng nổi bật
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-gradient-to-br from-white to-green-50 border-2 border-green-100 hover:border-green-300 transition-all hover:shadow-lg"
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shrink-0">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-green-700 mb-1">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Light Law Section */}
        <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-100 border-2 border-yellow-300 shadow-lg">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-yellow-700 mb-3 flex items-center justify-center gap-2">
              ✨ Luật Ánh Sáng
            </h3>
            <p className="text-gray-700 mb-4">
              FUN FARM hoạt động theo Luật Ánh Sáng - nơi chỉ những ai mang ánh sáng 
              hoặc thật lòng hướng về ánh sáng mới có thể bước đi lâu dài.
            </p>
            <Link to="/love-rules">
              <Button className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white">
                Xem Luật Ánh Sáng
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Whitepaper Link */}
        <Card className="bg-gradient-to-r from-green-600 to-emerald-700 text-white border-0 shadow-xl">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
            <h3 className="text-xl font-bold mb-3">📖 Whitepaper</h3>
            <p className="text-green-100 mb-4">
              Khám phá chi tiết về tầm nhìn, cơ chế hoạt động và kinh tế học của FUN FARM Web3
            </p>
            <Link to="/whitepaper">
              <Button className="bg-white text-green-700 hover:bg-green-50 font-semibold">
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
