import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { CompaniesTable } from "@/components/crm/CompaniesTable";
import { ImportContactsDialog } from "@/components/crm/ImportContactsDialog";
import { ImportCompaniesDialog } from "@/components/crm/ImportCompaniesDialog";
import { ExportContactsDialog, ExportCompaniesDialog } from "@/components/crm/ExportDialog";
import { RelationshipGraph } from "@/components/crm/RelationshipGraph";
import { SponsorAttributionPanel } from "@/components/crm/SponsorAttributionPanel";
import { EngagementScorePanel } from "@/components/crm/EngagementScorePanel";
import { BulkImportWizard } from "@/components/crm/BulkImportWizard";
import { useContacts, useActivities } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useDeals } from "@/hooks/use-deals";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Users, Building2, GitGraph,
  Megaphone, Activity,
} from "lucide-react";
import type { Contact, Company } from "@/types/crm";

type Section = "contacts" | "companies" | "graph" | "sponsors" | "engagement";

const SECTION_LABELS: Record<Section, string> = {
  contacts: "Contacts",
  companies: "Companies",
  graph: "Relationship Graph",
  sponsors: "Sponsors",
  engagement: "Engagement",
};

const VALID_SECTIONS = new Set<string>(Object.keys(SECTION_LABELS));

export default function NetworkPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = (section && VALID_SECTIONS.has(section) ? section : null) as Section | null;
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: contactActivities = [] } = useActivities(selectedContact?.id ?? null);
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: deals = [] } = useDeals();

  if (!activeSection) {
    return <Navigate to="/network/contacts" replace />;
  }

  const handleSelectContact = (contact: Contact) => {
    navigate(`/contacts/${contact.id}`);
  };

  const handleSelectCompany = (company: Company) => {
    navigate(`/relationships/companies/${company.id}`);
  };

  const label = SECTION_LABELS[activeSection];

  const renderContent = () => {
    switch (activeSection) {
      case "contacts":
        return contactsLoading ? (
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
        );

      case "companies":
        return companiesLoading ? (
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
        );

      case "sponsors":
        return <SponsorAttributionPanel />;

      case "graph":
        return contactsLoading || companiesLoading ? (
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
        );

      case "engagement":
        return <EngagementScorePanel />;

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">{label}</h1>
            <p className="text-xs text-muted-foreground">Network</p>
          </div>
        </div>

        <div className="mt-4 md:mt-6">
          {renderContent()}
        </div>
      </div>

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
