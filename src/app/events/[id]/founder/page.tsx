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

function parseCandidate(c: { title: string | null; company: string | null; highlights: string | null }) {
  const skills: string[] = [];
  const bullets: string[] = [];

  const text = c.highlights || "";
  const sentences = text
    .split(/(?<=[.!?])\s+|(?<=\.)(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const words = text.toLowerCase();
  for (const kw of TECH_KEYWORDS) {
    if (words.includes(kw)) {
      skills.push(kw === "c++" ? "C++" : kw === "c#" ? "C#" : kw.length <= 4 ? kw.toUpperCase() : kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }

  const skillsLower = new Set(skills.map((s) => s.toLowerCase()));
  for (const s of sentences) {
    const isSkillList = s.split(/[,;]/).length > 3 && s.split(/[,;]/).every((part) => part.trim().split(" ").length <= 4);
    if (!isSkillList && s.length > 15) {
      bullets.push(s);
    }
  }

  const uniqueSkills = skills.filter((s, i) => skills.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);

  return { skills: uniqueSkills.slice(0, 10), bullets: bullets.slice(0, 4) };
}

interface EventSummary {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  cluster: { id: string; name: string; type: string } | null;
  companies: { id: string; name: string; slug: string; batch: string | null }[];
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
  starred: boolean;
  spoke: boolean;
  rating: number | null;
  notes: string | null;
  followUp: boolean;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  batch: string | null;
  jobs: { id: string; title: string }[];
}

interface FounderData {
  candidates: FounderCandidate[];
  company: CompanyInfo | null;
  stats: { total: number; starred: number; spoke: number; followUp: number };
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

  const updateInteraction = useCallback(
    async (candidateId: string, patch: Record<string, unknown>) => {
      if (!companyId) return;
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            candidates: prev.candidates.map((c) =>
              c.id === candidateId ? { ...c, ...patch } : c
            ),
            stats: {
              ...prev.stats,
              starred: prev.candidates.reduce(
                (n, c) => n + ((c.id === candidateId ? patch.starred ?? c.starred : c.starred) ? 1 : 0), 0
              ),
              spoke: prev.candidates.reduce(
                (n, c) => n + ((c.id === candidateId ? patch.spoke ?? c.spoke : c.spoke) ? 1 : 0), 0
              ),
              followUp: prev.candidates.reduce(
                (n, c) => n + ((c.id === candidateId ? patch.followUp ?? c.followUp : c.followUp) ? 1 : 0), 0
              ),
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

  const [filter, setFilter] = useState<"all" | "starred" | "spoke" | "followUp">("all");

  const candidates = (founderData?.candidates || []).filter((c) => {
    if (filter === "starred") return c.starred;
    if (filter === "spoke") return c.spoke;
    if (filter === "followUp") return c.followUp;
    return true;
  });

  const stats = founderData?.stats || { total: 0, starred: 0, spoke: 0, followUp: 0 };

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
        <div className="mb-6">
          <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-2">
            Your open roles at this event
          </div>
          <div className="flex flex-wrap gap-2">
            {founderData.company.jobs.map((j) => (
              <Badge key={j.id} variant="purple">{j.title}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Candidates", value: stats.total, color: "text-yc-dark", key: "all" as const },
          { label: "Starred", value: stats.starred, color: "text-yc-orange", key: "starred" as const },
          { label: "Spoke", value: stats.spoke, color: "text-yc-green", key: "spoke" as const },
          { label: "Follow Up", value: stats.followUp, color: "text-yc-blue", key: "followUp" as const },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            className={`bg-white border rounded-lg p-4 text-center transition-colors ${
              filter === s.key && s.key !== "all"
                ? "border-yc-orange"
                : "border-yc-border hover:border-yc-orange/30"
            }`}
          >
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-yc-text-secondary mt-0.5">{s.label}</div>
          </button>
        ))}
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
                </div>

                {(() => {
                  const parsed = parseCandidate(c);
                  return (
                    <>
                <div className="text-xs text-yc-text-secondary mt-0.5">
                  {c.title}{c.company ? ` · ${c.company}` : ""}
                </div>

                      {parsed.skills.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider mb-1">Skills & Technologies</div>
                          <div className="flex flex-wrap gap-1">
                            {parsed.skills.map((s) => (
                              <span key={s} className="text-[11px] px-2 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded-full text-yc-purple font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {parsed.bullets.length > 0 && (() => {
                        const expanded = expandedSummaries.has(c.id);
                        const preview = parsed.bullets[0];
                        const hasMore = parsed.bullets.length > 1;
                        return (
                          <div className="mt-2 text-xs text-yc-text leading-relaxed">
                            <span className="text-yc-text-secondary/60">— </span>
                            {expanded ? (
                              <ul className="inline">
                                {parsed.bullets.map((b, i) => (
                                  <li key={i} className={i > 0 ? "mt-1" : "inline"}>
                                    {i > 0 && <span className="text-yc-text-secondary/60">— </span>}
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="line-clamp-1 inline">{preview}</span>
                            )}
                            {hasMore && (
                              <button
                                onClick={() => setExpandedSummaries((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                  return next;
                                })}
                                className="ml-1 text-[11px] text-yc-text-secondary/50 hover:text-yc-text-secondary transition-colors"
                              >
                                {expanded ? "less" : `+${parsed.bullets.length - 1} more`}
                              </button>
                            )}
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

              {/* Source + Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {c.source && (
                  <span className="text-[10px] text-yc-text-secondary/40 mr-1 hidden sm:inline">{c.source}</span>
                )}
                <button
                  onClick={() => updateInteraction(c.id, { starred: !c.starred })}
                  className={`p-1.5 rounded transition-colors ${
                    c.starred
                      ? "text-yc-orange hover:text-yc-orange-hover"
                      : "text-yc-text-secondary/30 hover:text-yc-orange"
                  }`}
                  title={c.starred ? "Unstar" : "Star — want to meet"}
                >
                  <span className="text-lg">{c.starred ? "★" : "☆"}</span>
                </button>
                <button
                  onClick={() => updateInteraction(c.id, { spoke: !c.spoke })}
                  className={`p-1.5 rounded text-xs font-medium transition-colors ${
                    c.spoke
                      ? "text-yc-green"
                      : "text-yc-text-secondary/40 hover:text-yc-green"
                  }`}
                  title={c.spoke ? "Unmark spoke" : "Mark as spoke"}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8.5C2 5.19 4.69 2.5 8 2.5s6 2.69 6 6c0 1.1-.3 2.14-.83 3.03L14 14.5l-3.27-.87A5.96 5.96 0 018 14.5c-3.31 0-6-2.69-6-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => updateInteraction(c.id, { followUp: !c.followUp })}
                  className={`p-1.5 rounded text-xs font-medium transition-colors ${
                    c.followUp
                      ? "text-yc-blue"
                      : "text-yc-text-secondary/40 hover:text-yc-blue"
                  }`}
                  title={c.followUp ? "Remove follow-up" : "Flag for follow-up"}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 2v12l5-3 5 3V2H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (notesOpen === c.id) { setNotesOpen(null); }
                    else { setNotesDraft(c.notes || ""); setNotesOpen(c.id); }
                  }}
                  className={`p-1.5 rounded text-xs transition-colors ${
                    c.notes
                      ? "text-yc-dark"
                      : "text-yc-text-secondary/40 hover:text-yc-dark"
                  }`}
                  title="Add notes"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12.5 2.5l1 1-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
                {c.profileUrl && (
                  <a
                    href={c.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-yc-text-secondary/40 hover:text-yc-dark transition-colors"
                    title="View profile"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3H3v10h10v-3M9 3h4v4M14 2L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
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
