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

interface FounderMatch {
  id: string;
  applicant: { id: string; name: string; email: string; skills: string[]; interests: string | null; linkedinUrl: string | null };
  company: { id: string; name: string; slug: string; batch: string | null };
  event: { id: string; name: string; date: string | null };
  messages: { content: string; sender: string; createdAt: string }[];
}

interface ChatMessage {
  id: string;
  matchId: string;
  sender: string;
  content: string;
  createdAt: string;
}

type CompanyPipelineStage =
  | "contacted"
  | "rsvp"
  | "attended"
  | "starred"
  | "spoke"
  | "followUp"
  | "interviewed"
  | "offered"
  | "hired";

const STAGE_LABEL: Record<CompanyPipelineStage, string> = {
  contacted: "Contacted",
  rsvp: "RSVP'd",
  attended: "Attended",
  starred: "Starred",
  spoke: "Spoke",
  followUp: "Follow Up",
  interviewed: "Interview",
  offered: "Offered",
  hired: "Hired",
};

interface PipelineApiRow {
  interactionId: string;
  candidate: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    highlights: string | null;
    linkedinUrl: string | null;
  };
  event: { id: string; name: string; date: string | null; status: string };
  flags: Record<string, boolean>;
}

export default function FounderConsolePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [tab, setTab] = useState<"events" | "analytics" | "messages">("events");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [companyPipelineStage, setCompanyPipelineStage] = useState<CompanyPipelineStage | null>(null);
  const [eventEntryFilter, setEventEntryFilter] = useState<CompanyPipelineStage | null>(null);

  const { data: initial } = useSWR<OverviewData>("/api/founder/overview", fetcher);
  const { data } = useSWR<OverviewData>(
    companyId ? `/api/founder/overview?companyId=${companyId}` : null,
    fetcher
  );
  const { data: analyticsData } = useSWR<FounderAnalytics>(
    companyId && tab === "analytics" ? `/api/analytics/founder?companyId=${companyId}` : null,
    fetcher
  );
  const { data: founderMatches, mutate: mutateMatches } = useSWR<FounderMatch[]>(
    companyId && tab === "messages" ? `/api/matches?companyId=${companyId}` : null,
    fetcher
  );
  const { data: chatMessages, mutate: mutateMessages } = useSWR<ChatMessage[]>(
    selectedMatchId ? `/api/messages?matchId=${selectedMatchId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );
  const { data: pipelineData } = useSWR<{ rows: PipelineApiRow[] }>(
    companyId && companyPipelineStage && !selectedEventId
      ? `/api/founder/pipeline?companyId=${companyId}&stage=${companyPipelineStage}`
      : null,
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
    setSelectedMatchId(null);
    setTab("events");
    setCompanyPipelineStage(null);
    setEventEntryFilter(null);
  }

  async function sendFounderMessage() {
    if (!selectedMatchId || !msgInput.trim()) return;
    setSendingMsg(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: selectedMatchId, sender: "founder", content: msgInput.trim() }),
    });
    setMsgInput("");
    setSendingMsg(false);
    mutateMessages();
    mutateMatches();
  }

  const selectedMatch = founderMatches?.find((m) => m.id === selectedMatchId);

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
          <>
            <div className="flex items-center gap-2 text-xs text-yc-text-secondary mb-4">
              <button onClick={() => { setCompanyId(null); setSelectedEventId(null); setEventEntryFilter(null); setCompanyPipelineStage(null); }} className="hover:text-yc-dark">Companies</button>
              <span>/</span>
              <button onClick={() => { setSelectedEventId(null); setEventEntryFilter(null); setTab("events"); }} className="hover:text-yc-dark">{company?.name || "..."}</button>
              <span>/</span>
              <span>{selectedEvent?.name}</span>
            </div>
            <FounderEventView
              key={`${selectedEventId}-${eventEntryFilter ?? "all"}`}
              eventId={selectedEventId}
              companyId={companyId}
              initialPipelineFilter={eventEntryFilter}
            />
          </>

        /* Level 2: Company dashboard */
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-yc-text-secondary mb-4">
              <button onClick={() => { setCompanyId(null); setSelectedEventId(null); setEventEntryFilter(null); setCompanyPipelineStage(null); }} className="hover:text-yc-dark">Companies</button>
              <span>/</span>
              <span>{company?.name || "..."}</span>
            </div>

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
                  {(
                    [
                      { label: "Events", value: totals.events, color: "text-yc-dark", stage: null },
                      { label: "Contacted", value: totals.contacted, color: "text-gray-600", stage: "contacted" as const },
                      { label: "RSVP'd", value: totals.rsvp, color: "text-sky-600", stage: "rsvp" as const },
                      { label: "Attended", value: totals.attended, color: "text-teal-600", stage: "attended" as const },
                      { label: "Starred", value: totals.starred, color: "text-yc-orange", stage: "starred" as const },
                      { label: "Spoke", value: totals.spoke, color: "text-yc-green", stage: "spoke" as const },
                      { label: "Follow Up", value: totals.followUp, color: "text-blue-600", stage: "followUp" as const },
                      { label: "Interview", value: totals.interviewed, color: "text-indigo-600", stage: "interviewed" as const },
                      { label: "Offered", value: totals.offered, color: "text-purple-600", stage: "offered" as const },
                      { label: "Hired", value: totals.hired, color: "text-emerald-600", stage: "hired" as const },
                    ] as const
                  ).map((s) =>
                    s.stage === null ? (
                      <div key={s.label} className="bg-white border border-yc-border rounded-lg py-2 px-1 text-center">
                        <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] text-yc-text-secondary mt-0.5 leading-tight">{s.label}</div>
                      </div>
                    ) : (
                      <button
                        key={s.label}
                        type="button"
                        title={`List candidates marked ${STAGE_LABEL[s.stage]} across all events`}
                        onClick={() =>
                          setCompanyPipelineStage(companyPipelineStage === s.stage ? null : s.stage)
                        }
                        className={`bg-white border rounded-lg py-2 px-1 text-center transition-colors cursor-pointer ${
                          companyPipelineStage === s.stage
                            ? "border-yc-orange ring-1 ring-yc-orange/25"
                            : "border-yc-border hover:border-yc-orange/35"
                        }`}
                      >
                        <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] text-yc-text-secondary mt-0.5 leading-tight">{s.label}</div>
                      </button>
                    ),
                  )}
                </div>

                {companyPipelineStage && !selectedEventId && (
                  <div className="mt-4 bg-white border border-yc-border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-yc-dark">
                        {STAGE_LABEL[companyPipelineStage]}
                        {pipelineData && (
                          <span className="text-yc-text-secondary font-normal">
                            {" "}
                            · {pipelineData.rows.length} interaction{pipelineData.rows.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setCompanyPipelineStage(null)}
                        className="text-xs font-medium text-yc-orange hover:underline"
                      >
                        Clear filter
                      </button>
                    </div>
                    {!pipelineData && (
                      <div className="text-sm text-yc-text-secondary py-6 text-center">Loading…</div>
                    )}
                    {pipelineData && pipelineData.rows.length === 0 && (
                      <div className="text-sm text-yc-text-secondary py-6 text-center">No rows for this stage.</div>
                    )}
                    {pipelineData && pipelineData.rows.length > 0 && (
                      <ul className="divide-y divide-yc-border max-h-[320px] overflow-y-auto">
                        {pipelineData.rows.map((row) => (
                          <li key={row.interactionId} className="py-2.5 first:pt-0 flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                              <span className="text-sm font-medium text-yc-dark">{row.candidate.name}</span>
                              {(row.candidate.title || row.candidate.company) && (
                                <span className="text-xs text-yc-text-secondary ml-2">
                                  {[row.candidate.title, row.candidate.company].filter(Boolean).join(" · ")}
                                </span>
                              )}
                              <div className="text-[11px] text-yc-text-secondary mt-0.5">
                                <Link
                                  href={`/events/${row.event.id}/founder?filter=${companyPipelineStage}`}
                                  className="text-yc-orange hover:underline"
                                >
                                  {row.event.name}
                                </Link>
                                {row.event.date &&
                                  ` · ${new Date(row.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                              </div>
                            </div>
                            {row.candidate.linkedinUrl && (
                              <a
                                href={row.candidate.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-yc-purple shrink-0 hover:underline"
                              >
                                LinkedIn
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-yc-border mb-6 flex gap-6">
              {(["events", "analytics", "messages"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setSelectedMatchId(null); }}
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
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEventId(e.id);
                                  setEventEntryFilter(null);
                                  setTab("events");
                                }}
                                className="font-medium text-yc-dark hover:text-yc-orange transition-colors text-left"
                              >
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

            {/* Messages tab */}
            {tab === "messages" && !selectedMatchId && (
              <div className="space-y-3">
                <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider">
                  Matched applicants — mutual interest
                </div>
                {(!founderMatches || founderMatches.length === 0) && (
                  <div className="text-center py-16 text-sm text-yc-text-secondary bg-white border border-yc-border rounded-xl">
                    No matches yet. When you and an applicant both express interest, a match is created.
                  </div>
                )}
                {founderMatches?.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatchId(match.id)}
                    className="block w-full text-left bg-white border border-yc-border rounded-xl p-5 hover:border-yc-green/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-yc-purple-light rounded-full flex items-center justify-center text-sm font-bold text-yc-purple">
                            {match.applicant.name[0]}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-yc-dark">{match.applicant.name}</span>
                            <div className="text-xs text-yc-text-secondary">{match.applicant.email}</div>
                          </div>
                          <Badge variant="green">Match</Badge>
                        </div>
                        <div className="text-xs text-yc-text-secondary mt-1 ml-10">
                          via {match.event.name}
                          {match.applicant.skills.length > 0 && ` · ${match.applicant.skills.slice(0, 3).join(", ")}`}
                        </div>
                      </div>
                      {match.messages.length > 0 ? (
                        <div className="text-xs text-yc-text-secondary text-right max-w-[200px] truncate">{match.messages[0].content}</div>
                      ) : (
                        <span className="text-xs text-yc-orange">Start chatting</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tab === "messages" && selectedMatchId && selectedMatch && (
              <div>
                <button
                  onClick={() => setSelectedMatchId(null)}
                  className="text-xs text-yc-text-secondary hover:text-yc-dark mb-3 inline-flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Back to matches
                </button>

                <div className="bg-white border border-yc-border rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yc-purple-light rounded-full flex items-center justify-center text-sm font-bold text-yc-purple">
                      {selectedMatch.applicant.name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-yc-dark">{selectedMatch.applicant.name}</span>
                      <div className="text-xs text-yc-text-secondary">{selectedMatch.applicant.email}</div>
                    </div>
                    {selectedMatch.applicant.linkedinUrl && (
                      <a href={selectedMatch.applicant.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-yc-purple hover:underline ml-2">LinkedIn</a>
                    )}
                  </div>
                  {selectedMatch.applicant.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 ml-10">
                      {selectedMatch.applicant.skills.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded-full text-yc-purple">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-yc-border rounded-xl flex flex-col" style={{ height: "calc(100vh - 380px)" }}>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(!chatMessages || chatMessages.length === 0) && (
                      <div className="text-center py-8 text-xs text-yc-text-secondary">
                        Start the conversation! Introduce your company or discuss the role.
                      </div>
                    )}
                    {chatMessages?.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "founder" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          msg.sender === "founder"
                            ? "bg-yc-orange text-white rounded-br-md"
                            : "bg-yc-bg border border-yc-border text-yc-dark rounded-bl-md"
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender === "founder" ? "text-white/60" : "text-yc-text-secondary"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-yc-border p-3 flex gap-2">
                    <input
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendFounderMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-orange"
                    />
                    <button
                      onClick={sendFounderMessage}
                      disabled={!msgInput.trim() || sendingMsg}
                      className="px-4 py-2 bg-yc-orange text-white text-sm font-medium rounded-lg hover:bg-yc-orange-hover transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Event list */}
            {tab === "events" && <div className="space-y-3">
              <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider">Your events</div>
              {events.map((event) => {
                const s = event.stats;
                return (
                  <div
                    key={event.id}
                    className="bg-white border border-yc-border rounded-xl p-5 hover:border-yc-orange/25 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0"
                        onClick={() => {
                          setEventEntryFilter(null);
                          setSelectedEventId(event.id);
                        }}
                      >
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
                      </button>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                        {(
                          [
                            { label: "Contacted", value: s.contacted, color: "text-gray-600", stage: "contacted" as const },
                            { label: "Starred", value: s.starred, color: "text-yc-orange", stage: "starred" as const },
                            { label: "Spoke", value: s.spoke, color: "text-yc-green", stage: "spoke" as const },
                            { label: "Interview", value: s.interviewed, color: "text-indigo-600", stage: "interviewed" as const },
                            { label: "Offered", value: s.offered, color: "text-purple-600", stage: "offered" as const },
                            { label: "Hired", value: s.hired, color: "text-emerald-600", stage: "hired" as const },
                          ] as const
                        ).map((stat) => (
                          <button
                            key={stat.label}
                            type="button"
                            title={`Open event — show ${stat.label} only`}
                            onClick={() => {
                              setEventEntryFilter(stat.stage);
                              setSelectedEventId(event.id);
                            }}
                            className="text-center min-w-[38px] rounded-md px-1 py-1 border border-transparent hover:border-yc-border hover:bg-yc-bg/80 transition-colors cursor-pointer"
                          >
                            <div className={`text-base font-semibold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[9px] text-yc-text-secondary">{stat.label}</div>
                          </button>
                        ))}
                        <span className="text-yc-text-secondary/30 ml-0.5 hidden sm:inline" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
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
