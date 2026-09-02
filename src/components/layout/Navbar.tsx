// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { Button } from "@/components/ui/button";
import { Menu, X, Wallet, LogOut, Coins, Home, User, Search, Shield, Gift, Sprout, ShoppingBag } from "lucide-react";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LanguageSwitcher from "./LanguageSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FriendSearch } from "@/components/FriendSearch";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import EcosystemSidebar from "@/components/feed/EcosystemSidebar";

const profileTypeEmojis: Record<string, string> = {
  farmer: '🧑‍🌾',
  fisher: '🎣',
  eater: '🍽️',
  restaurant: '👨‍🍳',
  distributor: '📦',
  shipper: '🚚',
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isWelcomePage = location.pathname === "/welcome";
  const isHomePage = location.pathname === "/";
  const { user, profile, signOut, isLoading } = useAuth();
  const { t } = useTranslation();
  const { canAccessAdmin } = useAdminAccess();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="ff-navbar fixed top-0 left-0 right-0 z-[9999]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Search - Facebook style */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={funFarmLogo} 
                alt="FUN FARM Web3" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ff-brand-logo"
                data-angel-perch="logo"
              />
              <span className="ff-brand-wordmark font-display font-bold text-xl hidden sm:block">
                FUN FARM
              </span>
            </Link>

            {/* Search Button - Facebook style */}
            {user && (
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 w-9 sm:h-10 sm:w-10 md:w-auto md:px-4 rounded-full bg-muted hover:bg-muted/80 gap-2"
                  >
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    <span className="hidden md:inline text-muted-foreground text-sm">
                      Tìm bạn bè...
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[320px] sm:w-[400px] max-h-[600px] overflow-y-auto p-0" 
                  align="start"
                  sideOffset={8}
                >
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      Tìm kiếm bạn bè
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tìm theo tên, vị trí hoặc loại thành viên
                    </p>
                  </div>
                  <div className="p-4">
                    <FriendSearch compact />
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Mobile quick actions: Search only - other icons moved to bottom nav */}
          {/* Removed to avoid duplication with MobileBottomNav */}

          {/* Desktop Navigation - Simplified */}
          <div className="hidden md:flex items-center gap-3">
            <Link 
              to="/" 
              className={`ff-nav-link flex items-center gap-2 transition-colors font-medium ${
                isHomePage ? 'ff-nav-link-active' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Home className="w-4 h-4" />
              Trang Chủ
            </Link>
            <Link 
              to="/marketplace" 
              className={`ff-nav-link flex items-center gap-2 transition-colors font-medium ${
                location.pathname === '/marketplace' ? 'ff-nav-link-active' : 'text-muted-foreground hover:text-green-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Chợ Nông Sản
            </Link>
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user && profile ? (
              <div className="flex items-center gap-3">
                {/* Wallet Link */}
                <Link 
                  to="/wallet" 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${
                    location.pathname === '/wallet' 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium hidden lg:inline">Ví & Quà</span>
                </Link>

                {/* Notification Bell */}
                <NotificationBell />

                {/* Avatar - Click to go to profile (like Facebook) */}
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <span className="text-sm font-medium hidden lg:block">
                    {profile.display_name || 'FUN Farmer'}
                  </span>
                  <Avatar className="h-10 w-10 border-2 border-primary/20 cursor-pointer">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-lg">
                      {profileTypeEmojis[profile.profile_type] || '🌱'}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-popover z-50" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile.display_name || 'FUN Farmer'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground font-mono">
                          {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/" className="cursor-pointer">
                        🏠 Trang Chủ
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-orders" className="cursor-pointer">
                        📦 Đơn hàng của tôi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller" className="cursor-pointer">
                        🏪 Quản lý bán hàng
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/reward" className="cursor-pointer">
                        🎁 {t('nav.reward')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile-setup" className="cursor-pointer">
                        ⚙️ {t('nav.editProfile')}
                      </Link>
                    </DropdownMenuItem>
                    {canAccessAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer text-primary">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('common.disconnect')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="gap-2">
                    <Wallet className="w-4 h-4" />
                    {t('common.connect')}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="ff-luxury-gold-button rounded-full border-0 px-6 text-[#4e3908]">
                    {t('common.joinNow')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border bg-white/95 relative z-[9999]">
            <div className="flex flex-col gap-4">
              {/* Language Switcher for Mobile */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('language.title')}</span>
                <LanguageSwitcher />
              </div>
              
              {user && profile && (
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-lg">
                      {profileTypeEmojis[profile.profile_type] || '🌱'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{profile.display_name || 'FUN Farmer'}</p>
                    <div className="flex items-center gap-1 text-sm text-accent">
                      <Coins className="w-3 h-3" />
                      {profile.camly_balance.toLocaleString()} CAMLY
                    </div>
                  </div>
                </div>
              )}
              
              <Link 
                to="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Home className="w-4 h-4" />
                Trang Chủ
              </Link>
              <Link 
                to="/marketplace" 
                className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                🛒 Chợ Nông Sản
              </Link>
              {user && profile && (
                <>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Trang cá nhân
                  </Link>
                  <Link 
                    to="/wallet" 
                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    <Gift className="w-4 h-4" />
                    Ví & Quà tặng
                  </Link>
                </>
              )}
              {canAccessAdmin && (
                <Link 
                  to="/admin" 
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              )}
              {/* FUN Ecosystem Drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <button 
                    className="flex items-center gap-2 w-full text-left font-bold py-2 px-3 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))',
                      border: '2px solid #fbbf24',
                      color: '#fbbf24',
                    }}
                  >
                    <Sprout className="w-5 h-5" />
                    🌱 FUN Ecosystem
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] max-w-[360px] p-0 border-r-2 border-amber-400/50 bg-gradient-to-b from-emerald-900/95 to-emerald-950/95 backdrop-blur-xl">
                  <SheetTitle className="sr-only">FUN Ecosystem Menu</SheetTitle>
                  <div className="h-full overflow-y-auto py-4 px-3">
                    <EcosystemSidebar />
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/love-rules" className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 transition-colors font-medium" onClick={() => setIsOpen(false)}>
                ⚡ Luật Ánh Sáng
              </Link>
              <div className="flex gap-3 pt-4 relative z-[99999]">
                {user ? (
                  <Button variant="outline" className="flex-1 gap-2 relative z-[99999]" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                    {t('common.disconnect')}
                  </Button>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1 relative z-[99999]" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full gap-2 relative z-[99999]">
                        <Wallet className="w-4 h-4" />
                        {t('common.connect')}
                      </Button>
                    </Link>
                    <Link to="/auth" className="flex-1 relative z-[99999]" onClick={() => setIsOpen(false)}>
                      <Button className="w-full gradient-hero border-0 relative z-[99999]">{t('common.joinNow')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
