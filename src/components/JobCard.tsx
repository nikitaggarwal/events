import { Badge } from "./Badge";

export function JobCard({
  title,
  companyName,
  batch,
  location,
  role,
  salaryMin,
  salaryMax,
  skills,
  postedAt,
  sourceUrl,
}: {
  title: string;
  companyName: string;
  batch?: string | null;
  location?: string | null;
  role?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  skills?: string[];
  postedAt?: string | null;
  sourceUrl?: string | null;
}) {
  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return fmt(min);
    if (max) return `Up to ${fmt(max)}`;
    return null;
  };

  const salary = formatSalary(salaryMin, salaryMax);

  return (
    <div className="bg-white border border-yc-border rounded-lg p-4 hover:border-yc-orange/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-yc-dark truncate">
            {title}
          </h4>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-yc-text-secondary">
          <span className="font-medium text-yc-text">{companyName}</span>
          {batch && <Badge variant="orange">{batch}</Badge>}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          {location && <Badge variant="blue">{location}</Badge>}
          {role && <Badge variant="purple">{role}</Badge>}
          {salary && <Badge variant="green">{salary}</Badge>}
          {postedAt && <Badge variant="neutral">{postedAt}</Badge>}
        </div>

        {skills && skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.slice(0, 6).map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="text-[10px] text-yc-text-secondary bg-yc-bg px-1.5 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="text-[10px] text-yc-text-secondary">
                +{skills.length - 6}
              </span>
            )}
          </div>
        )}
      </div>

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 text-[12px] font-medium text-white bg-yc-orange rounded-md hover:bg-yc-orange-hover transition-colors text-center sm:text-left"
        >
          View Role →
        </a>
      )}
    </div>
  );
}
