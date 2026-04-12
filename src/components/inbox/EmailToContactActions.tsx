import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { useCreateContactFromEmail, useCreateCompanyFromEmail } from "@/hooks/use-email-to-contact";

interface EmailToContactActionsProps {
  fromName: string;
  fromEmail: string;
  subject?: string;
  bodyHtml?: string;
}

export function EmailToContactActions({ fromName, fromEmail, subject, bodyHtml }: EmailToContactActionsProps) {
  const createContact = useCreateContactFromEmail();
  const createCompany = useCreateCompanyFromEmail();
  const isPending = createContact.isPending || createCompany.isPending;

  const [dupDialog, setDupDialog] = useState<{
    type: "contact" | "company";
    existingName: string;
  } | null>(null);

  const getBodyText = () => {
    if (!bodyHtml) return "";
    const div = document.createElement("div");
    div.innerHTML = bodyHtml;
    return (div.textContent || div.innerText || "").substring(0, 2000);
  };

  const handleCreateContact = () => {
    createContact.mutate(
      { from_name: fromName, from_email: fromEmail },
      {
        onError: (e: any) => {
          if (e.duplicate) {
            setDupDialog({ type: "contact", existingName: e.duplicate.existingName });
          }
        },
      }
    );
  };

  const handleCreateCompany = () => {
    createCompany.mutate(
      { from_email: fromEmail, from_name: fromName, subject: subject || "", body_text: getBodyText() },
      {
        onError: (e: any) => {
          if (e.duplicate) {
            setDupDialog({ type: "company", existingName: e.duplicate.existingName });
          }
        },
      }
    );
  };

  const handleOverride = () => {
    if (!dupDialog) return;
    if (dupDialog.type === "contact") {
      createContact.mutate({ from_name: fromName, from_email: fromEmail, force: true });
    } else {
      createCompany.mutate({ from_email: fromEmail, from_name: fromName, subject: subject || "", body_text: getBodyText(), force: true });
    }
    setDupDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" title="Create from email" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCreateContact}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Contact
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreateCompany}>
            <Building2 className="h-4 w-4 mr-2" />
            Create Company (AI)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!dupDialog} onOpenChange={(open) => !open && setDupDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
            <AlertDialogDescription>
              A {dupDialog?.type} named <strong>"{dupDialog?.existingName}"</strong> already exists with this email domain. Would you like to update the existing record instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverride}>
              Update Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
