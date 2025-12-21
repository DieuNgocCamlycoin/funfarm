import { Plus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import defaultAvatarGirl from "@/assets/default-avatar-girl.jpeg";

interface Story {
  id: string;
  name: string;
  avatar: string;
  hasUnwatched: boolean;
  isLive?: boolean;
}

const mockStories: Story[] = [
  {
    id: "create",
    name: "Tạo story",
    avatar: defaultAvatarGirl,
    hasUnwatched: false,
  },
  {
    id: "1",
    name: "Đồng Xanh",
    avatar: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=100&h=100&fit=crop",
    hasUnwatched: true,
    isLive: true,
  },
  {
    id: "2",
    name: "Biển Xanh",
    avatar: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&h=100&fit=crop",
    hasUnwatched: true,
  },
  {
    id: "3",
    name: "Mộc Châu",
    avatar: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=100&h=100&fit=crop",
    hasUnwatched: true,
  },
  {
    id: "4",
    name: "Chef Mai",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    hasUnwatched: false,
  },
  {
    id: "5",
    name: "Rau Sạch HP",
    avatar: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=100&h=100&fit=crop",
    hasUnwatched: true,
  },
];

const StoryBar = () => {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-4 overflow-hidden">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        Stories
      </h3>
      
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {mockStories.map((story, index) => (
          <div
            key={story.id}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
          >
            <div
              className={cn(
                "relative w-16 h-16 rounded-full p-[3px]",
                story.id === "create"
                  ? "bg-muted"
                  : story.hasUnwatched
                  ? "bg-gradient-to-tr from-primary via-secondary to-accent"
                  : "bg-muted"
              )}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                <img
                  src={story.avatar}
                  alt={story.name}
                  className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              
              {story.id === "create" && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center ring-2 ring-background">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              {story.isLive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  LIVE
                </div>
              )}
            </div>
            
            <span className="text-xs text-muted-foreground text-center max-w-[64px] truncate">
              {story.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryBar;
