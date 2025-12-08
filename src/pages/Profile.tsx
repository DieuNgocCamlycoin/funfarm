import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeedPost from "@/components/feed/FeedPost";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Edit, 
  Settings,
  Grid3X3,
  User,
  Users,
  Image as ImageIcon,
  Gift,
  BadgeCheck,
  Wallet
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mockPosts } from "@/data/mockFeed";

const profileTypeLabels: Record<string, { emoji: string; label: string }> = {
  farmer: { emoji: '🧑‍🌾', label: 'Nông dân' },
  fisher: { emoji: '🎣', label: 'Ngư dân' },
  eater: { emoji: '🍽️', label: 'Người ăn sạch' },
  restaurant: { emoji: '👨‍🍳', label: 'Nhà hàng' },
  distributor: { emoji: '📦', label: 'Nhà phân phối' },
  shipper: { emoji: '🚚', label: 'Shipper' },
};

const Profile = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");

  const userPosts = mockPosts.slice(0, 3);
  const roleInfo = profileTypeLabels[profile?.profile_type || 'farmer'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Cover Photo */}
        <div className="relative h-48 md:h-72 lg:h-80 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=400&fit=crop')] bg-cover bg-center opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Change Cover Button */}
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute bottom-4 right-4 gap-2 bg-background/80 backdrop-blur-sm"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Đổi ảnh bìa</span>
          </Button>
        </div>

        {/* Profile Info Section */}
        <div className="container max-w-5xl mx-auto px-4">
          <div className="relative -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl">
                  <AvatarImage src={profile?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {roleInfo.emoji}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Info */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {profile?.display_name || 'FUN Farmer'}
                  </h1>
                  {profile?.is_verified && (
                    <BadgeCheck className="w-6 h-6 text-primary fill-primary/20" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <span className="text-lg">{roleInfo.emoji}</span>
                  <span className="font-medium">{roleInfo.label}</span>
                </div>

                {profile?.wallet_connected && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground font-mono">
                    <Wallet className="w-4 h-4" />
                    {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                  </div>
                )}

                {profile?.location && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pb-4">
                <Link to="/profile-setup">
                  <Button className="gradient-hero border-0 gap-2">
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa hồ sơ
                  </Button>
                </Link>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 py-4 border-y border-border">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{userPosts.length}</div>
                <div className="text-sm text-muted-foreground">Bài viết</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">1.2K</div>
                <div className="text-sm text-muted-foreground">Người theo dõi</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">89</div>
                <div className="text-sm text-muted-foreground">Đang theo dõi</div>
              </div>
              <div className="text-center ml-auto">
                <div className="text-xl font-bold text-accent">{profile?.camly_balance?.toLocaleString() || 0}</div>
                <div className="text-sm text-muted-foreground">CAMLY</div>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-4 text-muted-foreground">{profile.bio}</p>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
              >
                <Grid3X3 className="w-4 h-4" />
                Bài viết
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
              >
                <User className="w-4 h-4" />
                Giới thiệu
              </TabsTrigger>
              <TabsTrigger 
                value="friends" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
              >
                <Users className="w-4 h-4" />
                Bạn bè
              </TabsTrigger>
              <TabsTrigger 
                value="photos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Ảnh
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
              >
                <Gift className="w-4 h-4" />
                Nhận thưởng
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-6 space-y-6">
              {userPosts.map((post) => (
                <FeedPost key={post.id} post={post} />
              ))}
              {userPosts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Chưa có bài viết nào</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="about" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4">Giới thiệu</h3>
                <p className="text-muted-foreground">
                  {profile?.bio || "Chưa có thông tin giới thiệu. Hãy cập nhật hồ sơ của bạn!"}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xl">{roleInfo.emoji}</span>
                    <span>{roleInfo.label} tại FUN FARM</span>
                  </div>
                  {profile?.location && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>Sống tại {profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-5 h-5" />
                    <span>Tham gia từ {new Date(profile?.created_at || Date.now()).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tính năng bạn bè đang được phát triển!</p>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              <div className="grid grid-cols-3 gap-2">
                {userPosts.filter(p => p.images?.length).map((post) => (
                  post.images?.map((img, i) => (
                    <div key={`${post.id}-${i}`} className="aspect-square rounded-lg overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                    </div>
                  ))
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rewards" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎁</div>
                  <h3 className="font-semibold text-lg">Phần thưởng của bạn</h3>
                  <div className="mt-4 p-4 rounded-xl bg-accent/10 inline-block">
                    <div className="text-3xl font-bold text-accent">
                      {profile?.camly_balance?.toLocaleString() || 0} CAMLY
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Số dư hiện tại</div>
                  </div>
                  <div className="mt-4">
                    <Link to="/reward">
                      <Button className="gradient-hero border-0 gap-2">
                        <Gift className="w-4 h-4" />
                        Xem chi tiết & Claim
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
