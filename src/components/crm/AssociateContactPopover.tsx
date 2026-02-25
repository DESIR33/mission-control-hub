import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/hooks/use-contacts";
import { useAssociateContact } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2 } from "lucide-react";

interface AssociateContactPopoverProps {
  companyId: string;
  existingContactIds: string[];
}

export function AssociateContactPopover({ companyId, existingContactIds }: AssociateContactPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: allContacts = [] } = useContacts();
  const associateContact = useAssociateContact();
  const { toast } = useToast();

  const availableContacts = allContacts.filter(
    (c) =>
      !existingContactIds.includes(c.id) &&
      (!search ||
        `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  );

  const handleAssociate = async (contactId: string) => {
    try {
      await associateContact.mutateAsync({ contactId, companyId });
      toast({ title: "Contact associated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Associate
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contacts\u2026"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-secondary border-border"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableContacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? "No matching contacts" : "All contacts are associated"}
              </p>
            ) : (
              availableContacts.slice(0, 20).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleAssociate(contact.id)}
                  disabled={associateContact.isPending}
                  className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-primary">
                      {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.email && (
                      <p className="text-[10px] text-muted-foreground truncate">{contact.email}</p>
                    )}
                  </div>
                  {associateContact.isPending && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
