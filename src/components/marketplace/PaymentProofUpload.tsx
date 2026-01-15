import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image, Loader2, CheckCircle2, X } from "lucide-react";

interface PaymentProofUploadProps {
  orderId: string;
  onUploadSuccess: (proofUrl: string) => void;
  onCancel: () => void;
}

export default function PaymentProofUpload({
  orderId,
  onUploadSuccess,
  onCancel,
}: PaymentProofUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "File không hợp lệ",
        description: "Vui lòng chọn file ảnh (PNG, JPG, JPEG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File quá lớn",
        description: "Vui lòng chọn ảnh nhỏ hơn 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn ảnh xác nhận thanh toán",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `payment-proof-${orderId}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, use a fallback approach
        console.error('Upload error:', uploadError);
        
        // Try uploading to a general bucket or handle differently
        toast({
          title: "Lỗi tải ảnh",
          description: "Không thể tải ảnh lên. Vui lòng thử lại.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Update order with proof URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_proof_url: urlData.publicUrl,
          payment_status: 'proof_uploaded',
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast({
        title: "✅ Đã gửi xác nhận!",
        description: "Người bán sẽ kiểm tra và xác nhận thanh toán của bạn.",
      });

      onUploadSuccess(urlData.publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra, vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Upload className="w-5 h-5 text-green-600" />
          Upload ảnh xác nhận thanh toán
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Chụp màn hình giao dịch thành công và gửi cho người bán
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Payment proof preview"
            className="w-full h-64 object-contain rounded-xl border-2 border-border bg-muted/20"
          />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-green-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-green-50 transition-colors"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Image className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-green-700">Nhấn để chọn ảnh</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (tối đa 5MB)</p>
          </div>
        </button>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isUploading}
        >
          Quay lại
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Gửi xác nhận
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
