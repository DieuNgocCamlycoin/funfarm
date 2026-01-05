import { useState, useCallback, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Camera, ZoomIn, RotateCw, Loader2, User, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/r2Upload';

interface AvatarUploadMenuProps {
  userId: string;
  onAvatarUpload: (url: string) => void;
  onCoverUpload: (url: string) => void;
}

// Helper function to create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

// Get cropped image as blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  const rotRad = (rotation * Math.PI) / 180;

  const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.95);
  });
}

export const AvatarUploadMenu = ({ userId, onAvatarUpload, onCoverUpload }: AvatarUploadMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'avatar' | 'cover'>('avatar');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectRatio = uploadType === 'avatar' ? 1 : 3;

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleMenuSelect = (type: 'avatar' | 'cover') => {
    setUploadType(type);
    inputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setIsOpen(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      
      const folder = uploadType === 'avatar' ? 'avatars' : 'covers';
      const result = await uploadToR2(croppedBlob, folder);
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      const publicUrl = result.url;

      const updateField = uploadType === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      if (uploadType === 'avatar') {
        onAvatarUpload(publicUrl);
      } else {
        onCoverUpload(publicUrl);
      }
      
      setIsOpen(false);
      setImageSrc(null);
      toast.success(uploadType === 'avatar' ? 'Đã cập nhật ảnh đại diện!' : 'Đã cập nhật ảnh bìa!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi khi upload ảnh. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Camera className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleMenuSelect('avatar')} className="gap-2 cursor-pointer">
            <User className="w-4 h-4" />
            Đổi ảnh đại diện
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuSelect('cover')} className="gap-2 cursor-pointer">
            <ImageIcon className="w-4 h-4" />
            Đổi ảnh bìa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {uploadType === 'avatar' ? 'Cập nhật ảnh đại diện' : 'Cập nhật ảnh bìa'}
            </DialogTitle>
          </DialogHeader>

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspectRatio}
                  cropShape={uploadType === 'avatar' ? 'round' : 'rect'}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                    className="flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[rotation]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(value) => setRotation(value[0])}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
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
                      Đang upload...
                    </>
                  ) : (
                    'Lưu ảnh'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
