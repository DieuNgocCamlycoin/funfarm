import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertTriangle, 
  Ban, 
  MessageSquareWarning, 
  ShoppingBag, 
  Loader2,
  Flag
} from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
  reportedUserId: string;
  reportedUserName: string;
}

const REPORT_TYPES = [
  { id: "spam", label: "Spam / Nội dung lặp lại", icon: MessageSquareWarning },
  { id: "scam", label: "Lừa đảo / Gian lận", icon: Ban },
  { id: "inappropriate", label: "Nội dung không phù hợp", icon: AlertTriangle },
  { id: "fake_product", label: "Sản phẩm giả / Không thật", icon: ShoppingBag },
  { id: "harassment", label: "Quấy rối / Xúc phạm", icon: Flag },
];

export const ReportModal = ({
  isOpen,
  onClose,
  postId,
  commentId,
  reportedUserId,
  reportedUserName,
}: ReportModalProps) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      toast.error("Vui lòng chọn loại vi phạm");
      return;
    }

    if (!user?.id) {
      toast.error("Vui lòng đăng nhập để báo cáo");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        post_id: postId || null,
        comment_id: commentId || null,
        report_type: reportType,
        reason: reason.trim() || null,
      });

      if (error) throw error;

      toast.success("Cảm ơn bạn đã báo cáo! Admin sẽ xem xét sớm nhất 🙏", {
        duration: 4000,
      });
      onClose();
      setReportType("");
      setReason("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="w-5 h-5" />
            Báo cáo vi phạm
          </DialogTitle>
          <DialogDescription>
            Báo cáo {commentId ? "bình luận" : "bài viết"} của{" "}
            <span className="font-medium text-foreground">{reportedUserName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={reportType} onValueChange={setReportType}>
            {REPORT_TYPES.map((type) => (
              <div
                key={type.id}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={type.id} id={type.id} />
                <Label
                  htmlFor={type.id}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <type.icon className="w-4 h-4 text-muted-foreground" />
                  {type.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="reason">Chi tiết thêm (không bắt buộc)</Label>
            <Textarea
              id="reason"
              placeholder="Mô tả thêm về vi phạm..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reportType || isSubmitting}
            className="flex-1 bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Flag className="w-4 h-4 mr-2" />
            )}
            Gửi báo cáo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
