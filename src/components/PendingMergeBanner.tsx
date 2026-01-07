import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePendingMergeCheck } from '@/hooks/usePendingMergeCheck';

export function PendingMergeBanner() {
  const { isPending, createdAt, isLoading } = usePendingMergeCheck();

  if (isLoading || !isPending) {
    return null;
  }

  const formattedDate = createdAt 
    ? format(new Date(createdAt), 'dd/MM/yyyy, HH:mm', { locale: vi })
    : 'Không xác định';

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
