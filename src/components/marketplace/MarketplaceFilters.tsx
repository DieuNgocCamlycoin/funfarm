import React from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  MarketplaceFilters as Filters, 
  PRODUCT_CATEGORIES, 
  DISTANCE_OPTIONS, 
  PRICE_RANGES, 
  SORT_OPTIONS,
  ProductCategory
} from '@/types/marketplace';

interface MarketplaceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  activeFiltersCount: number;
}

const COMMITMENT_OPTIONS = [
  { id: 'organic', label: 'Hữu cơ', icon: '🌿' },
  { id: 'no_preservatives', label: 'Không bảo quản', icon: '🛡️' },
  { id: 'love', label: 'Tâm huyết', icon: '💚' },
  { id: 'fresh_harvest', label: 'Mới thu hoạch', icon: '🌾' },
];

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  filters,
  onFiltersChange,
  activeFiltersCount,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const toggleCommitment = (commitment: string) => {
    const current = filters.commitments || [];
    const updated = current.includes(commitment)
      ? current.filter(c => c !== commitment)
      : [...current, commitment];
    updateFilter('commitments', updated.length > 0 ? updated : undefined);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          📁 Danh mục
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilter('category', 
                filters.category === category.id ? undefined : category.id
              )}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                filters.category === category.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm">{category.nameVi}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Distance */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          📍 Khoảng cách
        </h3>
        <div className="flex flex-wrap gap-2">
          {DISTANCE_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={filters.distance === option.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => updateFilter('distance', 
                filters.distance === option.value ? undefined : option.value
              )}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          💰 Khoảng giá (CAMLY)
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((range, index) => {
            const isSelected = 
              filters.minPrice === range.min && 
              (filters.maxPrice === range.max || (range.max === Infinity && !filters.maxPrice));
            return (
              <Badge
                key={index}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (isSelected) {
                    updateFilter('minPrice', undefined);
                    updateFilter('maxPrice', undefined);
                  } else {
                    onFiltersChange({
                      ...filters,
                      minPrice: range.min,
                      maxPrice: range.max === Infinity ? undefined : range.max,
                    });
                  }
                }}
              >
                {range.label}
              </Badge>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Commitments */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          ✅ Cam kết
        </h3>
        <div className="space-y-2">
          {COMMITMENT_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                id={option.id}
                checked={filters.commitments?.includes(option.id) || false}
                onCheckedChange={() => toggleCommitment(option.id)}
              />
              <Label 
                htmlFor={option.id} 
                className="cursor-pointer flex items-center gap-2"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <>
          <Separator />
          <Button 
            variant="outline" 
            onClick={clearFilters} 
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Xóa bộ lọc ({activeFiltersCount})
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select 
          value={filters.sortBy || 'newest'} 
          onValueChange={(value) => updateFilter('sortBy', value as Filters['sortBy'])}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Button (Mobile) */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden relative">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Bộ lọc
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Category Pills (Quick Access) */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        <Badge
          variant={!filters.category ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => updateFilter('category', undefined)}
        >
          Tất cả
        </Badge>
        {PRODUCT_CATEGORIES.map((category) => (
          <Badge
            key={category.id}
            variant={filters.category === category.id ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => updateFilter('category', 
              filters.category === category.id ? undefined : category.id
            )}
          >
            {category.icon} {category.nameVi}
          </Badge>
        ))}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.distance !== undefined && (
            <Badge variant="secondary" className="gap-1">
              📍 {DISTANCE_OPTIONS.find(d => d.value === filters.distance)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('distance', undefined)}
              />
            </Badge>
          )}
          {filters.minPrice !== undefined && (
            <Badge variant="secondary" className="gap-1">
              💰 {PRICE_RANGES.find(r => r.min === filters.minPrice)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => {
                  updateFilter('minPrice', undefined);
                  updateFilter('maxPrice', undefined);
                }}
              />
            </Badge>
          )}
          {filters.commitments?.map(c => (
            <Badge key={c} variant="secondary" className="gap-1">
              {COMMITMENT_OPTIONS.find(o => o.id === c)?.icon} {COMMITMENT_OPTIONS.find(o => o.id === c)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleCommitment(c)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
