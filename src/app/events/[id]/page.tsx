"use client";

import { useState, use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";
import { CandidateCard } from "@/components/CandidateCard";
import { JobCard } from "@/components/JobCard";

interface Company {
  id: string;
  name: string;
  slug: string;
  batch: string | null;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  role: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  sourceUrl: string | null;
  postedAt: string | null;
  company: Company;
}

interface Candidate {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  profileUrl: string | null;
  highlights: string | null;
  fitScore: number | null;
  fitReason: string | null;
  source: string | null;
  inviteStatus: string;
}

interface EventData {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  description: string | null;
  status: string;
  cluster: {
    id: string;
    name: string;
    keywords: string[];
    jobs: Job[];
  } | null;
  candidates: Candidate[];
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: event, mutate } = useSWR<EventData>(`/api/events/${id}`, fetcher);
  const { data: allClusters } = useSWR<{ id: string; name: string; jobCount: number }[]>(
    "/api/cluster",
    fetcher
  );
  const [sourcing, setSourcing] = useState(false);
  const [tab, setTab] = useState<"candidates" | "roles" | "companies">(
    "candidates"
  );
  const [relinking, setRelinking] = useState(false);

  async function sourceCandidates() {
    if (!event?.cluster) return;
    setSourcing(true);
    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId: event.cluster.id,
          eventId: event.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        mutate();
      }
    } catch (err) {
      console.error("Sourcing failed:", err);
    }
    setSourcing(false);
  }

  async function updateCandidateStatus(candidateId: string, status: string) {
    mutate(
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === candidateId ? { ...c, inviteStatus: status } : c
          ),
        };
      },
      false
    );
    await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, inviteStatus: status }),
    });
    mutate();
  }

  async function relinkCluster(clusterId: string) {
    setRelinking(true);
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId }),
    });
    mutate();
    setRelinking(false);
  }

  async function updateEventStatus(status: string) {
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  }

  if (!event) {
    return (
      <div className="p-8 text-sm text-yc-text-secondary">Loading...</div>
    );
  }

  const statusCounts = {
    total: event.candidates.length,
    contacted: event.candidates.filter((c) => c.inviteStatus === "contacted")
      .length,
    rsvp: event.candidates.filter((c) => c.inviteStatus === "rsvp").length,
    attended: event.candidates.filter((c) => c.inviteStatus === "attended")
      .length,
  };

  const uniqueCompanies = event.cluster
    ? event.cluster.jobs
        .map((j) => j.company)
        .filter((c, i, a) => a.findIndex((x) => x.slug === c.slug) === i)
    : [];

  return (
    <div className="p-4 pt-14 md:pt-8 md:p-8 max-w-[1200px]">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-yc-text-secondary mb-2">
          <a href="/events" className="hover:text-yc-dark">
            Events
          </a>
          <span>/</span>
          <span>{event.name}</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-yc-dark">
                {event.name}
              </h1>
              <select
                value={event.status}
                onChange={(e) => updateEventStatus(e.target.value)}
                className="text-[11px] font-medium border border-yc-border rounded px-2 py-1 focus:outline-none focus:border-yc-orange"
              >
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-yc-text-secondary flex-wrap">
              {event.date && (
                <span>
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {event.location && <span>{event.location}</span>}
              {event.cluster && (
                <Badge variant="purple">{event.cluster.name}</Badge>
              )}
            </div>
          </div>
          {event.cluster ? (
            <button
              onClick={sourceCandidates}
              disabled={sourcing}
              className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {sourcing ? "Sourcing..." : "Source Candidates via Exa"}
            </button>
          ) : (
            <select
              disabled={relinking}
              onChange={(e) => {
                if (e.target.value) relinkCluster(e.target.value);
              }}
              defaultValue=""
              className="text-[13px] border border-yc-border rounded-md px-3 py-2 focus:outline-none focus:border-yc-orange w-full sm:w-auto"
            >
              <option value="" disabled>Link a cluster...</option>
              {allClusters?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.jobCount} jobs)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {event.description && (
        <p className="mb-6 text-sm text-yc-text-secondary leading-relaxed">
          {event.description}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border border-yc-border rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-yc-dark">
            {statusCounts.total}
          </div>
          <div className="text-[11px] text-yc-text-secondary mt-0.5">
            Sourced
          </div>
        </div>
        <div className="bg-white border border-yc-border rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-yc-blue">
            {statusCounts.contacted}
          </div>
          <div className="text-[11px] text-yc-text-secondary mt-0.5">
            Contacted
          </div>
        </div>
        <div className="bg-white border border-yc-border rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-yc-green">
            {statusCounts.rsvp}
          </div>
          <div className="text-[11px] text-yc-text-secondary mt-0.5">
            RSVP
          </div>
        </div>
        <div className="bg-white border border-yc-border rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-yc-orange">
            {statusCounts.attended}
          </div>
          <div className="text-[11px] text-yc-text-secondary mt-0.5">
            Attended
          </div>
        </div>
      </div>

      <div className="border-b border-yc-border mb-6 overflow-x-auto">
        <div className="flex gap-4 sm:gap-6 min-w-max">
          {(
            [
              ["candidates", `Candidates (${event.candidates.length})`],
              [
                "roles",
                `Open Roles (${event.cluster?.jobs.length || 0})`,
              ],
              ["companies", `Companies (${uniqueCompanies.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-yc-orange text-yc-orange"
                  : "border-transparent text-yc-text-secondary hover:text-yc-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "candidates" && (
        <div className="space-y-3">
          {event.candidates.map((c) => (
            <CandidateCard
              key={c.id}
              id={c.id}
              name={c.name}
              title={c.title}
              company={c.company}
              profileUrl={c.profileUrl}
              highlights={c.highlights}
              fitScore={c.fitScore}
              fitReason={c.fitReason}
              source={c.source}
              inviteStatus={c.inviteStatus}
              onStatusChange={updateCandidateStatus}
            />
          ))}
          {event.candidates.length === 0 && (
            <div className="text-center py-12 text-sm text-yc-text-secondary">
              {event.cluster ? (
                <>
                  No candidates sourced yet. Click &quot;Source Candidates via
                  Exa&quot; to find matching profiles.
                </>
              ) : (
                <>
                  This event has no linked cluster. Create an event from the
                  Clusters page to enable candidate sourcing.
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-3">
          {event.cluster?.jobs.map((job) => (
            <JobCard
              key={job.id}
              title={job.title}
              companyName={job.company.name}
              batch={job.company.batch}
              location={job.location}
              role={job.role}
              salaryMin={job.salaryMin}
              salaryMax={job.salaryMax}
              skills={job.skills}
              postedAt={job.postedAt}
              sourceUrl={job.sourceUrl}
            />
          )) || (
            <div className="text-center py-12 text-sm text-yc-text-secondary">
              No cluster linked to this event.
            </div>
          )}
        </div>
      )}

      {tab === "companies" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {uniqueCompanies.map((company) => {
            const companyJobs =
              event.cluster?.jobs.filter(
                (j) => j.company.slug === company.slug
              ) || [];
            return (
              <a
                key={company.slug}
                href={`https://www.ycombinator.com/companies/${company.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-yc-border rounded-lg p-4 hover:border-yc-orange/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-yc-dark">
                    {company.name}
                  </span>
                  {company.batch && (
                    <Badge variant="orange">{company.batch}</Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-yc-text-secondary">
                  {companyJobs.length} open role
                  {companyJobs.length !== 1 ? "s" : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {companyJobs.map((j) => (
                    <Badge key={j.id} variant="neutral">
                      {j.title}
                    </Badge>
                  ))}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
