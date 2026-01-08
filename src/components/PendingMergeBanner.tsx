import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, AlertCircle, Mail, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePendingMergeCheck } from '@/hooks/usePendingMergeCheck';

export function PendingMergeBanner() {
  const { isPending, status, createdAt, userEmail, isLoading } = usePendingMergeCheck();

  if (isLoading || !isPending) {
    return null;
  }

  const formattedDate = createdAt 
    ? format(new Date(createdAt), 'dd/MM/yyyy, HH:mm', { locale: vi })
    : 'Không xác định';

  // Case: Account provisioned - waiting for password set
  if (status === 'provisioned') {
    return (
      <Alert className="mb-4 border-purple-500/50 bg-purple-50 dark:bg-purple-950/20">
        <Mail className="h-4 w-4 text-purple-600" />
        <AlertTitle className="text-purple-800 dark:text-purple-200 flex items-center gap-2">
          <span>🎉 Tài khoản Fun-ID đã được tạo!</span>
        </AlertTitle>
        <AlertDescription className="text-purple-700 dark:text-purple-300 space-y-2">
          <p>
            Vui lòng kiểm tra email <strong>{userEmail}</strong> để đặt mật khẩu và hoàn tất kết nối.
          </p>
          <a 
            href="https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-merge-request" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            Đặt mật khẩu tại Fun Profile
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  // Case: Pending - waiting for Fun Profile to process
  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <span>Tài khoản đang chờ hợp nhất với Fun Profile</span>
        <AlertCircle className="h-4 w-4" />
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Một số chức năng tạm thời bị giới hạn cho đến khi quá trình hoàn tất.
        <br />
        <span className="text-sm opacity-80">Yêu cầu gửi lúc: {formattedDate}</span>
      </AlertDescription>
    </Alert>
  );
}
