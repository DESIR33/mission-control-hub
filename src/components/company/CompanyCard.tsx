import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";

interface CompanyCardProps {
  company: {
    id: number | string;
    name: string;
    logo?: string;
    logo_url?: string;
    industry?: string;
  };
  onClick?: () => void;
}

export default function CompanyCard({ company, onClick }: CompanyCardProps) {
  const logoSrc = company.logo || company.logo_url;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary cursor-pointer"
      onClick={onClick}
    >
      {logoSrc ? (
        <Avatar className="h-8 w-8">
          <AvatarImage src={logoSrc} alt={company.name} />
          <AvatarFallback className="text-xs">
            {company.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium">{company.name}</p>
        {company.industry && (
          <p className="text-xs text-muted-foreground">{company.industry}</p>
        )}
      </div>
    </div>
  );
}
