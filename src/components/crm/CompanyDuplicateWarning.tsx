import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Company } from "@/types/crm";

interface DuplicateMatch {
  company: Company;
  reasons: string[];
}

interface CompanyDuplicateWarningProps {
  name: string;
  email?: string;
  website?: string;
  phone?: string;
  existingCompanies: Company[];
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalisePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s\-().+]/g, "");
}

function normaliseDomain(value: string | null | undefined): string {
  const raw = normalise(value);
  if (!raw) return "";
  try {
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^www\./, "");
  }
}

function extractEmailDomain(email: string | null | undefined): string {
  const norm = normalise(email);
  const at = norm.indexOf("@");
  return at >= 0 ? norm.slice(at + 1) : "";
}

function findDuplicates(
  name: string,
  email: string | undefined,
  website: string | undefined,
  phone: string | undefined,
  companies: Company[],
): DuplicateMatch[] {
  const normName = normalise(name);
  const normEmail = normalise(email);
  const normEmailDomain = extractEmailDomain(email);
  const normWebsite = normaliseDomain(website);
  const normPhone = normalisePhone(phone);

  if (!normName && !normEmail && !normWebsite && !normPhone) return [];

  const matches: DuplicateMatch[] = [];

  for (const company of companies) {
    const reasons: string[] = [];

    // Exact name match
    if (normName && normalise(company.name) === normName) {
      reasons.push("Name match");
    }

    // Email match
    if (normEmail && normalise(company.primary_email) === normEmail) {
      reasons.push("Email match");
    }

    // Email domain vs website domain match
    if (normEmailDomain && normaliseDomain(company.website) === normEmailDomain) {
      reasons.push("Email domain matches website");
    }

    // Website domain match
    if (normWebsite && normaliseDomain(company.website) === normWebsite) {
      reasons.push("Website match");
    }

    // Phone match
    if (normPhone && normalisePhone(company.phone) === normPhone) {
      reasons.push("Phone match");
    }

    if (reasons.length > 0) {
      matches.push({ company, reasons });
    }
  }

  return matches;
}

export default function CompanyDuplicateWarning({
  name,
  email,
  website,
  phone,
  existingCompanies,
}: CompanyDuplicateWarningProps) {
  const duplicates = useMemo(
    () => findDuplicates(name, email, website, phone, existingCompanies),
    [name, email, website, phone, existingCompanies],
  );

  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Potential duplicates found</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {duplicates.map(({ company, reasons }) => (
            <li key={company.id} className="text-sm">
              <span className="font-medium">{company.name}</span>
              {company.primary_email && (
                <span className="ml-1 text-muted-foreground">({company.primary_email})</span>
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
