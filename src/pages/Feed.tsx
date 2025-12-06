import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreatePost from "@/components/feed/CreatePost";
import FeedPost from "@/components/feed/FeedPost";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedFilters from "@/components/feed/FeedFilters";
import { mockPosts, trendingHashtags, suggestedFarms } from "@/data/mockFeed";

const Feed = () => {
  const [activeFilter, setActiveFilter] = useState("all");

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
                    Newsfeed
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Khám phá sản phẩm tươi ngon từ nông trại & biển cả
                  </p>
                </div>
              </div>

              {/* Filters */}
              <FeedFilters 
                activeFilter={activeFilter} 
                onFilterChange={setActiveFilter} 
              />

              {/* Create Post */}
              <CreatePost />

              {/* Posts */}
              <div className="space-y-6">
                {mockPosts.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </div>

              {/* Load More */}
              <div className="text-center pt-4">
                <button className="text-primary hover:text-primary/80 font-medium transition-colors">
                  Tải thêm bài viết...
                </button>
              </div>
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
    </div>
  );
};

export default Feed;
