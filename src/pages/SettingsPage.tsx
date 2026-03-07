import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { WorkspaceSection } from "@/components/settings/WorkspaceSection";
import { MembersSection } from "@/components/settings/MembersSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { AutomationSection } from "@/components/settings/AutomationSection";
import { IntegrationsContent } from "@/pages/IntegrationsPage";

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const updateTab = (v: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", v);
    window.history.replaceState({}, "", `?${sp.toString()}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your profile, workspace, team, billing, and integrations.
        </p>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} onValueChange={updateTab} className="space-y-6">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="profile" className="flex-1 sm:flex-none">Profile</TabsTrigger>
          <TabsTrigger value="workspace" className="flex-1 sm:flex-none">Workspace</TabsTrigger>
          <TabsTrigger value="members" className="flex-1 sm:flex-none">Members</TabsTrigger>
          <TabsTrigger value="billing" className="flex-1 sm:flex-none">Billing</TabsTrigger>
          <TabsTrigger value="automation" className="flex-1 sm:flex-none">Automation</TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1 sm:flex-none">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="workspace">
          <WorkspaceSection />
        </TabsContent>

        <TabsContent value="members">
          <MembersSection />
        </TabsContent>

        <TabsContent value="billing">
          <BillingSection />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationSection />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

