import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PenSquare, Video, Radio, Leaf, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type CreateAction = {
  kind: "post" | "video" | "farm_update" | "sell_product" | "story";
  isSelling: boolean;
};

interface CreateActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (action: CreateAction) => void;
}

const actions = [
  {
    id: "post",
    label: "Bài viết",
    description: "Chia sẻ câu chuyện",
    icon: PenSquare,
    action: { kind: "post", isSelling: false } as CreateAction,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "video",
    label: "Video",
    description: "Đăng video ngắn",
    icon: Video,
    action: { kind: "video", isSelling: false } as CreateAction,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "farm_update",
    label: "Farm Update",
    description: "Nhật ký nông trại",
    icon: Leaf,
    action: { kind: "farm_update", isSelling: false } as CreateAction,
    color: "text-green-600",
    bg: "bg-green-600/10",
  },
  {
    id: "sell_product",
    label: "Sell Product",
    description: "Bán nông sản",
    icon: ImageIcon,
    action: { kind: "farm_update", isSelling: true } as CreateAction,
    color: "text-amber-600",
    bg: "bg-amber-600/10",
  },
  {
    id: "story",
    label: "Story",
    description: "Tin nhanh 24h",
    icon: Radio,
    action: { kind: "story", isSelling: false } as CreateAction,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
];

export const CreateActionSheet = ({ open, onOpenChange, onSelect }: CreateActionSheetProps) => {
  const isMobile = useIsMobile();

  const handleSelect = (action: CreateAction) => {
    onSelect(action);
    onOpenChange(false);
  };

  const content = (
    <div className="space-y-1">
      {actions.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className="w-full justify-start gap-3 h-auto px-3 py-4 rounded-xl hover:bg-muted/50"
          onClick={() => handleSelect(item.action)}
        >
          <div className={cn("p-3 rounded-xl", item.bg)}>
            <item.icon className={cn("w-5 h-5", item.color)} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </Button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              Tạo mới
              <span className="text-muted-foreground text-xs font-normal">Chọn loại bài đăng</span>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Tạo mới
            <span className="text-muted-foreground text-xs font-normal">Chọn loại bài đăng</span>
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default CreateActionSheet;
