import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  PRODUCT_CATEGORIES, 
  DISTANCE_OPTIONS, 
  ProductCategory 
} from '@/types/marketplace';

interface CategorySidebarProps {
  selectedCategory?: ProductCategory;
  onCategoryChange: (category?: ProductCategory) => void;
  productCounts?: Record<string, number>;
}

const COMMITMENT_OPTIONS_LIST = [
  { id: 'organic', label: 'Hữu cơ', icon: '🌿' },
  { id: 'no_preservatives', label: 'Không bảo quản', icon: '🛡️' },
  { id: 'love', label: 'Tâm huyết', icon: '💚' },
  { id: 'fresh_harvest', label: 'Mới thu hoạch', icon: '🌾' },
];

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onCategoryChange,
  productCounts = {},
}) => {
  return (
    <Card className="sticky top-20 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="sparkle-text">
            <span className="sparkle-char">✦</span> DANH MỤC <span className="sparkle-char">✦</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* All Products */}
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            !selectedCategory
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🛒</span>
            <span className="font-medium">Tất cả sản phẩm</span>
          </div>
          {!selectedCategory && <ChevronRight className="w-4 h-4" />}
        </button>

        <Separator className="my-2" />

        {/* Categories */}
        {PRODUCT_CATEGORIES.map((category) => {
          const count = productCounts[category.id] || 0;
          const isSelected = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(isSelected ? undefined : category.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                isSelected
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{category.icon}</span>
                <span className="font-medium">{category.nameVi}</span>
              </div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                )}
                {isSelected && <ChevronRight className="w-4 h-4" />}
              </div>
            </button>
          );
        })}

        <Separator className="my-4" />

        {/* Quick Filters */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground px-3">
            Lọc nhanh
          </h4>
          {COMMITMENT_OPTIONS_LIST.map((option) => (
            <button
              key={option.id}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Nearby */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground px-3">
            📍 Gần tôi
          </h4>
          <div className="flex flex-wrap gap-2 px-3">
            {DISTANCE_OPTIONS.slice(0, 4).map((option) => (
              <Badge
                key={option.value}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
