import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { useCreateContactFromEmail, useCreateCompanyFromEmail } from "@/hooks/use-email-to-contact";

interface EmailToContactActionsProps {
  fromName: string;
  fromEmail: string;
}

export function EmailToContactActions({ fromName, fromEmail }: EmailToContactActionsProps) {
  const createContact = useCreateContactFromEmail();
  const createCompany = useCreateCompanyFromEmail();
  const isPending = createContact.isPending || createCompany.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" title="Create from email" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => createContact.mutate({ from_name: fromName, from_email: fromEmail })}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Contact
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createCompany.mutate({ from_email: fromEmail, from_name: fromName })}>
          <Building2 className="h-4 w-4 mr-2" />
          Create Company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
