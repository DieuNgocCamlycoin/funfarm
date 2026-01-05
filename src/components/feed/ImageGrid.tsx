import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface ImageGridProps {
  images: string[];
  onImageClick: (index: number) => void;
}

const isVideoUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov');
};

const ImageGrid = ({ images, onImageClick }: ImageGridProps) => {
  if (images.length === 0) return null;

  const displayCount = Math.min(images.length, 5);
  const remaining = images.length - 5;

  // Single image - full width
  if (images.length === 1) {
    const isVideo = isVideoUrl(images[0]);
    return (
      <div 
        className="relative aspect-video cursor-pointer overflow-hidden bg-black"
        onClick={() => onImageClick(0)}
      >
        {isVideo ? (
          <div className="w-full h-full flex items-center justify-center relative">
            <video
              src={images[0]}
              className="max-w-full max-h-full object-contain mx-auto"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={images[0]}
            alt="Post image"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        )}
      </div>
    );
  }

  // Two images - side by side
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {images.map((img, idx) => {
          const isVideo = isVideoUrl(img);
          return (
            <div
              key={idx}
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => onImageClick(idx)}
            >
              {isVideo ? (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                  <video src={img} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Three images - 1 large + 2 small
  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1">
        <div
          className="relative row-span-2 cursor-pointer overflow-hidden"
          onClick={() => onImageClick(0)}
        >
          {isVideoUrl(images[0]) ? (
            <div className="w-full h-full bg-black flex items-center justify-center relative aspect-[2/3]">
              <video src={images[0]} className="w-full h-full object-cover" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          ) : (
            <img src={images[0]} alt="Image 1" className="w-full h-full object-cover aspect-[2/3] hover:scale-105 transition-transform" />
          )}
        </div>
        {images.slice(1, 3).map((img, idx) => {
          const isVideo = isVideoUrl(img);
          return (
            <div
              key={idx}
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => onImageClick(idx + 1)}
            >
              {isVideo ? (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                  <video src={img} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={img} alt={`Image ${idx + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Four images - 2x2 grid
  if (images.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {images.map((img, idx) => {
          const isVideo = isVideoUrl(img);
          return (
            <div
              key={idx}
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => onImageClick(idx)}
            >
              {isVideo ? (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                  <video src={img} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 5+ images - 1 large top + 4 small bottom (with +xx overlay on last)
  return (
    <div className="grid grid-cols-2 gap-1">
      {/* Large image - spans 2 columns */}
      <div
        className="relative col-span-2 aspect-[2/1] cursor-pointer overflow-hidden"
        onClick={() => onImageClick(0)}
      >
        {isVideoUrl(images[0]) ? (
          <div className="w-full h-full bg-black flex items-center justify-center relative">
            <video src={images[0]} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-7 h-7 text-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
        ) : (
          <img src={images[0]} alt="Image 1" className="w-full h-full object-cover hover:scale-105 transition-transform" />
        )}
      </div>

      {/* 4 smaller images */}
      {images.slice(1, 5).map((img, idx) => {
        const isVideo = isVideoUrl(img);
        const isLast = idx === 3 && remaining > 0;
        return (
          <div
            key={idx}
            className="relative aspect-square cursor-pointer overflow-hidden"
            onClick={() => onImageClick(idx + 1)}
          >
            {isVideo ? (
              <div className="w-full h-full bg-black flex items-center justify-center relative">
                <video src={img} className="w-full h-full object-cover" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>
            ) : (
              <img src={img} alt={`Image ${idx + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
            )}
            
            {/* +xx overlay for remaining images */}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{remaining}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ImageGrid;
