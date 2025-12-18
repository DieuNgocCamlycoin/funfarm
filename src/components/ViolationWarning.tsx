import { AlertTriangle, Clock, Ban, ShieldOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface ViolationWarningProps {
  level: number;
  expiresAt?: string;
  reason?: string;
  banned?: boolean;
  banReason?: string;
}

export const ViolationWarning = ({ level, expiresAt, reason, banned, banReason }: ViolationWarningProps) => {
  const { signOut } = useAuth();

  // Show banned message with highest priority
  if (banned) {
    return (
      <Alert className="mb-4 border-red-600/50 bg-red-600/10">
        <ShieldOff className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-600 dark:text-red-400 text-lg font-bold">
          TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN
        </AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2">
          <p className="font-medium text-red-500">
            Tài khoản của bạn đã bị khóa vĩnh viễn vì lạm dụng hệ thống FUN FARM.
          </p>
          <p className="text-sm mt-2">
            Lý do: <span className="font-medium">{banReason || 'Vi phạm nghiêm trọng quy tắc cộng đồng'}</span>
          </p>
          <p className="text-xs mt-2 opacity-70">
            Bạn không thể sử dụng các tính năng của FUN FARM nữa. 
            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ hỗ trợ.
          </p>
          <Button 
            variant="destructive" 
            className="mt-4"
            onClick={() => signOut()}
          >
            Đăng xuất
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (level === 0) return null;

  const getWarningInfo = () => {
    if (level === 1) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        title: "Nhắc nhở từ FUN FARM",
        bgClass: "border-amber-500/50 bg-amber-500/10",
        titleClass: "text-amber-600 dark:text-amber-400"
      };
    } else if (level === 2) {
      return {
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        title: "Tạm ngưng thưởng",
        bgClass: "border-orange-500/50 bg-orange-500/10",
        titleClass: "text-orange-600 dark:text-orange-400"
      };
    } else {
      return {
        icon: <Ban className="h-4 w-4 text-red-500" />,
        title: "Khóa vĩnh viễn",
        bgClass: "border-red-500/50 bg-red-500/10",
        titleClass: "text-red-600 dark:text-red-400"
      };
    }
  };

  const info = getWarningInfo();
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const daysLeft = expiresDate ? Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Alert className={`mb-4 ${info.bgClass}`}>
      {info.icon}
      <AlertTitle className={info.titleClass}>
        {info.title}
      </AlertTitle>
      <AlertDescription className="text-muted-foreground mt-2">
        {level === 1 && (
          <>
            Bạn ơi, hãy lan tỏa tình yêu chân thành nhé ❤️ 
            <br />
            <span className="text-xs mt-1 block opacity-70">
              Thời gian tạm ngưng: {daysLeft > 0 ? `còn ${daysLeft} ngày` : 'đã hết hạn'}
            </span>
          </>
        )}
        {level === 2 && (
          <>
            FUN FARM là nơi lan tỏa tình yêu chân thành. Tài khoản của bạn đang trong thời gian tạm ngưng thưởng.
            <br />
            <span className="text-xs mt-1 block opacity-70">
              Lý do: {reason || 'Vi phạm quy tắc cộng đồng'} | Còn {daysLeft} ngày
            </span>
          </>
        )}
        {level >= 3 && (
          <>
            FUN FARM chỉ dành cho trái tim lương thiện. Tài khoản của bạn đã bị khóa vĩnh viễn vì lạm dụng.
            <br />
            <span className="text-xs mt-1 block opacity-70">
              Lý do: {reason || 'Vi phạm nghiêm trọng quy tắc cộng đồng'}
            </span>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
};
