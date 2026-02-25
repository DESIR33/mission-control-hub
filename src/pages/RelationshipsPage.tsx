import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { AddContactDialog } from "@/components/crm/AddContactDialog";
import { useContacts, useActivities } from "@/hooks/use-contacts";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/types/crm";

function RelationshipsContent() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: contacts = [], isLoading } = useContacts();
  const { data: activities = [] } = useActivities(selectedContact?.id ?? null);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSheetOpen(true);
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
          {isLoading ? (
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
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border h-64">
            <p className="text-sm text-muted-foreground">
              Companies view coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <ContactDetailSheet
        contact={selectedContact}
        activities={activities}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
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
