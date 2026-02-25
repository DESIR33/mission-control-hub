import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { WorkspaceSection } from "@/components/settings/WorkspaceSection";
import { MembersSection } from "@/components/settings/MembersSection";
import { BillingSection } from "@/components/settings/BillingSection";

function SettingsContent() {
  return (
    <div className="p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
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
          Manage your profile, workspace, team, and billing.
        </p>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <WorkspaceProvider>
      <SettingsContent />
    </WorkspaceProvider>
  );
}
