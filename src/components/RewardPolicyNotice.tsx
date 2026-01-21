import { Heart, Gift, Users, MessageCircle, Share2, ThumbsUp, FileText, Radio } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  SHARE_REWARD,
  FRIENDSHIP_REWARD,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  TOTAL_WELCOME_BONUS,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY,
  LIVESTREAM_REWARD,
  MAX_LIVESTREAMS_PER_DAY,
  LIVESTREAM_MIN_DURATION
} from '@/lib/constants';

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
            Chính sách Phước Lành v3.1 - FUN FARM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Quy tắc chung */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Quy tắc chung</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Mỗi hành động chỉ được thưởng <strong>1 lần duy nhất</strong> cho 1 bài viết</li>
              <li>• Giới hạn: <strong>{MAX_POSTS_PER_DAY} bài đăng/ngày</strong>, <strong>{MAX_LIKES_PER_DAY} like/ngày</strong>, <strong>{MAX_COMMENTS_PER_DAY} comment CL/ngày</strong>, <strong>{MAX_FRIENDSHIPS_PER_DAY} kết bạn/ngày</strong></li>
              <li>• Giới hạn thưởng mỗi ngày: <strong>{DAILY_REWARD_CAP.toLocaleString()} CLC</strong> (không tính bonus chào mừng)</li>
              <li>• Lạm dụng sẽ bị cảnh báo và khóa tài khoản</li>
            </ul>
          </div>

          {/* Chi tiết thưởng */}
          <div className="grid gap-3">
            {/* Welcome Bonus */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🎁 Bonus chào mừng (Tổng {TOTAL_WELCOME_BONUS.toLocaleString()} CLC)</p>
                <p className="text-xs text-muted-foreground">
                  • Welcome: +{WELCOME_BONUS.toLocaleString()} CLC (Xác thực email + Hồ sơ thật + Đồng ý Luật Ánh Sáng)<br/>
                  • Kết nối ví: +{WALLET_CONNECT_BONUS.toLocaleString()} CLC
                </p>
              </div>
            </div>

            {/* Đăng bài chất lượng */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">📝 Đăng bài chất lượng (Tối đa {MAX_POSTS_PER_DAY} bài/ngày)</p>
                <p className="text-xs text-muted-foreground">
                  • Bài chất lượng (&gt;100 ký tự + ảnh/video): +{QUALITY_POST_REWARD.toLocaleString()} CLC
                </p>
              </div>
            </div>

            {/* Livestream */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Radio className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">📺 Livestream (Tối đa {MAX_LIVESTREAMS_PER_DAY} lần/ngày)</p>
                <p className="text-xs text-muted-foreground">
                  • Livestream ≥{LIVESTREAM_MIN_DURATION} phút: +{LIVESTREAM_REWARD.toLocaleString()} CLC
                </p>
              </div>
            </div>

            {/* Like */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <ThumbsUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">❤️ Nhận Like trên bài chất lượng</p>
                <p className="text-xs text-muted-foreground">
                  • Mỗi like nhận được: +{LIKE_REWARD.toLocaleString()} CLC<br/>
                  • Giới hạn: {MAX_LIKES_PER_DAY} like/ngày
                </p>
              </div>
            </div>

            {/* Comment */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <MessageCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">💬 Nhận Bình luận chất lượng trên bài gốc</p>
                <p className="text-xs text-muted-foreground">
                  • Comment chất lượng (&gt;20 ký tự): +{QUALITY_COMMENT_REWARD.toLocaleString()} CLC<br/>
                  • Giới hạn: {MAX_COMMENTS_PER_DAY} comment CL/ngày
                </p>
              </div>
            </div>

            {/* Share */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Share2 className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🔄 Bài được chia sẻ (Tối đa {MAX_SHARES_PER_DAY} lượt/ngày)</p>
                <p className="text-xs text-muted-foreground">
                  • Khi bài của bạn được share: +{SHARE_REWARD.toLocaleString()} CLC
                </p>
              </div>
            </div>

            {/* Kết bạn */}
            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">🤝 Kết bạn (Tối đa {MAX_FRIENDSHIPS_PER_DAY} lượt/ngày)</p>
                <p className="text-xs text-muted-foreground">
                  • Mỗi người nhận: +{FRIENDSHIP_REWARD.toLocaleString()} CLC
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2 border-t">
            💰 Giới hạn thưởng/ngày: {DAILY_REWARD_CAP.toLocaleString()} CLC | ❤️ FUN FARM – Lan tỏa tình yêu chân thành từ tâm
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