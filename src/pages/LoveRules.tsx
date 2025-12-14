import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, Users, AlertTriangle, Gift, Star, Ban } from "lucide-react";

const LoveRules = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Heart className="w-8 h-8 text-primary fill-primary/20" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Quy tắc tình yêu thương
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FUN FARM chào đón mọi người với trái tim rộng mở, nhưng kiên quyết bảo vệ cộng đồng khỏi những hành vi lạm dụng.
            </p>
          </div>

          {/* Core Values */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center border-primary/20">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <Heart className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-lg">Chân thành</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Mọi tương tác đều xuất phát từ trái tim, lan tỏa tình yêu thương thật sự
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-primary/20">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Cộng đồng</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Mỗi người là một phần của gia đình FUN FARM, cùng nhau xây dựng khu vườn tình yêu
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-primary/20">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle className="text-lg">Bảo vệ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Kiên quyết loại bỏ hành vi lạm dụng để phước lành đến đúng người
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rules */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Gift className="w-5 h-5" />
                  Cách nhận thưởng đúng cách
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Mỗi bài viết chỉ thưởng 1 lần cho mỗi tương tác</p>
                    <p className="text-sm text-muted-foreground">Like, comment, share nhiều lần trên cùng bài viết chỉ được tính 1 lần</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Bài viết chất lượng được bonus +50%</p>
                    <p className="text-sm text-muted-foreground">Ảnh thật, vị trí thật, câu chuyện từ trái tim → gửi xét duyệt để nhận thêm CAMLY</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Huy hiệu "Trái tim lương thiện"</p>
                    <p className="text-sm text-muted-foreground">Không vi phạm trong 30 ngày → nhận huy hiệu đặc biệt, bài viết được ưu tiên hiển thị</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Hành vi bị cấm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="font-medium text-orange-600 dark:text-orange-400">❌ Spam tương tác</p>
                    <p className="text-sm text-muted-foreground">Like/comment/share lặp lại hàng trăm lần</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="font-medium text-orange-600 dark:text-orange-400">❌ Đăng bài spam</p>
                    <p className="text-sm text-muted-foreground">Nội dung lặp lại, vô nghĩa để cày thưởng</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="font-medium text-orange-600 dark:text-orange-400">❌ Nội dung tiêu cực</p>
                    <p className="text-sm text-muted-foreground">Xúc phạm, kích động, không phù hợp</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="font-medium text-orange-600 dark:text-orange-400">❌ Tài khoản ảo</p>
                    <p className="text-sm text-muted-foreground">Tạo nhiều tài khoản để gian lận thưởng</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Ban className="w-5 h-5" />
                  Hình thức xử lý
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="font-bold text-amber-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">Vi phạm lần 1: Tạm ngưng 7 ngày</p>
                      <p className="text-sm text-muted-foreground">Nhắc nhở nhẹ nhàng, cơ hội sửa đổi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="font-bold text-orange-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-orange-600 dark:text-orange-400">Vi phạm lần 2: Tạm ngưng 30 ngày</p>
                      <p className="text-sm text-muted-foreground">Cảnh báo nghiêm khắc</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="font-bold text-red-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-red-600 dark:text-red-400">Vi phạm lần 3: Khóa vĩnh viễn</p>
                      <p className="text-sm text-muted-foreground">Không được nhận thưởng, không giao dịch CAMLY</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer message */}
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary">
                <Star className="w-5 h-5 fill-primary/50" />
                <span className="font-medium">FUN FARM - Khu vườn tình yêu chân thành nhất vũ trụ</span>
                <Star className="w-5 h-5 fill-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoveRules;
