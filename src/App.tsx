import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import RelationshipsPage from "./pages/RelationshipsPage";
import NotificationsPage from "./pages/NotificationsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import Tasks from "./pages/Tasks";
import ProjectsPage from "./pages/ProjectsPage";
import MonetizationPage from "./pages/MonetizationPage";
import VideoQueuePage from "./pages/VideoQueuePage";
import VideoQueueFormPage from "./pages/VideoQueueFormPage";
import AiBridgePage from "./pages/AiBridgePage";
import SettingsPage from "./pages/SettingsPage";
import InboxPage from "./pages/InboxPage";
import AffiliateProgramPage from "./pages/AffiliateProgramPage";
import NewAffiliateProgramPage from "./pages/NewAffiliateProgramPage";
import EditAffiliateProgramPage from "./pages/EditAffiliateProgramPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import EditTransactionPage from "./pages/EditTransactionPage";
import AddCompanyPage from "./pages/AddCompanyPage";
import AddContactPage from "./pages/AddContactPage";
import AddProductTransactionPage from "./pages/AddProductTransactionPage";
import NewSponsorshipPage from "./pages/NewSponsorshipPage";
import DealsPage from "./pages/DealsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SponsorDiscoveryPage from "./pages/SponsorDiscoveryPage";
import EmailSequencesPage from "./pages/EmailSequencesPage";
import WeeklyReportPage from "./pages/WeeklyReportPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import YouTubeCommandCenterPage from "./pages/YouTubeCommandCenterPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center animate-pulse">
          <span className="text-background font-bold text-sm">D</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/relationships" element={<RelationshipsPage />} />
              <Route path="/relationships/new-company" element={<AddCompanyPage />} />
              <Route path="/relationships/new-contact" element={<AddContactPage />} />
              <Route path="/content" element={<VideoQueuePage />} />
              <Route path="/content/create" element={<VideoQueueFormPage />} />
              <Route path="/content/:id/edit" element={<VideoQueueFormPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/analytics/videos/:youtubeVideoId" element={<VideoDetailPage />} />
              <Route path="/command-center" element={<YouTubeCommandCenterPage />} />
              <Route path="/monetization" element={<MonetizationPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/discover" element={<SponsorDiscoveryPage />} />
              <Route path="/sequences" element={<EmailSequencesPage />} />
              <Route path="/reports" element={<WeeklyReportPage />} />
              <Route path="/affiliate-program/new" element={<NewAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id" element={<AffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/edit" element={<EditAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/add-transaction" element={<AddTransactionPage />} />
              <Route path="/affiliate-program/:id/edit-transaction" element={<EditTransactionPage />} />
              <Route path="/sponsorship/new" element={<NewSponsorshipPage />} />
              <Route path="/add-transaction" element={<AddProductTransactionPage />} />
              <Route path="/add-transaction/:id" element={<AddProductTransactionPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/ai-bridge" element={<AiBridgePage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/*" element={<InboxPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
