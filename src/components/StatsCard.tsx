export function StatsCard({
  label,
  value,
  change,
  subtitle,
}: {
  label: string;
  value: string | number;
  change?: string;
  subtitle?: string;
}) {
  const isPositive = change?.startsWith("+");

  return (
    <div className="bg-white border border-yc-border rounded-lg p-5">
      <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-yc-dark">{value}</span>
        {change && (
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-yc-green" : "text-yc-red"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-yc-text-secondary">{subtitle}</div>
      )}
    </div>
  );
}
