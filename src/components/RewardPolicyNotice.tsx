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
            Chương trình thưởng FUN FARM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Quy tắc chung */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Quy tắc chung</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Mỗi hành động chỉ được thưởng <strong>1 lần duy nhất</strong> cho 1 bài viết</li>
              <li>• Giới hạn: <strong>10 bài đăng/ngày</strong>, <strong>50 tương tác/ngày</strong></li>
              <li>• Lạm dụng sẽ bị cảnh báo và khóa tài khoản</li>
            </ul>
          </div>

          {/* Chi tiết thưởng */}
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Đăng bài chất lượng</p>
                <p className="text-xs text-muted-foreground">+20.000 CLC (bài có nội dung &gt;50 ký tự hoặc có ảnh/video)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <ThumbsUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Like bài viết</p>
                <p className="text-xs text-muted-foreground">
                  Người đăng: +10.000 CLC (3 like đầu), +1.000 CLC (từ like 4)<br/>
                  Người like: +10.000 CLC/bài
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <MessageCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Bình luận từ tâm</p>
                <p className="text-xs text-muted-foreground">+5.000 CLC/bài (bình luận &gt;20 ký tự)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Share2 className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Chia sẻ bài viết</p>
                <p className="text-xs text-muted-foreground">
                  Người đăng: +10.000 CLC (1 lần/bài)<br/>
                  Người share: +10.000 CLC/bài
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Kết bạn thành công</p>
                <p className="text-xs text-muted-foreground">+10.000 CLC cho cả 2 người (1 lần/cặp)</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2 border-t">
            ❤️ FUN FARM – Lan tỏa tình yêu chân thành từ tâm
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
