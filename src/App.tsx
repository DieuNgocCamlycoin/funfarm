// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/hooks/useAuth';
import { RealtimeNotificationsProvider } from "@/components/RealtimeNotificationsProvider";
import { ConfettiProvider } from "@/components/ConfettiProvider";
import { AngelProvider } from "@/components/angel";

import Welcome from "./pages/Welcome";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Marketplace from "./pages/Marketplace";
import UserProfile from "./pages/UserProfile";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import SSOCallback from "./pages/SSOCallback";
import Reward from "./pages/Reward";
import Leaderboard from "./pages/Leaderboard";
import ShipperDashboard from "./pages/ShipperDashboard";
import ShipperRegister from "./pages/ShipperRegister";
import Admin from "./pages/Admin";
import LawOfLight from "./pages/LawOfLight";
import AboutFunFarm from "./pages/AboutFunFarm";
import Whitepaper from "./pages/Whitepaper";
import Wallet from "./pages/Wallet";
import Notifications from "./pages/Notifications";
import PostDetail from "./pages/PostDetail";
import AngelAI from "./pages/AngelAI";
import NotFound from "./pages/NotFound";
import MyOrders from "./pages/MyOrders";
import SellerDashboard from "./pages/SellerDashboard";
import ProductDetail from "./pages/ProductDetail";
import SellerShop from "./pages/SellerShop";
import Wishlist from "./pages/Wishlist";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GiftCardLab from "./pages/GiftCardLab";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeNotificationsProvider>
        <ConfettiProvider>
          <AngelProvider defaultEnabled={true}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Feed />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/user/:userId" element={<UserProfile />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<SSOCallback />} />
                  <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
                  <Route path="/reward" element={<ProtectedRoute><Reward /></ProtectedRoute>} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/shipper" element={<ProtectedRoute><ShipperDashboard /></ProtectedRoute>} />
                  <Route path="/shipper/register" element={<ProtectedRoute><ShipperRegister /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                  <Route path="/law-of-light" element={<LawOfLight />} />
                  <Route path="/about-fun-farm" element={<AboutFunFarm />} />
                  <Route path="/whitepaper" element={<Whitepaper />} />
                  <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/post/:postId" element={<PostDetail />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/product/:productId" element={<ProductDetail />} />
                  <Route path="/shop/:sellerId" element={<SellerShop />} />
                  <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                  <Route path="/angel-ai" element={<AngelAI />} />
                  <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                  <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                  <Route path="/gift-card-lab" element={<GiftCardLab />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              
            </TooltipProvider>
          </AngelProvider>
        </ConfettiProvider>
      </RealtimeNotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
