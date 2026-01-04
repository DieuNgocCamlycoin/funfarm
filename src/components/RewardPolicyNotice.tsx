import { Heart, Gift, Users, MessageCircle, Share2, ThumbsUp, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RewardPolicyNoticeProps {
  isAffected?: boolean;
  showFullPolicy?: boolean;
}

export const RewardPolicyNotice = ({ isAffected = false, showFullPolicy = false }: RewardPolicyNoticeProps) => {
  if (showFullPolicy) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Chương trình thưởng FUN FARM - Luật Ánh Sáng v2.1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Quy tắc chung */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Quy tắc chung</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Mỗi hành động chỉ được thưởng <strong>1 lần duy nhất</strong> cho 1 bài viết</li>
              <li>• Giới hạn: <strong>10 bài đăng/ngày</strong>, <strong>50 tương tác/ngày</strong>, <strong>10 kết bạn/ngày</strong></li>
              <li>• Lạm dụng sẽ bị cảnh báo và khóa tài khoản</li>
            </ul>
          </div>

          {/* Chi tiết thưởng */}
          <div className="grid gap-3">
            {/* Welcome Bonus */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🎁 Bonus chào mừng (Tổng 100.000 CLC)</p>
                <p className="text-xs text-muted-foreground">
                  • Welcome: +50.000 CLC (Xác thực email + Hồ sơ thật + Đồng ý Luật Ánh Sáng)<br/>
                  • Kết nối ví: +50.000 CLC
                </p>
              </div>
            </div>

            {/* Đăng bài */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">📝 Đăng bài (Tối đa 10 bài/ngày)</p>
                <p className="text-xs text-muted-foreground">
                  • Bài chất lượng (&gt;100 ký tự + ảnh/video): +20.000 CLC<br/>
                  • Bài thường: +5.000 CLC
                </p>
              </div>
            </div>

            {/* Like */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <ThumbsUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">❤️ Nhận Like trên bài gốc (Theo từng bài)</p>
                <p className="text-xs text-muted-foreground">
                  • 3 like đầu/bài: +10.000 CLC/like = 30.000 CLC<br/>
                  • Từ like thứ 4: +1.000 CLC/like
                </p>
              </div>
            </div>

            {/* Comment */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <MessageCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">💬 Nhận Bình luận trên bài gốc</p>
                <p className="text-xs text-muted-foreground">
                  • Comment chất lượng (&gt;20 ký tự): +5.000 CLC<br/>
                  • Comment thường: +1.000 CLC
                </p>
              </div>
            </div>

            {/* Share */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Share2 className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🔄 Nhận Chia sẻ bài gốc (Thưởng cho tác giả)</p>
                <p className="text-xs text-muted-foreground">
                  • Share không comment hoặc &lt;20 ký tự: +4.000 CLC<br/>
                  • Share có comment ≥20 ký tự: +10.000 CLC
                </p>
              </div>
            </div>

            {/* Kết bạn */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🤝 Kết bạn (Tối đa 10 lượt/ngày)</p>
                <p className="text-xs text-muted-foreground">+50.000 CLC cho cả 2 người</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2 border-t">
            💰 Tổng thưởng tối đa/ngày: ~1.200.000 CLC | ❤️ FUN FARM – Lan tỏa tình yêu chân thành từ tâm
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isAffected) return null;

  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
      <Heart className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400">
        Thông báo từ FUN FARM ❤️
      </AlertTitle>
      <AlertDescription className="text-muted-foreground mt-2">
        FUN FARM là nơi lan tỏa tình yêu chân thành. Những phần thưởng từ hành động 
        lặp lại không đúng tinh thần đã được điều chỉnh để dành phước lành cho bà con 
        thật sự. Hãy cùng gieo hạt yêu thương đúng cách nhé! 
        <br />
        <span className="text-xs mt-2 block opacity-70">
          💡 Mỗi bài viết chỉ được nhận thưởng 1 lần cho mỗi tương tác (like/comment/share).
        </span>
      </AlertDescription>
    </Alert>
  );
};
