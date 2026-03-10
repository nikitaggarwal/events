"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/clusters", label: "Clusters", icon: "grid" },
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/dashboard", label: "Dashboard", icon: "chart" },
  { href: "/candidates", label: "Candidates", icon: "users" },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "#f26625" : "#737373";

  switch (icon) {
    case "chart":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="10" width="3" height="7" rx="0.5" fill={color} />
          <rect x="5.5" y="6" width="3" height="11" rx="0.5" fill={color} />
          <rect x="10" y="3" width="3" height="14" rx="0.5" fill={color} />
          <rect x="14.5" y="1" width="3" height="16" rx="0.5" fill={color} />
        </svg>
      );
    case "grid":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="10" y="1" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="1" y="10" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="10" y="10" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="3" width="16" height="14" rx="1.5" stroke={color} strokeWidth="1.5" />
          <line x1="1" y1="7.5" x2="17" y2="7.5" stroke={color} strokeWidth="1.5" />
          <line x1="5" y1="1" x2="5" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13" y1="1" x2="13" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "analytics":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 15l4-5 3 3 5-7 2 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="14" cy="8" r="1.5" fill={color} />
        </svg>
      );
    case "users":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="6.5" cy="5" r="2.5" stroke={color} strokeWidth="1.5" />
          <path d="M1 16c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="5.5" r="2" stroke={color} strokeWidth="1.2" />
          <path d="M14 11c1.5.5 3 2 3 5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-white border border-yc-border shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-60 bg-white border-r border-yc-border flex flex-col z-50 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-5 border-b border-yc-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-yc-orange rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">Y</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-yc-dark">Event Ops</div>
              <div className="text-[11px] text-yc-text-secondary">
                Work at a Startup
              </div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded md:hidden"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors ${
                  isActive
                    ? "text-yc-orange bg-yc-orange-light font-medium border-r-2 border-yc-orange"
                    : "text-yc-text-secondary hover:text-yc-dark hover:bg-yc-bg"
                }`}
              >
                <NavIcon icon={item.icon} active={isActive} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-yc-border">
          <div className="text-[11px] text-yc-text-secondary">
            YC Event Ops Console
          </div>
        </div>
      </aside>
    </>
  );
}
