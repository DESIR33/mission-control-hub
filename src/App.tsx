import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RelationshipsPage from "./pages/RelationshipsPage";
import {
  ContentPage,
  MonetizationPage,
  TasksPage,
  AiBridgePage,
  NotificationsPage,
  IntegrationsPage,
  SettingsPage,
} from "./pages/SectionPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/relationships" element={<RelationshipsPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/monetization" element={<MonetizationPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/ai-bridge" element={<AiBridgePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
