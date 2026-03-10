"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";
import { FounderEventView } from "@/components/FounderEventView";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[11px] text-yc-text-secondary text-right shrink-0">{label}</div>
      <div className="flex-1 bg-yc-bg rounded-full h-6 relative overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${width}%` }} />
        <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-yc-dark">
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
  batch: string | null;
}

interface EventStats {
  total: number;
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
}

interface FounderEvent {
  id: string;
  name: string;
  date: string | null;
  status: string;
  location: string | null;
  cluster: { id: string; name: string; type: string } | null;
  candidateCount: number;
  stats: EventStats;
}

interface Totals {
  events: number;
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
}

interface OverviewData {
  company?: { id: string; name: string; slug: string; batch: string | null; _count: { jobs: number } } | null;
  companies?: CompanyOption[];
  events: FounderEvent[];
  totals: Totals | null;
}

interface AnalyticsEventRow {
  id: string;
  name: string;
  date: string | null;
  status: string;
  total: number;
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
  rsvpRate: number;
  attendRate: number;
  interviewRate: number;
  hireRate: number;
}

interface FounderAnalytics {
  company: { id: string; name: string; batch: string | null; _count: { jobs: number } } | null;
  events: AnalyticsEventRow[];
  totals: {
    events: number;
    candidates: number;
    contacted: number;
    rsvp: number;
    attended: number;
    starred: number;
    spoke: number;
    followUp: number;
    interviewed: number;
    offered: number;
    hired: number;
    uniqueCandidates: number;
  };
}

const STATUS_VARIANT: Record<string, "green" | "orange" | "blue" | "neutral"> = {
  draft: "neutral",
  planning: "blue",
  active: "orange",
  completed: "green",
};

export default function FounderConsolePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [tab, setTab] = useState<"events" | "analytics">("events");

  const { data: initial } = useSWR<OverviewData>("/api/founder/overview", fetcher);
  const { data } = useSWR<OverviewData>(
    companyId ? `/api/founder/overview?companyId=${companyId}` : null,
    fetcher
  );
  const { data: analyticsData } = useSWR<FounderAnalytics>(
    companyId && tab === "analytics" ? `/api/analytics/founder?companyId=${companyId}` : null,
    fetcher
  );

  const companies = initial?.companies || [];
  const events = data?.events || [];
  const totals = data?.totals;
  const company = data?.company;
  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;

  function selectCompany(id: string) {
    setCompanyId(id);
    setSelectedEventId(null);
    setTab("events");
  }

  return (
    <div className="min-h-screen bg-yc-bg">
      {/* Top bar */}
      <header className="bg-white border-b border-yc-border sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-yc-orange rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">Y</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-yc-dark">Founder Console</div>
              <div className="text-[10px] text-yc-text-secondary">Work at a Startup</div>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs text-yc-text-secondary hover:text-yc-dark transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      {companyId && (
        <div className="bg-white border-b border-yc-border">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2 flex items-center gap-1.5 text-xs">
            <button
              onClick={() => { setCompanyId(null); setSelectedEventId(null); }}
              className="text-yc-text-secondary hover:text-yc-orange transition-colors"
            >
              All Companies
            </button>
            <span className="text-yc-text-secondary/40">/</span>
            <button
              onClick={() => { setSelectedEventId(null); setTab("events"); }}
              className={`transition-colors ${
                selectedEventId
                  ? "text-yc-text-secondary hover:text-yc-orange"
                  : "text-yc-dark font-medium"
              }`}
            >
              {company?.name || "..."}
            </button>
            {selectedEvent && (
              <>
                <span className="text-yc-text-secondary/40">/</span>
                <span className="text-yc-dark font-medium">{selectedEvent.name}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
        {/* Level 1: Company selector */}
        {!companyId ? (
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="w-14 h-14 bg-yc-dark rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="15" rx="2" stroke="white" strokeWidth="1.5" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="white" strokeWidth="1.5" />
                <path d="M3 11h18" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-yc-dark mb-2">Welcome to Founder Console</h1>
            <p className="text-sm text-yc-text-secondary mb-8">
              Select your company to view candidates, event history, and hiring pipeline.
            </p>

            {companies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCompany(c.id)}
                    className="bg-white border border-yc-border rounded-xl p-4 hover:border-yc-orange/40 hover:shadow-sm transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-yc-dark">{c.name}</span>
                      {c.batch && <Badge variant="orange">{c.batch}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-yc-text-secondary">Click to view your events & pipeline</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-yc-text-secondary">
                No companies with event data yet. Events need to be created and candidates sourced first.
              </div>
            )}
          </div>

        /* Level 3: Event founder view (inline) */
        ) : selectedEventId ? (
          <FounderEventView eventId={selectedEventId} companyId={companyId} />

        /* Level 2: Company dashboard */
        ) : (
          <>
            {/* Company header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-yc-dark">
                    {company?.name || "..."}
                  </h1>
                  {company?.batch && <Badge variant="orange">{company.batch}</Badge>}
                </div>
                <div className="mt-1 text-sm text-yc-text-secondary">
                  {company?._count?.jobs || 0} open roles · {events.length} event{events.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={companyId}
                  onChange={(e) => selectCompany(e.target.value)}
                  className="text-sm border border-yc-border rounded-md px-3 py-2 focus:outline-none focus:border-yc-orange"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.batch ? `(${c.batch})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Aggregate stats */}
            {totals && (
              <div className="mb-6">
                <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider mb-2">Pipeline across all events</div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {[
                    { label: "Events", value: totals.events, color: "text-yc-dark" },
                    { label: "Contacted", value: totals.contacted, color: "text-gray-600" },
                    { label: "RSVP'd", value: totals.rsvp, color: "text-sky-600" },
                    { label: "Attended", value: totals.attended, color: "text-teal-600" },
                    { label: "Starred", value: totals.starred, color: "text-yc-orange" },
                    { label: "Spoke", value: totals.spoke, color: "text-yc-green" },
                    { label: "Follow Up", value: totals.followUp, color: "text-blue-600" },
                    { label: "Interview", value: totals.interviewed, color: "text-indigo-600" },
                    { label: "Offered", value: totals.offered, color: "text-purple-600" },
                    { label: "Hired", value: totals.hired, color: "text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-yc-border rounded-lg py-2 px-1 text-center">
                      <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] text-yc-text-secondary mt-0.5 leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-yc-border mb-6 flex gap-6">
              {(["events", "analytics"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-3 text-[13px] font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? "border-yc-orange text-yc-orange"
                      : "border-transparent text-yc-text-secondary hover:text-yc-dark"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Analytics tab */}
            {tab === "analytics" && analyticsData && (() => {
              const at = analyticsData.totals;
              const ae = analyticsData.events;
              return (
                <div className="space-y-6">
                  <div className="bg-white border border-yc-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-yc-dark mb-4">Your Hiring Funnel</h2>
                    <div className="space-y-1.5">
                      <FunnelBar label="Contacted" value={at.contacted} max={at.candidates} color="bg-gray-400" />
                      <FunnelBar label="RSVP'd" value={at.rsvp} max={at.candidates} color="bg-sky-400" />
                      <FunnelBar label="Attended" value={at.attended} max={at.candidates} color="bg-teal-400" />
                      <FunnelBar label="Starred" value={at.starred} max={at.candidates} color="bg-yc-orange" />
                      <FunnelBar label="Spoke" value={at.spoke} max={at.candidates} color="bg-green-400" />
                      <FunnelBar label="Follow Up" value={at.followUp} max={at.candidates} color="bg-blue-400" />
                      <FunnelBar label="Interviewed" value={at.interviewed} max={at.candidates} color="bg-indigo-400" />
                      <FunnelBar label="Offered" value={at.offered} max={at.candidates} color="bg-purple-400" />
                      <FunnelBar label="Hired" value={at.hired} max={at.candidates} color="bg-emerald-500" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-yc-text-secondary">
                      <span>Unique candidates: <strong className="text-yc-dark">{at.uniqueCandidates}</strong></span>
                      <span>Overall hire rate: <strong className="text-yc-dark">{at.candidates > 0 ? pct(at.hired / at.candidates) : "—"}</strong></span>
                      <span>RSVP → Attend: <strong className="text-yc-dark">{at.rsvp > 0 ? pct(at.attended / at.rsvp) : "—"}</strong></span>
                      <span>Spoke → Interview: <strong className="text-yc-dark">{at.spoke > 0 ? pct(at.interviewed / at.spoke) : "—"}</strong></span>
                    </div>
                  </div>

                  <div className="bg-white border border-yc-border rounded-xl p-5 overflow-x-auto">
                    <h2 className="text-sm font-semibold text-yc-dark mb-4">Event Comparison</h2>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-yc-border text-yc-text-secondary">
                          <th className="text-left py-2 pr-4 font-medium">Event</th>
                          <th className="text-right px-2 py-2 font-medium">RSVP</th>
                          <th className="text-right px-2 py-2 font-medium">Attended</th>
                          <th className="text-right px-2 py-2 font-medium">Spoke</th>
                          <th className="text-right px-2 py-2 font-medium">Intv</th>
                          <th className="text-right px-2 py-2 font-medium">Offered</th>
                          <th className="text-right px-2 py-2 font-medium">Hired</th>
                          <th className="text-right px-2 py-2 font-medium">RSVP→Att</th>
                          <th className="text-right pl-2 py-2 font-medium">Hire%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ae.map((e) => (
                          <tr key={e.id} className="border-b border-yc-border/50 hover:bg-yc-bg/50">
                            <td className="py-2.5 pr-4">
                              <button onClick={() => { setSelectedEventId(e.id); setTab("events"); }} className="font-medium text-yc-dark hover:text-yc-orange transition-colors text-left">
                                {e.name}
                              </button>
                              <div className="text-[10px] text-yc-text-secondary mt-0.5">
                                {e.date && new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {" · "}
                                <Badge variant={e.status === "completed" ? "green" : e.status === "active" ? "orange" : "neutral"}>
                                  {e.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="text-right px-2 tabular-nums">{e.rsvp}</td>
                            <td className="text-right px-2 tabular-nums">{e.attended}</td>
                            <td className="text-right px-2 tabular-nums">{e.spoke}</td>
                            <td className="text-right px-2 tabular-nums">{e.interviewed}</td>
                            <td className="text-right px-2 tabular-nums">{e.offered}</td>
                            <td className="text-right px-2 tabular-nums font-semibold text-emerald-600">{e.hired}</td>
                            <td className="text-right px-2 tabular-nums">{pct(e.attendRate)}</td>
                            <td className="text-right pl-2 tabular-nums">{pct(e.hireRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-yc-border font-semibold text-yc-dark">
                          <td className="py-2.5 pr-4">Total</td>
                          <td className="text-right px-2 tabular-nums">{at.rsvp}</td>
                          <td className="text-right px-2 tabular-nums">{at.attended}</td>
                          <td className="text-right px-2 tabular-nums">{at.spoke}</td>
                          <td className="text-right px-2 tabular-nums">{at.interviewed}</td>
                          <td className="text-right px-2 tabular-nums">{at.offered}</td>
                          <td className="text-right px-2 tabular-nums text-emerald-600">{at.hired}</td>
                          <td className="text-right px-2 tabular-nums">{at.rsvp > 0 ? pct(at.attended / at.rsvp) : "—"}</td>
                          <td className="text-right pl-2 tabular-nums">{at.candidates > 0 ? pct(at.hired / at.candidates) : "—"}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="bg-white border border-yc-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-yc-dark mb-4">Event Performance</h2>
                    <div className="space-y-4">
                      {ae.map((e) => (
                        <div key={e.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-yc-dark">{e.name}</span>
                            <span className="text-xs text-emerald-600 font-semibold">{e.hired} hire{e.hired !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="flex gap-0.5 h-4 rounded-full overflow-hidden bg-yc-bg">
                            {[
                              { rate: e.total > 0 ? e.rsvp / e.total : 0, color: "bg-sky-300" },
                              { rate: e.total > 0 ? e.attended / e.total : 0, color: "bg-teal-400" },
                              { rate: e.total > 0 ? e.spoke / e.total : 0, color: "bg-green-400" },
                              { rate: e.total > 0 ? e.interviewed / e.total : 0, color: "bg-indigo-400" },
                              { rate: e.total > 0 ? e.hired / e.total : 0, color: "bg-emerald-500" },
                            ].map((step, idx) => (
                              <div key={idx} className={`${step.color}`} style={{ width: `${Math.max(1, step.rate * 100)}%` }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {tab === "analytics" && !analyticsData && companyId && (
              <div className="text-center py-16 text-sm text-yc-text-secondary">Loading analytics...</div>
            )}

            {/* Event list */}
            {tab === "events" && <div className="space-y-3">
              <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider">Your events</div>
              {events.map((event) => {
                const s = event.stats;
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className="block w-full text-left bg-white border border-yc-border rounded-xl p-5 hover:border-yc-orange/30 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-yc-dark">{event.name}</h3>
                          <Badge variant={STATUS_VARIANT[event.status] || "neutral"}>{event.status}</Badge>
                          {event.cluster && (
                            <span className="text-[10px] text-yc-text-secondary">{event.cluster.name}</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-yc-text-secondary">
                          {event.date && new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {event.location && ` · ${event.location}`}
                          {` · ${event.candidateCount} candidates`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: "Starred", value: s.starred, color: "text-yc-orange" },
                          { label: "Spoke", value: s.spoke, color: "text-yc-green" },
                          { label: "Interview", value: s.interviewed, color: "text-indigo-600" },
                          { label: "Offered", value: s.offered, color: "text-purple-600" },
                          { label: "Hired", value: s.hired, color: "text-emerald-600" },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center min-w-[40px]">
                            <div className={`text-base font-semibold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[9px] text-yc-text-secondary">{stat.label}</div>
                          </div>
                        ))}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-yc-text-secondary/30 ml-1">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-16 text-sm text-yc-text-secondary bg-white border border-yc-border rounded-xl">
                  No events with interaction data for this company yet.
                </div>
              )}
            </div>}
          </>
        )}
      </div>
    </div>
  );
}
