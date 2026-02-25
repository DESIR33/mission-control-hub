import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { AddContactDialog } from "@/components/crm/AddContactDialog";
import { CompaniesTable } from "@/components/crm/CompaniesTable";
import { CompanyDetailSheet } from "@/components/crm/CompanyDetailSheet";
import { AddCompanyDialog } from "@/components/crm/AddCompanyDialog";
import { EditCompanyDialog } from "@/components/crm/EditCompanyDialog";
import { useContacts, useActivities } from "@/hooks/use-contacts";
import { useCompanies, useCompanyContacts } from "@/hooks/use-companies";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact, Company } from "@/types/crm";

function RelationshipsContent() {
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

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSheetOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanySheetOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 gradient-mesh min-h-screen">
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
              addButton={<AddContactDialog />}
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
              addButton={<AddCompanyDialog />}
            />
          )}
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
