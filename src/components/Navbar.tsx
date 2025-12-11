// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { Button } from "@/components/ui/button";
import { Menu, X, Wallet, LogOut, Coins, Home, User } from "lucide-react";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  const location = useLocation();
  const navigate = useNavigate();
  const isWelcomePage = location.pathname === "/welcome";
  const isHomePage = location.pathname === "/";
  const { user, profile, signOut, isLoading } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={funFarmLogo} 
              alt="FUN FARM Web3" 
              className="w-12 h-12 rounded-xl object-cover shadow-glow"
            />
            <span className="font-display font-bold text-xl text-gradient-hero">
              FUN FARM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`flex items-center gap-2 transition-colors font-medium ${
                isHomePage ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Home className="w-4 h-4" />
              Trang Chủ
            </Link>
            {isWelcomePage ? (
              <>
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.features')}
                </a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.howItWorks')}
                </a>
                <a href="#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.earn')}
                </a>
                <a href="#community" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.community')}
                </a>
              </>
            ) : (
              <>
                <Link to="/welcome#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.features')}
                </Link>
                <Link to="/welcome#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {t('nav.earn')}
                </Link>
              </>
            )}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user && profile ? (
              <div className="flex items-center gap-3">

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
                      <Link to="/reward" className="cursor-pointer">
                        🎁 {t('nav.reward')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile-setup" className="cursor-pointer">
                        ⚙️ {t('nav.editProfile')}
                      </Link>
                    </DropdownMenuItem>
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
                  <Button className="gradient-hero border-0">
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
              {user && profile && (
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Trang cá nhân
                </Link>
              )}
              {isWelcomePage ? (
                <>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    {t('nav.features')}
                  </a>
                  <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    {t('nav.howItWorks')}
                  </a>
                  <a href="#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    {t('nav.earn')}
                  </a>
                  <a href="#community" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    {t('nav.community')}
                  </a>
                </>
              ) : (
                <Link to="/welcome" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                  Giới thiệu
                </Link>
              )}
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
