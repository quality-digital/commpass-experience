import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider, useUser } from "@/contexts/UserContext";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMissions from "./pages/admin/AdminMissions";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminApprovals from "./pages/admin/AdminApprovals";
import GoldenPass from "./pages/GoldenPass";
import Policies from "./pages/Policies";
import AdminPolicies from "./pages/admin/AdminPolicies";
import AdminPrizes from "./pages/admin/AdminPrizes";


const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin, loading } = useUser();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<GuestGuard><Welcome /></GuestGuard>} />
    <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
    <Route path="/reset-password" element={<ResetPassword />} />
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
    <Route path="/golden-pass" element={<AuthGuard><GoldenPass /></AuthGuard>} />
    <Route path="/policies" element={<Policies />} />
    <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
    <Route path="/admin/missions" element={<AdminGuard><AdminMissions /></AdminGuard>} />
    <Route path="/admin/quizzes" element={<AdminGuard><AdminQuizzes /></AdminGuard>} />
    <Route path="/admin/brands" element={<AdminGuard><AdminBrands /></AdminGuard>} />
    <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
    <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
    <Route path="/admin/approvals" element={<AdminGuard><AdminApprovals /></AdminGuard>} />
      <Route path="/admin/policies" element={<AdminGuard><AdminPolicies /></AdminGuard>} />
      <Route path="/admin/prizes" element={<AdminGuard><AdminPrizes /></AdminGuard>} />
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
