import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  Plus, Users, Building2, GitGraph,
  Kanban, Handshake, Search,
  Megaphone, Activity, Youtube,
} from "lucide-react";
import type { Contact, Company } from "@/types/crm";
import { DealsContent } from "@/components/partnerships/DealsContent";
import { DiscoveryContent } from "@/components/partnerships/DiscoveryContent";
import { CollaborationsContent } from "@/components/partnerships/CollaborationsContent";


type Section =
  | "contacts"
  | "companies"
  | "graph"
  | "pipeline"
  | "collaborations"
  | "discovery"
  | "sponsors"
  | "engagement"
  | "yt_leads";

const SECTIONS: { key: Section; label: string; icon: React.ReactNode; group: string }[] = [
  // People
  { key: "contacts", label: "Contacts", icon: <Users className="w-3.5 h-3.5" />, group: "People" },
  { key: "companies", label: "Companies", icon: <Building2 className="w-3.5 h-3.5" />, group: "People" },
  { key: "graph", label: "Network Graph", icon: <GitGraph className="w-3.5 h-3.5" />, group: "People" },
  // Pipeline
  { key: "pipeline", label: "Deals Pipeline", icon: <Kanban className="w-3.5 h-3.5" />, group: "Pipeline" },
  { key: "collaborations", label: "Collaborations", icon: <Handshake className="w-3.5 h-3.5" />, group: "Pipeline" },
  { key: "discovery", label: "Discovery", icon: <Search className="w-3.5 h-3.5" />, group: "Pipeline" },
  // Intelligence
  { key: "sponsors", label: "Sponsors", icon: <Megaphone className="w-3.5 h-3.5" />, group: "Intelligence" },
  { key: "engagement", label: "Engagement", icon: <Activity className="w-3.5 h-3.5" />, group: "Intelligence" },
  { key: "yt_leads", label: "YouTube Leads", icon: <Youtube className="w-3.5 h-3.5" />, group: "Intelligence" },
];

export default function PartnershipsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Section) || "contacts";
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>(initialTab);
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

  // Update URL when section changes
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", activeSection);
    window.history.replaceState({}, "", `?${sp.toString()}`);
  }, [activeSection]);

  const activeSectionInfo = SECTIONS.find((s) => s.key === activeSection)!;

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

      case "pipeline":
        return <DealsContent />;

      case "collaborations":
        return <CollaborationsContent />;

      case "discovery":
        return <DiscoveryContent />;

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

      case "yt_leads":
        return <YouTubeLeadInbox />;

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-4">
          {activeSectionInfo.icon}
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">{activeSectionInfo.label}</h1>
            <p className="text-xs text-muted-foreground">Partnerships</p>
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
