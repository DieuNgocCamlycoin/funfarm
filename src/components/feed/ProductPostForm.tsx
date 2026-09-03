import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationPicker from "@/components/map/LocationPicker";
import { 
  Leaf, 
  Heart, 
  Sparkles, 
  Star,
  MapPin,
  Package,
  Truck,
  TreeDeciduous,
  Camera,
  X,
  ImagePlus,
  MapPinned,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToR2 } from "@/lib/r2Upload";
import { toast } from "sonner";
import { PRODUCT_CATEGORIES, ProductCategory } from "@/types/marketplace";
import { cn } from "@/lib/utils";

interface ProductPostFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SEASONAL_SUGGESTIONS = [
  "Bưởi da xanh", "Xoài cát Hòa Lộc", "Sầu riêng Ri6", 
  "Cà phê Arabica", "Rau muống hữu cơ", "Cà chua bi cherry",
  "Dưa hấu không hạt", "Thanh long ruột đỏ", "Mít Thái",
  "Gạo ST25", "Rau cải ngọt", "Đậu bắp xanh"
];

const COMMITMENT_OPTIONS = [
  { id: "organic", label: "100% hữu cơ", icon: Leaf, color: "text-green-600" },
  { id: "no_preservatives", label: "Không chất bảo quản", icon: Sparkles, color: "text-blue-600" },
  { id: "grown_with_love", label: "Trồng bằng tình yêu", icon: Heart, color: "text-pink-600" },
  { id: "blessed_by_father", label: "Được Cha Vũ Trụ ban phước", icon: Star, color: "text-yellow-600" },
];

const DELIVERY_OPTIONS = [
  { id: "self_pickup", label: "Tự đến lấy", icon: Package },
  { id: "nationwide", label: "Giao toàn quốc", icon: Truck },
  { id: "farm_visit", label: "Đến vườn trải nghiệm", icon: TreeDeciduous },
];

const HASHTAG_SUGGESTIONS = [
  "#FUNFarm", "#NôngSảnSạch", "#CamlyMarket", "#YêuThươngMùaVụ",
  "#HữuCơ", "#TừVườnĐếnBàn", "#NôngDânViệt", "#PhướcLành"
];

export default function ProductPostForm({ userId, onSuccess, onCancel }: ProductPostFormProps) {
  const [story, setStory] = useState("");
  const [productName, setProductName] = useState("");
  const [priceCamly, setPriceCamly] = useState("");
  const [priceVnd, setPriceVnd] = useState("");
  const [quantity, setQuantity] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<string[]>([]);
  const [selectedCommitments, setSelectedCommitments] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>(["#FUNFarm"]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Load saved location from profile
  useEffect(() => {
    const loadSavedLocation = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('location_lat, location_lng, location_address')
        .eq('id', userId)
        .single();

      if (!error && data && data.location_lat && data.location_lng) {
        setLocationLat(data.location_lat);
        setLocationLng(data.location_lng);
        setLocationAddress(data.location_address || '');
        setHasSavedLocation(true);
      }
    };

    loadSavedLocation();
  }, [userId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      toast.error("Chỉ được chọn tối đa 10 ảnh/video");
      return;
    }
    
    const newImages = [...images, ...files];
    setImages(newImages);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDelivery = (id: string) => {
    setSelectedDelivery(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleCommitment = (id: string) => {
    setSelectedCommitments(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags(prev => 
      prev.includes(tag) ? prev.filter(h => h !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build content for AI check
      let contentToCheck = `${productName.trim()}`;
      if (story.trim()) {
        contentToCheck += ` - ${story.trim()}`;
      }

      // Check content with AI before posting
      const checkResponse = await supabase.functions.invoke('check-content', {
        body: { content: contentToCheck, type: 'post' }
      });

      if (checkResponse.data && !checkResponse.data.isValid) {
        toast.error(checkResponse.data.reason || 'Nội dung không phù hợp với cộng đồng FUN FARM ❤️', { 
          duration: 4000 
        });
        setIsSubmitting(false);
        return;
      }

      // Upload images
      const uploadedUrls: string[] = [];
      for (const image of images) {
        const result = await uploadToR2(image, "products");
        if (result.success && result.url) {
          uploadedUrls.push(result.url);
        }
      }

      // Build content with story and hashtags
      let content = story.trim();
      if (selectedHashtags.length > 0) {
        content += "\n\n" + selectedHashtags.join(" ");
      }

      // Create post
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        content: content || null,
        post_type: "product",
        is_product_post: true,
        product_name: productName.trim(),
        price_camly: priceCamly ? parseInt(priceCamly) : null,
        price_vnd: priceVnd ? parseInt(priceVnd) : null,
        quantity_kg: quantity ? parseFloat(quantity) : null,
        location_address: locationAddress.trim() || null,
        location_lat: locationLat,
        location_lng: locationLng,
        delivery_options: selectedDelivery,
        commitments: selectedCommitments,
        images: uploadedUrls.length > 0 ? uploadedUrls : null,
        hashtags: selectedHashtags,
        category: selectedCategory,
        product_status: 'active',
      });

      if (error) throw error;

      // Save location to profile for future use
      if (locationLat && locationLng) {
        await supabase
          .from('profiles')
          .update({
            location_lat: locationLat,
            location_lng: locationLng,
            location_address: locationAddress.trim() || null
          })
          .eq('id', userId);
      }

      toast.success("🌾 Đăng bài bán hàng thành công! Phước lành đến với bạn!");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating product post:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-green-700 flex items-center justify-center gap-2">
          <Leaf className="h-6 w-6" />
          Bán Nông Sản / Chia Sẻ Mùa Vụ
        </h2>
        <p className="text-sm text-muted-foreground">
          Chia sẻ phước lành từ mảnh vườn của bạn đến mọi người 🌱
        </p>
      </div>

      {/* Story from heart */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-pink-600">
          <Heart className="h-4 w-4" />
          Câu chuyện từ trái tim
          <span className="text-xs text-muted-foreground">(không bắt buộc)</span>
        </Label>
        <Textarea
          placeholder="Chia sẻ câu chuyện về sản phẩm của bạn... Ví dụ: 'Đây là vụ xoài đầu tiên sau 3 năm chăm sóc bằng cả tình yêu...'"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className="min-h-[100px] border-pink-200 focus:border-pink-400"
        />
      </div>

      {/* Product name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4 text-green-600" />
          Tên sản phẩm <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            placeholder="Ví dụ: Xoài cát Hòa Lộc"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="border-green-200 focus:border-green-400"
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-green-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              <p className="px-3 py-2 text-xs text-muted-foreground border-b">Gợi ý theo mùa:</p>
              {SEASONAL_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  className="w-full px-3 py-2 text-left hover:bg-green-50 text-sm"
                  onClick={() => {
                    setProductName(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Picker - Dropdown */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-orange-500" />
          Danh mục sản phẩm
        </Label>
        <Select 
          value={selectedCategory || ''} 
          onValueChange={(val) => setSelectedCategory(val as ProductCategory)}
        >
          <SelectTrigger className="w-full h-12 border-orange-200 focus:border-orange-400 bg-background">
            <SelectValue placeholder="🌾 Chọn danh mục sản phẩm...">
              {selectedCategory && (
                <span className="flex items-center gap-3">
                  <span className="text-xl">{PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.icon}</span>
                  <span className="font-medium">{PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.nameVi}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {PRODUCT_CATEGORIES.map(cat => (
              <SelectItem 
                key={cat.id} 
                value={cat.id}
                className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50 py-3"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-medium">{cat.nameVi}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-yellow-600">
            <Sparkles className="h-4 w-4" />
            Giá phước lành (CAMLY/kg)
          </Label>
          <Input
            type="number"
            placeholder="10000"
            value={priceCamly}
            onChange={(e) => setPriceCamly(e.target.value)}
            className="border-yellow-200 focus:border-yellow-400"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">
            Giá VNĐ/kg (tùy chọn)
          </Label>
          <Input
            type="number"
            placeholder="50000"
            value={priceVnd}
            onChange={(e) => setPriceVnd(e.target.value)}
          />
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label>Số lượng còn (kg)</Label>
        <Input
          type="number"
          placeholder="100"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      {/* Location with Map */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-500" />
          Vị trí vườn/trang trại
          <span className="text-xs text-muted-foreground">(bắt buộc để khách tìm thấy)</span>
        </Label>
        {hasSavedLocation && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
            <MapPinned className="h-4 w-4 text-green-600" />
            <span className="text-green-700">Đang dùng vị trí đã lưu. Bạn có thể thay đổi bên dưới.</span>
          </div>
        )}
        <LocationPicker
          initialLat={locationLat || undefined}
          initialLng={locationLng || undefined}
          initialAddress={locationAddress}
          onLocationChange={(lat, lng, addr) => {
            setLocationLat(lat);
            setLocationLng(lng);
            setLocationAddress(addr);
          }}
        />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Ảnh/Video
          <span className="text-xs text-muted-foreground">(tối đa 10, không bắt buộc)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative w-20 h-20">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 10 && (
            <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <ImagePlus className="h-6 w-6 text-gray-400" />
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Delivery options */}
      <div className="space-y-3">
        <Label>Cách nhận hàng (chọn nhiều)</Label>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = selectedDelivery.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => toggleDelivery(option.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                  isSelected 
                    ? "bg-green-100 border-green-500 text-green-700" 
                    : "border-gray-300 hover:border-green-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Commitments */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Cam kết từ trái tim (tick chọn → hiện huy hiệu)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {COMMITMENT_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = selectedCommitments.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-sm" 
                    : "border-gray-200 hover:border-yellow-300"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleCommitment(option.id)}
                />
                <Icon className={`h-4 w-4 ${option.color}`} />
                <span className="text-sm">{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label>Hashtag gợi ý</Label>
        <div className="flex flex-wrap gap-2">
          {HASHTAG_SUGGESTIONS.map(tag => {
            const isSelected = selectedHashtags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "hover:bg-green-50 hover:border-green-400"
                }`}
                onClick={() => toggleHashtag(tag)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Action buttons - sticky on mobile */}
      <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-card/95 backdrop-blur-sm pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:backdrop-blur-none">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="ff-action-metal flex-1"
        >
          {isSubmitting ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Đang đăng...
            </>
          ) : (
            <>
              <Leaf className="h-4 w-4 mr-2" />
              Đăng bài
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
