import { Button } from "@/components/ui/button";
import { Leaf, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-hero rounded-xl flex items-center justify-center shadow-glow">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-gradient-hero">
              FUN FARM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/feed" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Newsfeed
            </Link>
            {isHome ? (
              <>
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  Features
                </a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  How It Works
                </a>
                <a href="#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  Earn
                </a>
                <a href="#community" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  Community
                </a>
              </>
            ) : (
              <>
                <Link to="/#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  Features
                </Link>
                <Link to="/#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  Earn
                </Link>
              </>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero" size="default">
              Join Now
            </Button>
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
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link 
                to="/feed" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                Newsfeed
              </Link>
              {isHome ? (
                <>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    Features
                  </a>
                  <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    How It Works
                  </a>
                  <a href="#earn" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    Earn
                  </a>
                  <a href="#community" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                    Community
                  </a>
                </>
              ) : (
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsOpen(false)}>
                  Home
                </Link>
              )}
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1">Sign In</Button>
                <Button variant="hero" className="flex-1">Join Now</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
