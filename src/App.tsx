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
import NotificationsPage from "./pages/NotificationsPage";

import Tasks from "./pages/Tasks";
import MonetizationPage from "./pages/MonetizationPage";
import ContentProjectsPage from "./pages/ContentProjectsPage";
import VideoQueueFormPage from "./pages/VideoQueueFormPage";
import SettingsPage from "./pages/SettingsPage";
import InboxPage from "./pages/InboxPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import WeeklyReportPage from "./pages/WeeklyReportPage";
import AffiliateProgramPage from "./pages/AffiliateProgramPage";
import NewAffiliateProgramPage from "./pages/NewAffiliateProgramPage";
import EditAffiliateProgramPage from "./pages/EditAffiliateProgramPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import EditTransactionPage from "./pages/EditTransactionPage";
import AddCompanyPage from "./pages/AddCompanyPage";
import AddContactPage from "./pages/AddContactPage";
import AddProductTransactionPage from "./pages/AddProductTransactionPage";
import NewSponsorshipPage from "./pages/NewSponsorshipPage";

import VideoDetailPage from "./pages/VideoDetailPage";
import WeeklySprintPage from "./pages/WeeklySprintPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";

// Consolidated pages
import PartnershipsPage from "./pages/PartnershipsPage";
import YouTubeHubPage from "./pages/YouTubeHubPage";
import AIHubPage from "./pages/AIHubPage";

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
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center animate-pulse">
          <span className="text-background font-bold text-sm">D</span>
        </div>
      </div>
    );
  }
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

              {/* Partnerships (consolidated) */}
              <Route path="/partnerships" element={<PartnershipsPage />} />
              <Route path="/relationships/new-company" element={<AddCompanyPage />} />
              <Route path="/relationships/new-contact" element={<AddContactPage />} />
              <Route path="/relationships/companies/:companyId" element={<CompanyProfilePage />} />

              {/* Content & Projects (consolidated) */}
              <Route path="/content" element={<ContentProjectsPage />} />
              <Route path="/content/create" element={<VideoQueueFormPage />} />
              <Route path="/content/:id/edit" element={<VideoQueueFormPage />} />

              {/* YouTube Hub (consolidated) */}
              <Route path="/youtube" element={<YouTubeHubPage />} />
              <Route path="/analytics/videos/:youtubeVideoId" element={<VideoDetailPage />} />

              {/* Revenue (renamed from Monetization) */}
              <Route path="/revenue" element={<MonetizationPage />} />
              <Route path="/affiliate-program/new" element={<NewAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id" element={<AffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/edit" element={<EditAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/add-transaction" element={<AddTransactionPage />} />
              <Route path="/affiliate-program/:id/edit-transaction" element={<EditTransactionPage />} />
              <Route path="/sponsorship/new" element={<NewSponsorshipPage />} />
              <Route path="/add-transaction" element={<AddProductTransactionPage />} />
              <Route path="/add-transaction/:id" element={<AddProductTransactionPage />} />

              {/* Task detail/create routes (projects absorbed into /content) */}
              <Route path="/tasks/:id" element={<Tasks />} />
              <Route path="/tasks/create" element={<Tasks />} />
              <Route path="/projects/:projectId/tasks/create" element={<Tasks />} />

              {/* Growth Sprints */}
              <Route path="/sprints" element={<WeeklySprintPage />} />

              {/* AI Hub (consolidated) */}
              <Route path="/ai" element={<AIHubPage />} />

              {/* Communication */}
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/*" element={<InboxPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* System */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Backward-compatibility redirects */}
              <Route path="/relationships" element={<Navigate to="/partnerships?tab=contacts" replace />} />
              <Route path="/deals" element={<Navigate to="/partnerships?tab=pipeline" replace />} />
              <Route path="/discover" element={<Navigate to="/partnerships?tab=discovery" replace />} />
              <Route path="/collaborations" element={<Navigate to="/partnerships?tab=collaborations" replace />} />
              <Route path="/analytics" element={<Navigate to="/youtube?section=dashboard" replace />} />
              <Route path="/command-center" element={<Navigate to="/youtube?section=dashboard" replace />} />
              <Route path="/comments" element={<Navigate to="/youtube?section=comments" replace />} />
              <Route path="/reports" element={<Navigate to="/youtube?section=reports" replace />} />
              <Route path="/tasks" element={<Navigate to="/content?tab=projects" replace />} />
              <Route path="/chat" element={<Navigate to="/ai?tab=chat" replace />} />
              <Route path="/ai-bridge" element={<Navigate to="/ai?tab=proposals" replace />} />
              <Route path="/agents" element={<Navigate to="/ai?tab=agents" replace />} />
              <Route path="/memory" element={<Navigate to="/ai?tab=memory" replace />} />
              <Route path="/monetization" element={<Navigate to="/revenue" replace />} />
              <Route path="/integrations" element={<Navigate to="/settings?tab=integrations" replace />} />
              <Route path="/sequences" element={<Navigate to="/inbox?folder=sequences" replace />} />
              <Route path="/projects" element={<Navigate to="/content?tab=projects" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
