import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { CompaniesTable } from "@/components/crm/CompaniesTable";
import { CompanyDetailSheet } from "@/components/crm/CompanyDetailSheet";
import { EditCompanyDialog } from "@/components/crm/EditCompanyDialog";
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
import { useCompanies, useCompanyContacts } from "@/hooks/use-companies";
import { useDeals } from "@/hooks/use-deals";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { Contact, Company } from "@/types/crm";

function RelationshipsContent() {
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySheetOpen, setCompanySheetOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: contactActivities = [] } = useActivities(selectedContact?.id ?? null);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: companyActivities = [] } = useActivities(selectedCompany?.id ?? null, "company");
  const { data: companyContacts = [] } = useCompanyContacts(selectedCompany?.id ?? null);

  const { data: deals = [] } = useDeals();

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSheetOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanySheetOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Relationships</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contacts, companies, and activity timeline
        </p>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="graph">Relationships</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="sponsor_pipeline">Sponsor Pipeline</TabsTrigger>
          <TabsTrigger value="affiliate_pipeline">Affiliate Pipeline</TabsTrigger>
          <TabsTrigger value="collab_pipeline">Collaborator Pipeline</TabsTrigger>
          <TabsTrigger value="yt_leads">YouTube Leads</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
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
              selectedId={selectedCompany?.id}
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
        <TabsContent value="sponsors" className="mt-4">
          <SponsorAttributionPanel />
        </TabsContent>

        <TabsContent value="sponsor_pipeline" className="mt-4">
          <PartnershipPipeline partnershipType="sponsor" />
        </TabsContent>

        <TabsContent value="affiliate_pipeline" className="mt-4">
          <PartnershipPipeline partnershipType="affiliate" />
        </TabsContent>

        <TabsContent value="collab_pipeline" className="mt-4">
          <PartnershipPipeline partnershipType="collaborator" />
        </TabsContent>

        <TabsContent value="yt_leads" className="mt-4">
          <YouTubeLeadInbox />
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <EngagementScorePanel />
        </TabsContent>
      </Tabs>

      <ContactDetailSheet
        contact={selectedContact}
        activities={contactActivities}
        open={contactSheetOpen}
        onOpenChange={setContactSheetOpen}
        onDeleted={() => setSelectedContact(null)}
      />

      <CompanyDetailSheet
        company={selectedCompany}
        activities={companyActivities}
        companyContacts={companyContacts}
        open={companySheetOpen}
        onOpenChange={(open) => {
          setCompanySheetOpen(open);
          if (!open) setSelectedCompany(null);
        }}
        onEdit={() => setEditCompanyOpen(true)}
        onDeleted={() => setSelectedCompany(null)}
      />

      <EditCompanyDialog
        company={selectedCompany}
        open={editCompanyOpen}
        onOpenChange={setEditCompanyOpen}
      />
    </div>
  );
}

export default function RelationshipsPage() {
  return (
    <WorkspaceProvider>
      <RelationshipsContent />
    </WorkspaceProvider>
  );
}
