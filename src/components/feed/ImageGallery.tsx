import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface ImageGalleryProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageGallery = ({ items, initialIndex = 0, isOpen, onClose }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';

  // Reset zoom and position when changing images
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPlaying(false);
  }, [currentIndex]);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, items.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setScale(prev => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setScale(prev => Math.max(prev - 0.5, 0.5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev, onClose]);

  // Touch handling for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1) return; // Disable swipe when zoomed
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale > 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  // Mouse drag for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Download handler
  const handleDownload = async () => {
    try {
      const response = await fetch(currentItem.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = isVideo ? 'mp4' : 'jpg';
      a.download = `funfarm_${currentIndex + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Đã tải ${isVideo ? 'video' : 'ảnh'} về thiết bị!`);
    } catch (error) {
      toast.error('Có lỗi khi tải về');
    }
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 border-0">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 w-10 h-10"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Image counter */}
        <div className="absolute top-4 left-4 z-50 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Navigation arrows */}
        {items.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12",
                currentIndex === 0 && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === items.length - 1}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12",
                currentIndex === items.length - 1 && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Controls toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          {!isVideo && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="text-white hover:bg-white/20 w-9 h-9"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="text-white hover:bg-white/20 w-9 h-9"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="text-white hover:bg-white/20 w-9 h-9"
              >
                <RotateCw className="w-5 h-5" />
              </Button>
            </>
          )}
          {isVideo && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 w-9 h-9"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20 w-9 h-9"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </>
          )}
          <div className="w-px h-6 bg-white/30" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20 w-9 h-9"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 max-w-[80vw] overflow-x-auto p-2">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all",
                  index === currentIndex 
                    ? "ring-2 ring-primary scale-110" 
                    : "opacity-60 hover:opacity-100"
                )}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentItem.url}
              className="max-w-[90vw] max-h-[80vh] object-contain"
              controls={false}
              muted={isMuted}
              playsInline
              loop
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <img
              src={currentItem.url}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              draggable={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper to detect if URL is video
export const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Convert images array to MediaItem array
export const imagesToMediaItems = (urls: string[]): MediaItem[] => {
  return urls.map(url => ({
    url,
    type: isVideoUrl(url) ? 'video' : 'image',
  }));
};

export default ImageGallery;
