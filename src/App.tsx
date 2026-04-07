import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider, useUser } from "@/contexts/UserContext";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import RegisterType from "./pages/RegisterType";
import Register from "./pages/Register";
import AvatarSelection from "./pages/AvatarSelection";
import OnboardingComplete from "./pages/OnboardingComplete";
import HomePage from "./pages/HomePage";
import Missions from "./pages/Missions";
import QuizPage from "./pages/QuizPage";
import Ranking from "./pages/Ranking";
import Profile from "./pages/Profile";
import Brands from "./pages/Brands";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useUser();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useUser();
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<GuestGuard><Welcome /></GuestGuard>} />
    <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
    <Route path="/register-type" element={<GuestGuard><RegisterType /></GuestGuard>} />
    <Route path="/register/:type" element={<GuestGuard><Register /></GuestGuard>} />
    <Route path="/avatar" element={<AvatarSelection />} />
    <Route path="/onboarding-complete" element={<OnboardingComplete />} />
    <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
    <Route path="/missions" element={<AuthGuard><Missions /></AuthGuard>} />
    <Route path="/quiz/:quizId" element={<AuthGuard><QuizPage /></AuthGuard>} />
    <Route path="/ranking" element={<AuthGuard><Ranking /></AuthGuard>} />
    <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
    <Route path="/brands" element={<AuthGuard><Brands /></AuthGuard>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
