import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Contact } from "@/types/crm";

interface DuplicateMatch {
  contact: Contact;
  reasons: string[];
}

interface DuplicateWarningProps {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  existingContacts: Contact[];
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalisePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s\-().+]/g, "");
}

function findDuplicates(
  firstName: string,
  lastName: string,
  email: string,
  phone: string | undefined,
  contacts: Contact[],
): DuplicateMatch[] {
  const normFirst = normalise(firstName);
  const normLast = normalise(lastName);
  const normEmail = normalise(email);
  const normPhone = normalisePhone(phone);

  const matches: DuplicateMatch[] = [];

  for (const contact of contacts) {
    const reasons: string[] = [];

    // Exact email match
    if (normEmail && normalise(contact.email) === normEmail) {
      reasons.push("Email match");
    }

    // First + last name fuzzy match (case-insensitive)
    if (
      normFirst &&
      normalise(contact.first_name) === normFirst &&
      normalise(contact.last_name) === normLast
    ) {
      reasons.push("Name match");
    }

    // Phone match
    if (normPhone && normalisePhone(contact.phone) === normPhone) {
      reasons.push("Phone match");
    }

    if (reasons.length > 0) {
      matches.push({ contact, reasons });
    }
  }

  return matches;
}

export default function DuplicateWarning({
  firstName,
  lastName,
  email,
  phone,
  existingContacts,
}: DuplicateWarningProps) {
  const duplicates = useMemo(
    () => findDuplicates(firstName, lastName, email, phone, existingContacts),
    [firstName, lastName, email, phone, existingContacts],
  );

  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Potential duplicates found</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {duplicates.map(({ contact, reasons }) => (
            <li key={contact.id} className="text-sm">
              <span className="font-medium">
                {contact.first_name}
                {contact.last_name ? ` ${contact.last_name}` : ""}
              </span>
              {contact.email && (
                <span className="ml-1 text-muted-foreground">
                  ({contact.email})
                </span>
              )}
              <span className="ml-1 text-xs text-muted-foreground">
                — {reasons.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
