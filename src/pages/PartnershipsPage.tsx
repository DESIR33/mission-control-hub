import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { CompaniesTable } from "@/components/crm/CompaniesTable";
import { ImportContactsDialog } from "@/components/crm/ImportContactsDialog";
import { ImportCompaniesDialog } from "@/components/crm/ImportCompaniesDialog";
import { ExportContactsDialog, ExportCompaniesDialog } from "@/components/crm/ExportDialog";
import { RelationshipGraph } from "@/components/crm/RelationshipGraph";
import { SponsorAttributionPanel } from "@/components/crm/SponsorAttributionPanel";
import { PartnershipPipeline } from "@/components/crm/PartnershipPipeline";
import { YouTubeLeadInbox } from "@/components/crm/YouTubeLeadInbox";
import { EngagementScorePanel } from "@/components/crm/EngagementScorePanel";
import { BulkImportWizard } from "@/components/crm/BulkImportWizard";
import { useContacts, useActivities } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useDeals } from "@/hooks/use-deals";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { Contact, Company } from "@/types/crm";
import { DealsContent } from "@/components/partnerships/DealsContent";
import { DiscoveryContent } from "@/components/partnerships/DiscoveryContent";
import { CollaborationsContent } from "@/components/partnerships/CollaborationsContent";

export default function PartnershipsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "contacts";
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: contactActivities = [] } = useActivities(selectedContact?.id ?? null);
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: deals = [] } = useDeals();

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSheetOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    navigate(`/relationships/companies/${company.id}`);
  };

  const updateTab = (v: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", v);
    window.history.replaceState({}, "", `?${sp.toString()}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Partnerships</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contacts, companies, deals pipeline, collaborations, and sponsor discovery
        </p>
      </div>

      <Tabs defaultValue={initialTab} onValueChange={updateTab}>
        <TabsList className="overflow-x-auto flex-nowrap scrollbar-hide w-full justify-start">
          <TabsTrigger value="contacts" className="flex-shrink-0">Contacts</TabsTrigger>
          <TabsTrigger value="companies" className="flex-shrink-0">Companies</TabsTrigger>
          <TabsTrigger value="pipeline" className="flex-shrink-0">Deals Pipeline</TabsTrigger>
          <TabsTrigger value="collaborations" className="flex-shrink-0">Collaborations</TabsTrigger>
          <TabsTrigger value="discovery" className="flex-shrink-0">Discovery</TabsTrigger>
          <TabsTrigger value="sponsors" className="flex-shrink-0">Sponsors</TabsTrigger>
          <TabsTrigger value="graph" className="flex-shrink-0">Network Graph</TabsTrigger>
          <TabsTrigger value="engagement" className="flex-shrink-0">Engagement</TabsTrigger>
          <TabsTrigger value="yt_leads" className="flex-shrink-0">YouTube Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          {contactsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <ContactsTable
              contacts={contacts}
              onSelectContact={handleSelectContact}
              selectedId={selectedContact?.id}
              addButton={
                <div className="flex items-center gap-2">
                  <ExportContactsDialog contacts={contacts} />
                  <BulkImportWizard />
                  <ImportContactsDialog />
                  <Button size="sm" className="gap-1.5" onClick={() => navigate("/relationships/new-contact")}>
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </Button>
                </div>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          {companiesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <CompaniesTable
              companies={companies}
              onSelectCompany={handleSelectCompany}
              addButton={
                <div className="flex items-center gap-2">
                  <ExportCompaniesDialog companies={companies} />
                  <ImportCompaniesDialog />
                  <Button size="sm" className="gap-1.5" onClick={() => navigate("/relationships/new-company")}>
                    <Plus className="w-4 h-4" />
                    Add Company
                  </Button>
                </div>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <DealsContent />
        </TabsContent>

        <TabsContent value="collaborations" className="mt-4">
          <CollaborationsContent />
        </TabsContent>

        <TabsContent value="discovery" className="mt-4">
          <DiscoveryContent />
        </TabsContent>

        <TabsContent value="sponsors" className="mt-4">
          <SponsorAttributionPanel />
        </TabsContent>

        <TabsContent value="graph" className="mt-4">
          {contactsLoading || companiesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <RelationshipGraph
              contacts={contacts}
              companies={companies}
              deals={deals as any}
              onSelectContact={handleSelectContact}
              onSelectCompany={handleSelectCompany}
            />
          )}
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <EngagementScorePanel />
        </TabsContent>

        <TabsContent value="yt_leads" className="mt-4">
          <YouTubeLeadInbox />
        </TabsContent>
      </Tabs>

      <ContactDetailSheet
        contact={selectedContact}
        activities={contactActivities}
        open={contactSheetOpen}
        onOpenChange={setContactSheetOpen}
        onDeleted={() => setSelectedContact(null)}
      />
    </div>
  );
}
