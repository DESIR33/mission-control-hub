const SectionPage = ({ title, description }: { title: string; description: string }) => (
  <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    <p className="text-sm text-muted-foreground mt-1">{description}</p>
    <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-border h-64">
      <p className="text-sm text-muted-foreground">Coming soon — connect Lovable Cloud to enable this section.</p>
    </div>
  </div>
);

export const RelationshipsPage = () => <SectionPage title="Relationships" description="Contacts, companies, and activity timeline" />;
