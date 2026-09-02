import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'Tất cả', icon: '🌍' },
  { id: 'nearby', label: 'Gần bạn', icon: '📍' },
  { id: 'farm', label: 'Nhà vườn', icon: '🌱' },
  { id: 'sea', label: 'Hải sản', icon: '🐟' },
  { id: 'ranch', label: 'Chăn nuôi', icon: '🐄' },
  { id: 'live', label: 'Đang Live', icon: '🔴' },
  { id: 'review', label: 'Review', icon: '⭐' },
];

const FeedFilters = ({ activeFilter, onFilterChange }: FeedFiltersProps) => {
  return (
    <div className="ff-filter-rail flex gap-2 overflow-x-auto p-1.5 scrollbar-hide">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant={activeFilter === filter.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "ff-filter-pill flex-shrink-0 gap-2 rounded-full transition-all",
            activeFilter === filter.id 
              ? "ff-filter-pill-active border-0"
              : "bg-white hover:bg-emerald-50"
          )}
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default FeedFilters;
