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
import UserProfile from "./pages/UserProfile";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Reward from "./pages/Reward";
import Leaderboard from "./pages/Leaderboard";
import ShipperDashboard from "./pages/ShipperDashboard";
import ShipperRegister from "./pages/ShipperRegister";
import Admin from "./pages/Admin";
import LoveRules from "./pages/LoveRules";
import AboutFunFarm from "./pages/AboutFunFarm";
import Whitepaper from "./pages/Whitepaper";
import Wallet from "./pages/Wallet";
import Notifications from "./pages/Notifications";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

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
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/user/:userId" element={<UserProfile />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile-setup" element={<ProfileSetup />} />
                  <Route path="/reward" element={<Reward />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/shipper" element={<ShipperDashboard />} />
                  <Route path="/shipper/register" element={<ShipperRegister />} />
                <Route path="/admin" element={<Admin />} />
                  <Route path="/love-rules" element={<LoveRules />} />
                  <Route path="/about-fun-farm" element={<AboutFunFarm />} />
                  <Route path="/whitepaper" element={<Whitepaper />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/post/:postId" element={<PostDetail />} />
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
