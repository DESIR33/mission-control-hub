import { Building2 } from "lucide-react";
import type { VideoCompanyLink } from "@/hooks/use-all-video-companies";

interface Props {
  companies: VideoCompanyLink[] | undefined;
  maxShow?: number;
}

/**
 * Renders a row of small company logo avatars for a video.
 * Shows nothing if no companies are linked.
 */
export function VideoCompanyLogos({ companies, maxShow = 3 }: Props) {
  if (!companies || companies.length === 0) return null;

  const visible = companies.slice(0, maxShow);
  const extra = companies.length - maxShow;

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      {visible.map((c) => (
        <span
          key={c.company_id}
          title={c.company_name}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-muted overflow-hidden"
        >
          {c.logo_url ? (
            <img
              src={c.logo_url}
              alt={c.company_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-muted-foreground font-mono ml-0.5">
          +{extra}
        </span>
      )}
    </span>
  );
}
