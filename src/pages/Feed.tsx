import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreatePost from "@/components/feed/CreatePost";
import CreatePostModal from "@/components/feed/CreatePostModal";
import StoryBar from "@/components/feed/StoryBar";
import FloatingCreateButton from "@/components/feed/FloatingCreateButton";
import FeedPost from "@/components/feed/FeedPost";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedFilters from "@/components/feed/FeedFilters";
import { mockPosts, trendingHashtags, suggestedFarms } from "@/data/mockFeed";
import { Post } from "@/types/feed";
import { toast } from "sonner";

const Feed = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 500
    ) {
      if (!isLoadingMore && hasMore) {
        loadMorePosts();
      }
    }
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const loadMorePosts = async () => {
    setIsLoadingMore(true);
    // Simulate loading more posts
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In real app, fetch from API
    if (posts.length >= mockPosts.length * 3) {
      setHasMore(false);
    } else {
      setPosts((prev) => [...prev, ...mockPosts.map((p, i) => ({
        ...p,
        id: `${p.id}-${prev.length + i}`,
      }))]);
    }
    setIsLoadingMore(false);
  };

  const handleNewPost = (newPost: any) => {
    toast.success("Đăng bài thành công! 🌱");
    // In real app, would create full Post object from API response
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Page Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Trang Chủ
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Khám phá sản phẩm tươi ngon từ nông trại & biển cả
                  </p>
                </div>
              </div>

              {/* Create Post Box - Facebook style */}
              <CreatePost onOpenModal={() => setIsCreateModalOpen(true)} />

              {/* Story Bar */}
              <StoryBar />

              {/* Filters */}
              <FeedFilters 
                activeFilter={activeFilter} 
                onFilterChange={setActiveFilter} 
              />

              {/* Posts */}
              <div className="space-y-6">
                {posts.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </div>

              {/* Loading indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-8">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>Đang tải thêm...</span>
                  </div>
                </div>
              )}

              {/* End of feed */}
              {!hasMore && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg">🌱 Bạn đã xem hết bảng tin rồi!</p>
                  <p className="text-sm mt-1">Quay lại sau để xem thêm bài mới nhé</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <FeedSidebar 
                  trendingHashtags={trendingHashtags}
                  suggestedFarms={suggestedFarms}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Floating Create Button (Mobile only) */}
      <div className="lg:hidden">
        <FloatingCreateButton onClick={() => setIsCreateModalOpen(true)} />
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPost={handleNewPost}
      />
    </div>
  );
};

export default Feed;
