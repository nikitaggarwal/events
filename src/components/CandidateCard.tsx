"use client";

import { Badge } from "./Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "neutral" | "orange" | "green" | "blue" | "red" }> = {
  not_contacted: { label: "Not Contacted", variant: "neutral" },
  contacted: { label: "Contacted", variant: "blue" },
  rsvp: { label: "RSVP", variant: "green" },
  declined: { label: "Declined", variant: "red" },
  attended: { label: "Attended", variant: "orange" },
};

export function CandidateCard({
  id,
  name,
  title,
  company,
  profileUrl,
  highlights,
  fitScore,
  fitReason,
  source,
  inviteStatus,
  onStatusChange,
}: {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  profileUrl?: string | null;
  highlights?: string | null;
  fitScore?: number | null;
  fitReason?: string | null;
  source?: string | null;
  inviteStatus: string;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const statusInfo = STATUS_CONFIG[inviteStatus] || STATUS_CONFIG.not_contacted;

  return (
    <div className="bg-white border border-yc-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-yc-dark truncate">
              {name}
            </h4>
            {fitScore != null && (
              <span
                className={`text-[11px] font-semibold ${
                  fitScore >= 0.8
                    ? "text-yc-green"
                    : fitScore >= 0.6
                    ? "text-yc-orange"
                    : "text-yc-text-secondary"
                }`}
              >
                {Math.round(fitScore * 100)}% fit
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-yc-text-secondary">
            {title && <span>{title}</span>}
            {title && company && <span> at </span>}
            {company && <span className="font-medium">{company}</span>}
          </div>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {fitReason && (
        <p className="mt-2 text-xs text-yc-text-secondary leading-relaxed">
          {fitReason}
        </p>
      )}

      {highlights && (
        <p className="mt-2 text-[11px] text-yc-text-secondary/80 leading-relaxed line-clamp-2">
          {highlights}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-yc-orange hover:text-yc-orange-hover"
            >
              View Profile
            </a>
          )}
          {source && (
            <span className="text-[10px] text-yc-text-secondary bg-yc-bg px-1.5 py-0.5 rounded">
              via {source}
            </span>
          )}
        </div>
        {onStatusChange && (
          <select
            value={inviteStatus}
            onChange={(e) => onStatusChange(id, e.target.value)}
            className="text-[11px] border border-yc-border rounded px-2 py-1 text-yc-text-secondary focus:outline-none focus:border-yc-orange"
          >
            <option value="not_contacted">Not Contacted</option>
            <option value="contacted">Contacted</option>
            <option value="rsvp">RSVP</option>
            <option value="declined">Declined</option>
            <option value="attended">Attended</option>
          </select>
        )}
      </div>
    </div>
  );
}
