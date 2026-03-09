import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/page-skeleton";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const OutlookCallbackPage = lazy(() => import("./pages/OutlookCallbackPage"));
const Tasks = lazy(() => import("./pages/Tasks"));
const MonetizationPage = lazy(() => import("./pages/MonetizationPage"));
const ContentProjectsPage = lazy(() => import("./pages/ContentProjectsPage"));
const VideoQueueFormPage = lazy(() => import("./pages/VideoQueueFormPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const WeeklyReportPage = lazy(() => import("./pages/WeeklyReportPage"));
const AffiliateProgramPage = lazy(() => import("./pages/AffiliateProgramPage"));
const NewAffiliateProgramPage = lazy(() => import("./pages/NewAffiliateProgramPage"));
const EditAffiliateProgramPage = lazy(() => import("./pages/EditAffiliateProgramPage"));
const AddTransactionPage = lazy(() => import("./pages/AddTransactionPage"));
const EditTransactionPage = lazy(() => import("./pages/EditTransactionPage"));
const AddCompanyPage = lazy(() => import("./pages/AddCompanyPage"));
const AddContactPage = lazy(() => import("./pages/AddContactPage"));
const AddProductTransactionPage = lazy(() => import("./pages/AddProductTransactionPage"));
const NewSponsorshipPage = lazy(() => import("./pages/NewSponsorshipPage"));
const VideoDetailPage = lazy(() => import("./pages/VideoDetailPage"));
const WeeklySprintPage = lazy(() => import("./pages/WeeklySprintPage"));
const CompanyProfilePage = lazy(() => import("./pages/CompanyProfilePage"));
const ContactProfilePage = lazy(() => import("./pages/ContactProfilePage"));
const NetworkPage = lazy(() => import("./pages/NetworkPage"));
const YouTubeHubPage = lazy(() => import("./pages/YouTubeHubPage").then(m => ({ default: m.default })));
const GrowthPage = lazy(() => import("./pages/YouTubeHubPage").then(m => ({ default: m.GrowthPage })));
const AIHubPage = lazy(() => import("./pages/AIHubPage"));
const ProposalDetailPage = lazy(() => import("./pages/ProposalDetailPage"));

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

/** Wraps a lazy page in Suspense + ErrorBoundary */
function LazyPage({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <ErrorBoundary section={section}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<PublicRoute><LazyPage section="Auth"><AuthPage /></LazyPage></PublicRoute>} />
            <Route path="/reset-password" element={<LazyPage section="Reset Password"><ResetPasswordPage /></LazyPage>} />
            <Route path="/auth/outlook/callback" element={<LazyPage section="Outlook"><OutlookCallbackPage /></LazyPage>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<LazyPage section="Dashboard"><Index /></LazyPage>} />

              {/* Content Pipeline */}
              <Route path="/content" element={<LazyPage section="Content"><ContentProjectsPage /></LazyPage>} />
              <Route path="/content/create" element={<LazyPage section="Create Content"><VideoQueueFormPage /></LazyPage>} />
              <Route path="/content/:id/edit" element={<LazyPage section="Edit Content"><VideoQueueFormPage /></LazyPage>} />

              {/* Content Management (YouTube Hub) */}
              <Route path="/youtube" element={<Navigate to="/youtube/dashboard" replace />} />
              <Route path="/youtube/:section" element={<LazyPage section="YouTube Hub"><YouTubeHubPage /></LazyPage>} />
              <Route path="/analytics/videos/:youtubeVideoId" element={<LazyPage section="Video Detail"><VideoDetailPage /></LazyPage>} />

              {/* Growth */}
              <Route path="/growth" element={<Navigate to="/growth/forecast" replace />} />
              <Route path="/growth/:section" element={<LazyPage section="Growth"><GrowthPage /></LazyPage>} />

              {/* Revenue */}
              <Route path="/revenue" element={<Navigate to="/revenue/overview" replace />} />
              <Route path="/revenue/:tab" element={<LazyPage section="Revenue"><MonetizationPage /></LazyPage>} />
              <Route path="/affiliate-program/new" element={<LazyPage section="New Affiliate"><NewAffiliateProgramPage /></LazyPage>} />
              <Route path="/affiliate-program/:id" element={<LazyPage section="Affiliate Program"><AffiliateProgramPage /></LazyPage>} />
              <Route path="/affiliate-program/:id/edit" element={<LazyPage section="Edit Affiliate"><EditAffiliateProgramPage /></LazyPage>} />
              <Route path="/affiliate-program/:id/add-transaction" element={<LazyPage section="Add Transaction"><AddTransactionPage /></LazyPage>} />
              <Route path="/affiliate-program/:id/edit-transaction" element={<LazyPage section="Edit Transaction"><EditTransactionPage /></LazyPage>} />
              <Route path="/sponsorship/new" element={<LazyPage section="New Sponsorship"><NewSponsorshipPage /></LazyPage>} />
              <Route path="/add-transaction" element={<LazyPage section="Add Transaction"><AddProductTransactionPage /></LazyPage>} />
              <Route path="/add-transaction/:id" element={<LazyPage section="Add Transaction"><AddProductTransactionPage /></LazyPage>} />

              {/* Network */}
              <Route path="/network" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/network/:section" element={<LazyPage section="Network"><NetworkPage /></LazyPage>} />
              <Route path="/relationships/new-company" element={<LazyPage section="Add Company"><AddCompanyPage /></LazyPage>} />
              <Route path="/relationships/new-contact" element={<LazyPage section="Add Contact"><AddContactPage /></LazyPage>} />
              <Route path="/relationships/companies/:companyId" element={<LazyPage section="Company Profile"><CompanyProfilePage /></LazyPage>} />

              {/* Reports */}
              <Route path="/reports" element={<Navigate to="/reports/weekly" replace />} />
              <Route path="/reports/weekly" element={<LazyPage section="Weekly Report"><WeeklyReportPage /></LazyPage>} />

              {/* AI Hub */}
              <Route path="/ai" element={<Navigate to="/ai/chat" replace />} />
              <Route path="/ai/proposals/:proposalId" element={<LazyPage section="Proposal Detail"><ProposalDetailPage /></LazyPage>} />
              <Route path="/ai/:tab" element={<LazyPage section="AI Hub"><AIHubPage /></LazyPage>} />

              {/* Task detail/create routes */}
              <Route path="/tasks/:id" element={<LazyPage section="Tasks"><Tasks /></LazyPage>} />
              <Route path="/tasks/create" element={<LazyPage section="Tasks"><Tasks /></LazyPage>} />
              <Route path="/projects/:projectId/tasks/create" element={<LazyPage section="Tasks"><Tasks /></LazyPage>} />

              {/* Growth Sprints */}
              <Route path="/sprints" element={<LazyPage section="Sprints"><WeeklySprintPage /></LazyPage>} />

              {/* Communication */}
              <Route path="/inbox" element={<LazyPage section="Inbox"><InboxPage /></LazyPage>} />
              <Route path="/inbox/*" element={<LazyPage section="Inbox"><InboxPage /></LazyPage>} />
              <Route path="/notifications" element={<LazyPage section="Notifications"><NotificationsPage /></LazyPage>} />

              {/* Integrations */}
              <Route path="/integrations" element={<LazyPage section="Integrations"><IntegrationsPage /></LazyPage>} />

              {/* System */}
              <Route path="/settings" element={<LazyPage section="Settings"><SettingsPage /></LazyPage>} />

              {/* Backward-compatibility redirects */}
              <Route path="/partnerships" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/relationships" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/deals" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/discover" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/collaborations" element={<Navigate to="/network/contacts" replace />} />
              <Route path="/analytics" element={<Navigate to="/youtube/dashboard" replace />} />
              <Route path="/command-center" element={<Navigate to="/youtube/dashboard" replace />} />
              <Route path="/comments" element={<Navigate to="/youtube/comments" replace />} />
              <Route path="/tasks" element={<Navigate to="/content" replace />} />
              <Route path="/chat" element={<Navigate to="/ai/chat" replace />} />
              <Route path="/ai-bridge" element={<Navigate to="/ai/proposals" replace />} />
              <Route path="/agents" element={<Navigate to="/ai/agents" replace />} />
              <Route path="/memory" element={<Navigate to="/ai/memory" replace />} />
              <Route path="/monetization" element={<Navigate to="/revenue/overview" replace />} />
              <Route path="/sequences" element={<Navigate to="/inbox" replace />} />
              <Route path="/projects" element={<Navigate to="/content" replace />} />
            </Route>
            <Route path="*" element={<LazyPage section="Not Found"><NotFound /></LazyPage>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
