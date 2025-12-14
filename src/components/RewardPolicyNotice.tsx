import { AlertTriangle, Heart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RewardPolicyNoticeProps {
  isAffected?: boolean;
}

export const RewardPolicyNotice = ({ isAffected = false }: RewardPolicyNoticeProps) => {
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
