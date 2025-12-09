import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Loader2, Move, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CoverPhotoEditorProps {
  currentImage?: string | null;
  userId: string;
  onUploadComplete: (url: string) => void;
}

export const CoverPhotoEditor = ({ currentImage, userId, onUploadComplete }: CoverPhotoEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState({ y: 50 }); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempPosition, setTempPosition] = useState({ y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startYRef = useRef(0);
  const startPositionRef = useRef(50);

  // Load existing position if available
  useEffect(() => {
    if (currentImage) {
      setImageSrc(currentImage);
    }
  }, [currentImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setIsOpen(true);
        setTempPosition({ y: 50 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isRepositioning) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPositionRef.current = tempPosition.y;
  }, [isRepositioning, tempPosition.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - startYRef.current;
    const deltaPercent = (deltaY / containerHeight) * 100;
    
    // Invert direction: dragging down moves image up (decreases position)
    const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
    setTempPosition({ y: newPosition });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isRepositioning) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startPositionRef.current = tempPosition.y;
  }, [isRepositioning, tempPosition.y]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.touches[0].clientY - startYRef.current;
    const deltaPercent = (deltaY / containerHeight) * 100;
    
    const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
    setTempPosition({ y: newPosition });
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleUpload = async () => {
    if (!imageSrc) return;

    setIsUploading(true);
    try {
      // If it's a new image (data URL), upload it
      if (imageSrc.startsWith('data:')) {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const fileName = `cover_${Date.now()}.jpg`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        // Update profile with new cover URL and position
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            cover_url: `${publicUrl}?pos=${tempPosition.y}` 
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        onUploadComplete(`${publicUrl}?pos=${tempPosition.y}`);
      } else {
        // Just updating position of existing image
        const baseUrl = imageSrc.split('?')[0];
        const newUrl = `${baseUrl}?pos=${tempPosition.y}`;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ cover_url: newUrl })
          .eq('id', userId);

        if (updateError) throw updateError;
        onUploadComplete(newUrl);
      }

      setImagePosition(tempPosition);
      setIsOpen(false);
      setIsRepositioning(false);
      toast.success('Đã cập nhật ảnh bìa!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi khi upload ảnh. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartReposition = () => {
    setIsRepositioning(true);
    setIsOpen(true);
    setTempPosition(imagePosition);
  };

  const handleCancelReposition = () => {
    setIsRepositioning(false);
    setIsOpen(false);
    setTempPosition(imagePosition);
  };

  // Parse position from URL
  const getPositionFromUrl = (url: string | null) => {
    if (!url) return 50;
    const match = url.match(/pos=(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 50;
  };

  const displayPosition = isOpen ? tempPosition.y : getPositionFromUrl(currentImage);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Buttons container */}
      <div className="flex gap-2">
        {currentImage && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-lg"
            onClick={handleStartReposition}
          >
            <Move className="w-4 h-4" />
            <span className="hidden sm:inline">Điều chỉnh</span>
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm" 
          className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-lg"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Đổi ảnh bìa</span>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleCancelReposition();
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Move className="w-5 h-5 text-primary" />
              {imageSrc?.startsWith('data:') ? 'Chọn vị trí ảnh bìa' : 'Điều chỉnh ảnh bìa'}
            </DialogTitle>
          </DialogHeader>

          <div 
            ref={containerRef}
            className={cn(
              "relative h-80 md:h-96 overflow-hidden bg-muted select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {imageSrc && (
              <img
                src={imageSrc.split('?')[0]}
                alt="Cover preview"
                className="absolute w-full h-auto min-h-full object-cover pointer-events-none transition-transform duration-75"
                style={{
                  top: '50%',
                  transform: `translateY(-${tempPosition.y}%)`,
                }}
                draggable={false}
              />
            )}
            
            {/* Overlay guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <Move className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Kéo để điều chỉnh vị trí</span>
              </div>
            </div>

            {/* Gradient overlays */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReposition} disabled={isUploading}>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="gradient-hero border-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};