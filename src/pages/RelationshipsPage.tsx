import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { mockContacts, mockActivities } from "@/data/mock-contacts";
import type { Contact } from "@/types/crm";

export default function RelationshipsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSheetOpen(true);
  };

  const contactActivities = selectedContact
    ? mockActivities
        .filter((a) => a.entity_id === selectedContact.id)
        .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
    : [];

  return (
    <div className="p-6 lg:p-8 gradient-mesh min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Relationships</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contacts, companies, and activity timeline
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTable
            contacts={mockContacts}
            onSelectContact={handleSelectContact}
            selectedId={selectedContact?.id}
          />
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border h-64">
            <p className="text-sm text-muted-foreground">
              Companies view coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <ContactDetailSheet
        contact={selectedContact}
        activities={contactActivities}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
