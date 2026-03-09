import Link from "next/link";
import { Badge } from "./Badge";

export function ClusterCard({
  id,
  name,
  keywords,
  jobCount,
  companyCount,
  topCompanies,
}: {
  id: string;
  name: string;
  keywords: string[];
  jobCount: number;
  companyCount: number;
  topCompanies?: string[];
}) {
  return (
    <Link
      href={`/clusters?selected=${id}`}
      className="block bg-white border border-yc-border rounded-lg p-5 hover:border-yc-orange/40 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-yc-dark">{name}</h3>
        <Badge variant="orange">{jobCount} roles</Badge>
      </div>
      <div className="mt-2 text-xs text-yc-text-secondary">
        {companyCount} companies hiring
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {keywords.slice(0, 5).map((kw) => (
          <Badge key={kw} variant="neutral">
            {kw}
          </Badge>
        ))}
      </div>
      {topCompanies && topCompanies.length > 0 && (
        <div className="mt-3 text-xs text-yc-text-secondary">
          {topCompanies.slice(0, 4).join(", ")}
          {topCompanies.length > 4 && ` +${topCompanies.length - 4} more`}
        </div>
      )}
    </Link>
  );
}
