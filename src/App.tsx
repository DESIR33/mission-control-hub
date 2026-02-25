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
import {
  ContentPage,
  TasksPage,
} from "./pages/SectionPages";
import MonetizationPage from "./pages/MonetizationPage";
import AiBridgePage from "./pages/AiBridgePage";
import SettingsPage from "./pages/SettingsPage";
import InboxPage from "./pages/InboxPage";
import AffiliateProgramPage from "./pages/AffiliateProgramPage";
import NewAffiliateProgramPage from "./pages/NewAffiliateProgramPage";
import EditAffiliateProgramPage from "./pages/EditAffiliateProgramPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import EditTransactionPage from "./pages/EditTransactionPage";

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
              <Route path="/content" element={<ContentPage />} />
              <Route path="/monetization" element={<MonetizationPage />} />
              <Route path="/affiliate-program/new" element={<NewAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id" element={<AffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/edit" element={<EditAffiliateProgramPage />} />
              <Route path="/affiliate-program/:id/add-transaction" element={<AddTransactionPage />} />
              <Route path="/affiliate-program/:id/edit-transaction" element={<EditTransactionPage />} />
              <Route path="/tasks" element={<TasksPage />} />
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
