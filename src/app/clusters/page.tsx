"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";
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

interface ClusterSummary {
  id: string;
  name: string;
  keywords: string[];
  jobCount: number;
  companyCount: number;
}

interface ClusterDetail extends ClusterSummary {
  jobs: Job[];
}

export default function ClustersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-yc-text-secondary">Loading...</div>}>
      <ClustersContent />
    </Suspense>
  );
}

function ClustersContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [selected, setSelected] = useState<string | null>(selectedId);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const { data: clusters } = useSWR<ClusterSummary[]>("/api/cluster", fetcher);
  const { data: activeCluster } = useSWR<ClusterDetail>(
    selected ? `/api/cluster/${selected}` : null,
    fetcher
  );

  async function createEventFromCluster(cluster: ClusterSummary) {
    setCreatingEvent(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${cluster.name} Hiring Night`,
          description: `Hiring event focused on ${cluster.name} roles at YC startups. ${cluster.jobCount} open positions across ${cluster.companyCount} companies.`,
          clusterId: cluster.id,
        }),
      });
      const event = await res.json();
      window.location.href = `/events/${event.id}`;
    } catch (err) {
      console.error("Failed to create event:", err);
    }
    setCreatingEvent(false);
  }

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-yc-dark">Role Clusters</h1>
        <p className="text-sm text-yc-text-secondary mt-1">
          Job postings grouped by description similarity. Pick a cluster to create an event theme.
        </p>
      </div>

      <div className="flex gap-6">
        <div className="w-72 shrink-0 space-y-2">
          {clusters?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected === c.id
                  ? "border-yc-orange bg-yc-orange-light"
                  : "border-yc-border bg-white hover:border-yc-orange/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yc-dark">
                  {c.name}
                </span>
                <Badge variant="orange">{c.jobCount}</Badge>
              </div>
              <div className="text-[11px] text-yc-text-secondary mt-0.5">
                {c.companyCount} companies
              </div>
            </button>
          ))}
          {!clusters && (
            <div className="text-center py-8 text-sm text-yc-text-secondary">
              Loading clusters...
            </div>
          )}
          {clusters?.length === 0 && (
            <div className="text-center py-8 text-sm text-yc-text-secondary">
              No clusters yet. Run clustering from the Demand Map.
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {selected && !activeCluster && (
            <div className="text-center py-16 text-sm text-yc-text-secondary">
              Loading cluster details...
            </div>
          )}
          {activeCluster ? (
            <>
              <div className="bg-white border border-yc-border rounded-lg p-5 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-yc-dark">
                      {activeCluster.name}
                    </h2>
                    <p className="text-sm text-yc-text-secondary mt-1">
                      {activeCluster.jobCount} roles across{" "}
                      {activeCluster.companyCount} YC startups
                    </p>
                  </div>
                  <button
                    onClick={() => createEventFromCluster(activeCluster)}
                    disabled={creatingEvent}
                    className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors disabled:opacity-50"
                  >
                    {creatingEvent
                      ? "Creating..."
                      : "Create Event from Cluster"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeCluster.keywords.map((kw) => (
                    <Badge key={kw} variant="neutral">
                      {kw}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-yc-border">
                  <h3 className="text-xs font-medium text-yc-text-secondary uppercase tracking-wider mb-2">
                    Companies Hiring
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeCluster.jobs
                      .map((j) => j.company)
                      .filter(
                        (c, i, a) =>
                          a.findIndex((x) => x.slug === c.slug) === i
                      )
                      .map((company) => (
                        <a
                          key={company.slug}
                          href={`https://www.ycombinator.com/companies/${company.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-yc-bg rounded-md hover:bg-yc-orange-light transition-colors"
                        >
                          <span className="font-medium text-yc-dark">
                            {company.name}
                          </span>
                          {company.batch && (
                            <Badge variant="orange">{company.batch}</Badge>
                          )}
                        </a>
                      ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {activeCluster.jobs.map((job) => (
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
                ))}
              </div>
            </>
          ) : !selected ? (
            <div className="text-center py-16 text-sm text-yc-text-secondary">
              Select a cluster to see details and create an event.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
