import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethod } from "@/types/marketplace";

interface PaymentQRDisplayProps {
  paymentMethod: PaymentMethod;
  orderId: string;
  amount: number; // VND amount
  sellerInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    momoPhone?: string;
    zaloPayPhone?: string;
  };
  onPaymentDone: () => void;
}

export default function PaymentQRDisplay({
  paymentMethod,
  orderId,
  amount,
  sellerInfo,
  onPaymentDone,
}: PaymentQRDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
  const transferContent = `FUNFARM-${orderId.slice(0, 8).toUpperCase()}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast({ title: "Đã sao chép!", description: text });
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate VietQR URL for bank transfer
  const getVietQRUrl = () => {
    if (!sellerInfo?.accountNumber || !sellerInfo?.bankName) return null;
    // VietQR standard format
    const bankBin = getBankBin(sellerInfo.bankName);
    if (!bankBin) return null;
    return `https://img.vietqr.io/image/${bankBin}-${sellerInfo.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(sellerInfo.accountName || '')}`;
  };

  // Get bank BIN code
  const getBankBin = (bankName: string): string | null => {
    const bankBins: Record<string, string> = {
      'Vietcombank': '970436',
      'VCB': '970436',
      'Techcombank': '970407',
      'TCB': '970407',
      'BIDV': '970418',
      'Agribank': '970405',
      'VPBank': '970432',
      'MBBank': '970422',
      'ACB': '970416',
      'TPBank': '970423',
      'Sacombank': '970403',
      'HDBank': '970437',
      'VIB': '970441',
      'SHB': '970443',
      'Eximbank': '970431',
      'MSB': '970426',
      'SeABank': '970440',
      'OCB': '970448',
      'LienVietPostBank': '970449',
      'Bac A Bank': '970409',
    };
    for (const [key, bin] of Object.entries(bankBins)) {
      if (bankName.toLowerCase().includes(key.toLowerCase())) return bin;
    }
    return null;
  };

  const vietQRUrl = getVietQRUrl();

  const renderBankTransfer = () => (
    <div className="space-y-4">
      {vietQRUrl ? (
        <div className="flex justify-center">
          <img 
            src={vietQRUrl} 
            alt="VietQR" 
            className="w-48 h-48 rounded-xl border-2 border-border shadow-lg"
          />
        </div>
      ) : (
        <div className="bg-muted/50 p-4 rounded-xl text-center text-muted-foreground">
          <p>Không thể tạo mã QR. Vui lòng chuyển khoản thủ công.</p>
        </div>
      )}

      <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
        <InfoRow 
          label="Ngân hàng" 
          value={sellerInfo?.bankName || 'Chưa cập nhật'} 
          onCopy={() => sellerInfo?.bankName && copyToClipboard(sellerInfo.bankName, 'bank')}
          copied={copied === 'bank'}
        />
        <InfoRow 
          label="Số tài khoản" 
          value={sellerInfo?.accountNumber || 'Chưa cập nhật'} 
          onCopy={() => sellerInfo?.accountNumber && copyToClipboard(sellerInfo.accountNumber, 'account')}
          copied={copied === 'account'}
        />
        <InfoRow 
          label="Tên TK" 
          value={sellerInfo?.accountName || 'Chưa cập nhật'} 
          onCopy={() => sellerInfo?.accountName && copyToClipboard(sellerInfo.accountName, 'name')}
          copied={copied === 'name'}
        />
        <InfoRow 
          label="Số tiền" 
          value={`${formatNumber(amount)} VNĐ`} 
          onCopy={() => copyToClipboard(amount.toString(), 'amount')}
          copied={copied === 'amount'}
          highlight
        />
        <InfoRow 
          label="Nội dung CK" 
          value={transferContent} 
          onCopy={() => copyToClipboard(transferContent, 'content')}
          copied={copied === 'content'}
          highlight
        />
      </div>
    </div>
  );

  const renderMomo = () => (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="w-48 h-48 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <div className="text-center">
            <span className="text-5xl">💜</span>
            <p className="mt-2 font-bold">Momo</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
        <InfoRow 
          label="Số điện thoại" 
          value={sellerInfo?.momoPhone || 'Chưa cập nhật'} 
          onCopy={() => sellerInfo?.momoPhone && copyToClipboard(sellerInfo.momoPhone, 'phone')}
          copied={copied === 'phone'}
        />
        <InfoRow 
          label="Số tiền" 
          value={`${formatNumber(amount)} VNĐ`} 
          onCopy={() => copyToClipboard(amount.toString(), 'amount')}
          copied={copied === 'amount'}
          highlight
        />
        <InfoRow 
          label="Nội dung" 
          value={transferContent} 
          onCopy={() => copyToClipboard(transferContent, 'content')}
          copied={copied === 'content'}
          highlight
        />
      </div>

      {sellerInfo?.momoPhone && (
        <Button
          variant="outline"
          className="w-full gap-2 bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100"
          onClick={() => window.open(`https://me.momo.vn/${sellerInfo.momoPhone}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
          Mở app Momo
        </Button>
      )}
    </div>
  );

  const renderZaloPay = () => (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="w-48 h-48 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <div className="text-center">
            <span className="text-5xl">💙</span>
            <p className="mt-2 font-bold">ZaloPay</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
        <InfoRow 
          label="Số điện thoại" 
          value={sellerInfo?.zaloPayPhone || 'Chưa cập nhật'} 
          onCopy={() => sellerInfo?.zaloPayPhone && copyToClipboard(sellerInfo.zaloPayPhone, 'phone')}
          copied={copied === 'phone'}
        />
        <InfoRow 
          label="Số tiền" 
          value={`${formatNumber(amount)} VNĐ`} 
          onCopy={() => copyToClipboard(amount.toString(), 'amount')}
          copied={copied === 'amount'}
          highlight
        />
        <InfoRow 
          label="Nội dung" 
          value={transferContent} 
          onCopy={() => copyToClipboard(transferContent, 'content')}
          copied={copied === 'content'}
          highlight
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">📲 Quét mã QR để thanh toán</h3>
        <p className="text-sm text-muted-foreground">
          Sau khi chuyển khoản, nhấn "Tôi đã thanh toán" để xác nhận
        </p>
      </div>

      {paymentMethod === 'bank_transfer' && renderBankTransfer()}
      {paymentMethod === 'momo' && renderMomo()}
      {paymentMethod === 'zalopay' && renderZaloPay()}

      <Button
        onClick={onPaymentDone}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6"
      >
        ✅ Tôi đã thanh toán
      </Button>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  onCopy, 
  copied,
  highlight 
}: { 
  label: string; 
  value: string; 
  onCopy?: () => void;
  copied?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${highlight ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-medium ${highlight ? 'text-yellow-700 dark:text-yellow-400' : ''}`}>
          {value}
        </span>
        {onCopy && (
          <button 
            onClick={onCopy}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
