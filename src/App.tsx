import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider, useUser } from "@/contexts/UserContext";
import OfflineBanner from "@/components/OfflineBanner";
import InstallPrompt from "@/components/InstallPrompt";
import { Analytics } from "@vercel/analytics/react";

// Eager load critical auth pages
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";

// Lazy load everything else
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RegisterType = lazy(() => import("./pages/RegisterType"));
const Register = lazy(() => import("./pages/Register"));
const AvatarSelection = lazy(() => import("./pages/AvatarSelection"));
const OnboardingComplete = lazy(() => import("./pages/OnboardingComplete"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Missions = lazy(() => import("./pages/Missions"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Profile = lazy(() => import("./pages/Profile"));
const Brands = lazy(() => import("./pages/Brands"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GoldenPass = lazy(() => import("./pages/GoldenPass"));
const Prizes = lazy(() => import("./pages/Prizes"));
const Policies = lazy(() => import("./pages/Policies"));
const Roulette = lazy(() => import("./pages/Roulette"));
const EasterEggPresencial = lazy(() => import("./pages/EasterEggPresencial"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMissions = lazy(() => import("./pages/admin/AdminMissions"));
const AdminQuizzes = lazy(() => import("./pages/admin/AdminQuizzes"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminPolicies = lazy(() => import("./pages/admin/AdminPolicies"));
const AdminPrizes = lazy(() => import("./pages/admin/AdminPrizes"));
const AdminAvatars = lazy(() => import("./pages/admin/AdminAvatars"));
const AdminOnboarding = lazy(() => import("./pages/admin/AdminOnboarding"));
const AdminRoulette = lazy(() => import("./pages/admin/AdminRoulette"));
const AdminEasterEgg = lazy(() => import("./pages/admin/AdminEasterEgg"));
const AdminRanking = lazy(() => import("./pages/admin/AdminRanking"));
const AdminExports = lazy(() => import("./pages/admin/AdminExports"));
const AdminRanking = lazy(() => import("./pages/admin/AdminRanking"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min stale time to reduce requests
      gcTime: 1000 * 60 * 10,   // 10 min cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin, loading } = useUser();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
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
      <Route path="/prizes" element={<AuthGuard><Prizes /></AuthGuard>} />
      <Route path="/policies" element={<Policies />} />
      <Route path="/roulette" element={<Roulette />} />
      <Route path="/easter-egg-presencial" element={<AuthGuard><EasterEggPresencial /></AuthGuard>} />
      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/missions" element={<AdminGuard><AdminMissions /></AdminGuard>} />
      <Route path="/admin/quizzes" element={<AdminGuard><AdminQuizzes /></AdminGuard>} />
      <Route path="/admin/brands" element={<AdminGuard><AdminBrands /></AdminGuard>} />
      <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
      <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
      <Route path="/admin/approvals" element={<AdminGuard><AdminApprovals /></AdminGuard>} />
      <Route path="/admin/policies" element={<AdminGuard><AdminPolicies /></AdminGuard>} />
      <Route path="/admin/prizes" element={<AdminGuard><AdminPrizes /></AdminGuard>} />
      <Route path="/admin/avatars" element={<AdminGuard><AdminAvatars /></AdminGuard>} />
      <Route path="/admin/onboarding" element={<AdminGuard><AdminOnboarding /></AdminGuard>} />
      <Route path="/admin/roulette" element={<AdminGuard><AdminRoulette /></AdminGuard>} />
      <Route path="/admin/easter-egg" element={<AdminGuard><AdminEasterEgg /></AdminGuard>} />
      <Route path="/admin/ranking" element={<AdminGuard><AdminRanking /></AdminGuard>} />
      <Route path="/admin/exports" element={<AdminGuard><AdminExports /></AdminGuard>} />
      <Route path="/admin/ranking" element={<AdminGuard><AdminRanking /></AdminGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBanner />
      <BrowserRouter>
        <UserProvider>
          <AppRoutes />
          <InstallPrompt />
        </UserProvider>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
