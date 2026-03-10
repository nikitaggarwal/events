"use client";

import { useState, use, useCallback, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";

const TECH_KEYWORDS = new Set([
  "python", "java", "c++", "c#", "javascript", "typescript", "go", "rust", "ruby", "swift", "kotlin", "scala", "r",
  "react", "angular", "vue", "next.js", "node.js", "django", "flask", "spring", "rails",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "spark",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra",
  "graphql", "rest", "grpc", "kafka", "rabbitmq",
  "ml", "nlp", "cv", "ai", "llm", "gpt", "reinforcement learning", "deep learning", "machine learning",
  "robotics", "ros", "simulation", "autonomous", "lidar", "slam",
  "ci/cd", "devops", "sre", "infrastructure", "distributed systems", "microservices",
]);

function extractSkills(highlights: string | null): string[] {
  if (!highlights) return [];
  const words = highlights.toLowerCase();
  const skills: string[] = [];
  for (const kw of TECH_KEYWORDS) {
    if (words.includes(kw)) {
      skills.push(kw === "c++" ? "C++" : kw === "c#" ? "C#" : kw.length <= 4 ? kw.toUpperCase() : kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }
  return skills
    .filter((s, i) => skills.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
    .slice(0, 10);
}

interface EventSummary {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  cluster: { id: string; name: string; type: string } | null;
  companies: { id: string; name: string; slug: string; batch: string | null }[];
}

interface ExperienceEntry {
  title: string;
  company: string;
  years: string;
}

interface FounderCandidate {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  profileUrl: string | null;
  highlights: string | null;
  fitScore: number | null;
  source: string | null;
  experience: { current: ExperienceEntry | null; previous: ExperienceEntry | null } | null;
  contacted: boolean;
  rsvp: boolean;
  attended: boolean;
  starred: boolean;
  spoke: boolean;
  rating: number | null;
  notes: string | null;
  followUp: boolean;
  interviewed: boolean;
  offered: boolean;
  hired: boolean;
}

interface CompanyJob {
  id: string;
  title: string;
  relevant: boolean;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  batch: string | null;
  jobs: CompanyJob[];
}

type FilterKey = "all" | "contacted" | "rsvp" | "attended" | "starred" | "spoke" | "followUp" | "interviewed" | "offered" | "hired";

interface FounderStats {
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

interface FounderData {
  candidates: FounderCandidate[];
  company: CompanyInfo | null;
  clusterType: string;
  stats: FounderStats;
}

export default function FounderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const { data: event } = useSWR<EventSummary>(`/api/founder/event?eventId=${eventId}`, fetcher);

  const companies = event?.companies || [];

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const companyId = selectedCompanyId || companies[0]?.id || null;

  const { data: founderData, mutate } = useSWR<FounderData>(
    companyId ? `/api/founder?eventId=${eventId}&companyId=${companyId}` : null,
    fetcher
  );

  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const updateInteraction = useCallback(
    async (candidateId: string, patch: Record<string, unknown>) => {
      if (!companyId) return;
      mutate(
        (prev) => {
          if (!prev) return prev;
          const updated = prev.candidates.map((c) =>
            c.id === candidateId ? { ...c, ...patch } : c
          );
          const ct = (key: keyof FounderCandidate) =>
            updated.reduce((n, c) => n + ((c[key] as boolean) ? 1 : 0), 0);
          return {
            ...prev,
            candidates: updated,
            stats: {
              total: updated.length,
              contacted: ct("contacted"),
              rsvp: ct("rsvp"),
              attended: ct("attended"),
              starred: ct("starred"),
              spoke: ct("spoke"),
              followUp: ct("followUp"),
              interviewed: ct("interviewed"),
              offered: ct("offered"),
              hired: ct("hired"),
            },
          };
        },
        false
      );
      await fetch("/api/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, companyId, eventId, ...patch }),
      });
      mutate();
    },
    [companyId, eventId, mutate]
  );

  async function saveNotes(candidateId: string) {
    await updateInteraction(candidateId, { notes: notesDraft || null });
    setNotesOpen(null);
  }

  const [filter, setFilter] = useState<FilterKey>("all");

  const selectedJob = selectedJobId
    ? founderData?.company?.jobs.find((j) => j.id === selectedJobId)
    : null;

  const candidates = useMemo(() => {
    let list = founderData?.candidates || [];

    if (filter !== "all") {
      list = list.filter((c) => c[filter] === true);
    }

    if (selectedJob) {
      const keywords = selectedJob.title.toLowerCase().split(/[\s/,&+()-]+/).filter((w) => w.length > 2);
      list = list
        .map((c) => {
          const text = [c.highlights, c.title, c.company, (c.experience as Record<string, unknown>)?.current ? JSON.stringify((c.experience as Record<string, unknown>).current) : ""].join(" ").toLowerCase();
          const matchCount = keywords.filter((kw) => text.includes(kw)).length;
          return { ...c, _jobMatch: matchCount / Math.max(keywords.length, 1) };
        })
        .filter((c) => c._jobMatch > 0.2)
        .sort((a, b) => b._jobMatch - a._jobMatch);
    }

    return list;
  }, [founderData?.candidates, filter, selectedJob]);

  const stats = founderData?.stats || { total: 0, contacted: 0, rsvp: 0, attended: 0, starred: 0, spoke: 0, followUp: 0, interviewed: 0, offered: 0, hired: 0 };

  return (
    <div className="p-4 pt-14 md:pt-8 md:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-yc-text-secondary mb-2">
          <a href="/events" className="hover:text-yc-dark">Events</a>
          <span>/</span>
          <a href={`/events/${eventId}`} className="hover:text-yc-dark">{event?.name || "..."}</a>
          <span>/</span>
          <span>Founder View</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-yc-dark">Founder View</h1>
              <Badge variant="orange">Founder</Badge>
            </div>
            <div className="mt-1 text-sm text-yc-text-secondary">
              {event?.name}
              {event?.date && ` · ${new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
            </div>
          </div>

          {companies.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-1">
                Viewing as
              </label>
              <select
                value={companyId || ""}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="text-sm border border-yc-border rounded-md px-3 py-2 focus:outline-none focus:border-yc-orange min-w-[200px]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.batch ? `(${c.batch})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Company roles */}
      {founderData?.company?.jobs && founderData.company.jobs.length > 0 && (
        <div className="mb-6 bg-white border border-yc-border rounded-xl p-4">
          <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-3">
            Your open roles
            {founderData.clusterType === "domain"
              ? " — all relevant to this domain event"
              : ` — ${founderData.company.jobs.filter((j) => j.relevant).length} of ${founderData.company.jobs.length} relevant`
            }
            {selectedJob && (
              <span className="ml-2 text-yc-purple normal-case tracking-normal">
                · filtering by &quot;{selectedJob.title}&quot;
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {founderData.company.jobs
              .sort((a, b) => (a.relevant === b.relevant ? 0 : a.relevant ? -1 : 1))
              .map((j) => {
                const isSelected = selectedJobId === j.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => j.relevant && setSelectedJobId(isSelected ? null : j.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                      !j.relevant
                        ? "bg-gray-50 border-gray-200 text-gray-400 cursor-default"
                        : isSelected
                        ? "bg-yc-purple text-white border-yc-purple shadow-sm"
                        : "bg-yc-purple-light border-yc-purple/20 text-yc-purple hover:border-yc-purple/40 cursor-pointer"
                    }`}
                  >
                    {j.title}
                    {!j.relevant && <span className="ml-1 text-[10px]">(other)</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Stats — full funnel */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-yc-text-secondary uppercase tracking-wider">
          <span>Pre-event</span>
          <div className="flex-1 border-t border-yc-border" />
          <span>At event</span>
          <div className="flex-1 border-t border-yc-border" />
          <span>Post-event</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {([
            { label: "Total", value: stats.total, color: "text-yc-dark", key: "all" },
            { label: "Contacted", value: stats.contacted, color: "text-gray-600", key: "contacted" },
            { label: "RSVP'd", value: stats.rsvp, color: "text-sky-600", key: "rsvp" },
            { label: "Attended", value: stats.attended, color: "text-teal-600", key: "attended" },
            { label: "Starred", value: stats.starred, color: "text-yc-orange", key: "starred" },
            { label: "Spoke", value: stats.spoke, color: "text-yc-green", key: "spoke" },
            { label: "Follow Up", value: stats.followUp, color: "text-blue-600", key: "followUp" },
            { label: "Interview", value: stats.interviewed, color: "text-indigo-600", key: "interviewed" },
            { label: "Offered", value: stats.offered, color: "text-purple-600", key: "offered" },
            { label: "Hired", value: stats.hired, color: "text-emerald-600", key: "hired" },
          ] as { label: string; value: number; color: string; key: FilterKey }[]).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key ? "all" : s.key)}
              className={`bg-white border rounded-lg py-2 px-1 text-center transition-colors ${
                filter === s.key && s.key !== "all"
                  ? "border-yc-orange ring-1 ring-yc-orange/20"
                  : "border-yc-border hover:border-yc-orange/30"
              }`}
            >
              <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-yc-text-secondary mt-0.5 leading-tight">{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Candidate list */}
      <div className="space-y-2">
        {candidates.map((c) => (
          <div
            key={c.id}
            className={`bg-white border rounded-xl p-4 transition-colors ${
              c.starred ? "border-yc-orange/40" : "border-yc-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-yc-orange-light rounded-full flex items-center justify-center text-sm font-bold text-yc-orange shrink-0 mt-0.5">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-yc-dark">{c.name}</span>
                  {c.fitScore && (
                    <span className="text-[11px] font-medium text-yc-orange">
                      {Math.round(c.fitScore * 100)}% match
                    </span>
                  )}
                  {c.spoke && <Badge variant="green">Spoke</Badge>}
                  {c.followUp && <Badge variant="blue">Follow Up</Badge>}
                  {c.interviewed && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">Interviewed</span>}
                  {c.offered && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">Offered</span>}
                  {c.hired && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Hired</span>}
                </div>

                {(() => {
                  const skills = extractSkills(c.highlights);
                  const rawExp = c.experience as { current: ExperienceEntry | null; previous: ExperienceEntry | null } | null;
                  const hasCur = !!(rawExp?.current?.title || rawExp?.current?.company);
                  const hasPrev = !!(rawExp?.previous?.title || rawExp?.previous?.company);
                  const exp = { current: hasCur ? rawExp!.current : null, previous: hasPrev ? rawExp!.previous : null };
                  return (
                    <>
                      {/* Experience boxes */}
                      {(exp.current || exp.previous) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {exp.current && (
                            <div className="bg-yc-bg border border-yc-border rounded-md px-2.5 py-1.5 min-w-[140px]">
                              <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider">Current</div>
                              <div className="text-xs font-medium text-yc-dark mt-0.5">{exp.current.title}</div>
                              <div className="text-[11px] text-yc-text-secondary">
                                {exp.current.company}{exp.current.years ? ` · ${exp.current.years}` : ""}
                              </div>
                            </div>
                          )}
                          {exp.previous && (
                            <div className="bg-yc-bg border border-yc-border rounded-md px-2.5 py-1.5 min-w-[140px]">
                              <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider">Previous</div>
                              <div className="text-xs font-medium text-yc-dark mt-0.5">{exp.previous.title}</div>
                              <div className="text-[11px] text-yc-text-secondary">
                                {exp.previous.company}{exp.previous.years ? ` · ${exp.previous.years}` : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (c.title || c.company) ? (
                        <div className="text-xs text-yc-text-secondary mt-0.5">
                          {c.title}{c.company ? ` · ${c.company}` : ""}
                        </div>
                      ) : null}

                      {skills.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider mb-1">Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {skills.map((s) => (
                              <span key={s} className="text-[11px] px-2 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded-full text-yc-purple font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.highlights && (() => {
                        const expanded = expandedSummaries.has(c.id);
                        return (
                          <div className="mt-2 text-xs text-yc-text leading-relaxed">
                            <p className={expanded ? "" : "line-clamp-2"}>
                              {c.highlights}
                            </p>
                            <button
                              onClick={() => setExpandedSummaries((prev) => {
                                const next = new Set(prev);
                                if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                return next;
                              })}
                              className="mt-0.5 text-[11px] text-yc-text-secondary/50 hover:text-yc-text-secondary transition-colors"
                            >
                              {expanded ? "see less" : "see more"}
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
                {c.notes && notesOpen !== c.id && (
                  <div className="mt-2 text-xs text-yc-text bg-yc-bg rounded px-2.5 py-1.5 border border-yc-border/50">
                    {c.notes}
                  </div>
                )}
                {notesOpen === c.id && (
                  <div className="mt-2">
                    <textarea
                      autoFocus
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Add notes about this candidate..."
                      rows={2}
                      className="w-full text-xs border border-yc-border rounded-md px-2.5 py-2 focus:outline-none focus:border-yc-orange resize-none"
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => saveNotes(c.id)}
                        className="text-[11px] font-medium text-yc-orange hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setNotesOpen(null)}
                        className="text-[11px] text-yc-text-secondary hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {/* Row 1: event-day actions */}
                <div className="flex items-center gap-0.5">
                  {c.source && (
                    <span className="text-[10px] text-yc-text-secondary/40 mr-1 hidden sm:inline">{c.source}</span>
                  )}
                  <button
                    onClick={() => updateInteraction(c.id, { starred: !c.starred })}
                    className={`p-1.5 rounded transition-colors ${
                      c.starred ? "text-yc-orange hover:text-yc-orange-hover" : "text-yc-text-secondary/30 hover:text-yc-orange"
                    }`}
                    title={c.starred ? "Unstar" : "Star"}
                  >
                    <span className="text-lg leading-none">{c.starred ? "★" : "☆"}</span>
                  </button>
                  <button
                    onClick={() => updateInteraction(c.id, { spoke: !c.spoke })}
                    className={`p-1.5 rounded transition-colors ${c.spoke ? "text-yc-green" : "text-yc-text-secondary/30 hover:text-yc-green"}`}
                    title={c.spoke ? "Unmark spoke" : "Spoke"}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8.5C2 5.19 4.69 2.5 8 2.5s6 2.69 6 6c0 1.1-.3 2.14-.83 3.03L14 14.5l-3.27-.87A5.96 5.96 0 018 14.5c-3.31 0-6-2.69-6-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    onClick={() => updateInteraction(c.id, { followUp: !c.followUp })}
                    className={`p-1.5 rounded transition-colors ${c.followUp ? "text-blue-600" : "text-yc-text-secondary/30 hover:text-blue-600"}`}
                    title={c.followUp ? "Remove follow-up" : "Follow up"}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 2v12l5-3 5 3V2H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    onClick={() => { if (notesOpen === c.id) { setNotesOpen(null); } else { setNotesDraft(c.notes || ""); setNotesOpen(c.id); } }}
                    className={`p-1.5 rounded transition-colors ${c.notes ? "text-yc-dark" : "text-yc-text-secondary/30 hover:text-yc-dark"}`}
                    title="Notes"
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M12.5 2.5l1 1-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                  </button>
                  {c.profileUrl && (
                    <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-yc-text-secondary/30 hover:text-yc-dark transition-colors" title="View profile">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3H3v10h10v-3M9 3h4v4M14 2L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </a>
                  )}
                </div>
                {/* Row 2: post-event pipeline stages */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => updateInteraction(c.id, { interviewed: !c.interviewed })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      c.interviewed ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "text-yc-text-secondary/40 border-transparent hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    Interview
                  </button>
                  <button
                    onClick={() => updateInteraction(c.id, { offered: !c.offered })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      c.offered ? "bg-purple-50 text-purple-600 border-purple-200" : "text-yc-text-secondary/40 border-transparent hover:border-purple-200 hover:text-purple-600"
                    }`}
                  >
                    Offer
                  </button>
                  <button
                    onClick={() => updateInteraction(c.id, { hired: !c.hired })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      c.hired ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "text-yc-text-secondary/40 border-transparent hover:border-emerald-200 hover:text-emerald-600"
                    }`}
                  >
                    Hired
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {candidates.length === 0 && founderData && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            {filter !== "all"
              ? "No candidates match this filter."
              : "No candidates sourced for this event yet."}
          </div>
        )}
        {!founderData && companyId && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">Loading candidates...</div>
        )}
        {!companyId && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            No companies linked to this event. Create an event from a cluster first.
          </div>
        )}
      </div>
    </div>
  );
}
