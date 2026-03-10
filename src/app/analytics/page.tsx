"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";

interface EventRow {
  id: string;
  name: string;
  date: string | null;
  status: string;
  clusterName: string | null;
  clusterType: string | null;
  companies: number;
  sourced: number;
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
  contactRate: number;
  rsvpRate: number;
  attendRate: number;
  interviewRate: number;
  offerRate: number;
  hireRate: number;
  overallConversion: number;
}

interface Totals {
  events: number;
  sourced: number;
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
  companies: number;
}

interface TopCompany {
  id: string;
  name: string;
  hired: number;
  interviewed: number;
  spoke: number;
}

interface OpsAnalytics {
  events: EventRow[];
  totals: Totals;
  topCompanies: TopCompany[];
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[11px] text-yc-text-secondary text-right shrink-0">{label}</div>
      <div className="flex-1 bg-yc-bg rounded-full h-7 relative overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${width}%` }} />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-yc-dark">
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function OpsAnalyticsPage() {
  const { data } = useSWR<OpsAnalytics>("/api/analytics/ops", fetcher);

  if (!data) {
    return <div className="p-8 text-sm text-yc-text-secondary">Loading analytics...</div>;
  }

  const { events, totals: t, topCompanies } = data;
  const completedEvents = events.filter((e) => e.status === "completed");

  return (
    <div className="p-4 pt-14 md:pt-8 md:p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-yc-dark">Event Ops Analytics</h1>
        <p className="text-sm text-yc-text-secondary mt-1">
          Cross-event performance, conversion rates, and hiring outcomes.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-8">
        {[
          { label: "Events", value: t.events, color: "text-yc-dark" },
          { label: "Companies", value: t.companies, color: "text-yc-dark" },
          { label: "Sourced", value: t.sourced, color: "text-gray-600" },
          { label: "Attended", value: t.attended, color: "text-teal-600" },
          { label: "Interviewed", value: t.interviewed, color: "text-indigo-600" },
          { label: "Hired", value: t.hired, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-yc-border rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-yc-text-secondary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Aggregate funnel */}
      <div className="bg-white border border-yc-border rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-yc-dark mb-4">Overall Pipeline Funnel</h2>
        <div className="space-y-2">
          <FunnelBar label="Sourced" value={t.sourced} max={t.sourced} color="bg-gray-300" />
          <FunnelBar label="Contacted" value={t.contacted} max={t.sourced} color="bg-gray-400" />
          <FunnelBar label="RSVP'd" value={t.rsvp} max={t.sourced} color="bg-sky-400" />
          <FunnelBar label="Attended" value={t.attended} max={t.sourced} color="bg-teal-400" />
          <FunnelBar label="Starred" value={t.starred} max={t.sourced} color="bg-yc-orange" />
          <FunnelBar label="Spoke" value={t.spoke} max={t.sourced} color="bg-green-400" />
          <FunnelBar label="Follow Up" value={t.followUp} max={t.sourced} color="bg-blue-400" />
          <FunnelBar label="Interviewed" value={t.interviewed} max={t.sourced} color="bg-indigo-400" />
          <FunnelBar label="Offered" value={t.offered} max={t.sourced} color="bg-purple-400" />
          <FunnelBar label="Hired" value={t.hired} max={t.sourced} color="bg-emerald-500" />
        </div>
        <div className="mt-4 flex gap-6 text-xs text-yc-text-secondary">
          <span>Overall conversion: <strong className="text-yc-dark">{t.sourced > 0 ? pct(t.hired / t.sourced) : "—"}</strong> sourced → hired</span>
          <span>Attendance rate: <strong className="text-yc-dark">{t.rsvp > 0 ? pct(t.attended / t.rsvp) : "—"}</strong></span>
          <span>Interview rate: <strong className="text-yc-dark">{t.spoke > 0 ? pct(t.interviewed / t.spoke) : "—"}</strong> of spoke</span>
        </div>
      </div>

      {/* Event comparison table */}
      <div className="bg-white border border-yc-border rounded-xl p-5 mb-8 overflow-x-auto">
        <h2 className="text-sm font-semibold text-yc-dark mb-4">Event Comparison</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-yc-border text-yc-text-secondary">
              <th className="text-left py-2 pr-4 font-medium">Event</th>
              <th className="text-center px-2 py-2 font-medium">Status</th>
              <th className="text-right px-2 py-2 font-medium">Cos</th>
              <th className="text-right px-2 py-2 font-medium">Sourced</th>
              <th className="text-right px-2 py-2 font-medium">RSVP</th>
              <th className="text-right px-2 py-2 font-medium">Attended</th>
              <th className="text-right px-2 py-2 font-medium">Spoke</th>
              <th className="text-right px-2 py-2 font-medium">Intv</th>
              <th className="text-right px-2 py-2 font-medium">Offer</th>
              <th className="text-right px-2 py-2 font-medium">Hired</th>
              <th className="text-right px-2 py-2 font-medium">Attend %</th>
              <th className="text-right pl-2 py-2 font-medium">Hire %</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-yc-border/50 hover:bg-yc-bg/50">
                <td className="py-2.5 pr-4">
                  <a href={`/events/${e.id}`} className="font-medium text-yc-dark hover:text-yc-orange transition-colors">
                    {e.name}
                  </a>
                  {e.clusterName && <div className="text-[10px] text-yc-text-secondary mt-0.5">{e.clusterName}</div>}
                </td>
                <td className="text-center px-2">
                  <Badge variant={e.status === "completed" ? "green" : e.status === "active" ? "orange" : "neutral"}>
                    {e.status}
                  </Badge>
                </td>
                <td className="text-right px-2 tabular-nums">{e.companies}</td>
                <td className="text-right px-2 tabular-nums">{e.sourced}</td>
                <td className="text-right px-2 tabular-nums">{e.rsvp}</td>
                <td className="text-right px-2 tabular-nums">{e.attended}</td>
                <td className="text-right px-2 tabular-nums">{e.spoke}</td>
                <td className="text-right px-2 tabular-nums">{e.interviewed}</td>
                <td className="text-right px-2 tabular-nums">{e.offered}</td>
                <td className="text-right px-2 tabular-nums font-semibold text-emerald-600">{e.hired}</td>
                <td className="text-right px-2 tabular-nums">{pct(e.attendRate)}</td>
                <td className="text-right pl-2 tabular-nums">{pct(e.overallConversion)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-yc-border font-semibold text-yc-dark">
              <td className="py-2.5 pr-4">Total</td>
              <td></td>
              <td className="text-right px-2 tabular-nums">{t.companies}</td>
              <td className="text-right px-2 tabular-nums">{t.sourced}</td>
              <td className="text-right px-2 tabular-nums">{t.rsvp}</td>
              <td className="text-right px-2 tabular-nums">{t.attended}</td>
              <td className="text-right px-2 tabular-nums">{t.spoke}</td>
              <td className="text-right px-2 tabular-nums">{t.interviewed}</td>
              <td className="text-right px-2 tabular-nums">{t.offered}</td>
              <td className="text-right px-2 tabular-nums text-emerald-600">{t.hired}</td>
              <td className="text-right px-2 tabular-nums">{t.rsvp > 0 ? pct(t.attended / t.rsvp) : "—"}</td>
              <td className="text-right pl-2 tabular-nums">{t.sourced > 0 ? pct(t.hired / t.sourced) : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Conversion rate comparison (completed events only) */}
      {completedEvents.length > 0 && (
        <div className="bg-white border border-yc-border rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-yc-dark mb-4">Conversion Rates — Completed Events</h2>
          <div className="space-y-4">
            {completedEvents.map((e) => (
              <div key={e.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-yc-dark">{e.name}</span>
                  <span className="text-xs text-emerald-600 font-semibold">{e.hired} hires</span>
                </div>
                <div className="flex gap-0.5 h-5 rounded-full overflow-hidden bg-yc-bg">
                  {[
                    { rate: e.sourced > 0 ? e.contacted / e.sourced : 0, color: "bg-gray-300", label: "Contacted" },
                    { rate: e.sourced > 0 ? e.rsvp / e.sourced : 0, color: "bg-sky-300", label: "RSVP" },
                    { rate: e.sourced > 0 ? e.attended / e.sourced : 0, color: "bg-teal-400", label: "Attended" },
                    { rate: e.sourced > 0 ? e.spoke / e.sourced : 0, color: "bg-green-400", label: "Spoke" },
                    { rate: e.sourced > 0 ? e.interviewed / e.sourced : 0, color: "bg-indigo-400", label: "Intv" },
                    { rate: e.sourced > 0 ? e.hired / e.sourced : 0, color: "bg-emerald-500", label: "Hired" },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={`${step.color} transition-all duration-500`}
                      style={{ width: `${Math.max(1, step.rate * 100)}%` }}
                      title={`${step.label}: ${pct(step.rate)}`}
                    />
                  ))}
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-yc-text-secondary">
                  <span>RSVP→Attend: {pct(e.attendRate)}</span>
                  <span>Spoke→Intv: {pct(e.interviewRate)}</span>
                  <span>Intv→Offer: {pct(e.offerRate)}</span>
                  <span>Offer→Hire: {pct(e.hireRate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top hiring companies */}
      {topCompanies.length > 0 && (
        <div className="bg-white border border-yc-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-yc-dark mb-4">Top Hiring Companies</h2>
          <div className="space-y-2">
            {topCompanies.filter((c) => c.hired > 0 || c.interviewed > 0).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-yc-text-secondary text-right font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-yc-dark">{c.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <span className="text-yc-green">{c.spoke} spoke</span>
                  <span className="text-indigo-600">{c.interviewed} intv</span>
                  <span className="text-emerald-600 font-semibold">{c.hired} hired</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
