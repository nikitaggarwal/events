type BadgeVariant =
  | "orange"
  | "green"
  | "blue"
  | "red"
  | "purple"
  | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  orange: "bg-yc-orange-light text-yc-orange",
  green: "bg-yc-green-light text-yc-green",
  blue: "bg-yc-blue-light text-yc-blue",
  red: "bg-yc-red-light text-yc-red",
  purple: "bg-yc-purple-light text-yc-purple",
  neutral: "bg-yc-bg text-yc-text-secondary",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
