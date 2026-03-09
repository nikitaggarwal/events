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
  const [tab, setTab] = useState<"role" | "domain">("role");
  const [selected, setSelected] = useState<string | null>(selectedId);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const { data: clusters } = useSWR<ClusterSummary[]>(
    `/api/cluster?type=${tab}`,
    fetcher
  );
  const { data: activeCluster } = useSWR<ClusterDetail>(
    selected ? `/api/cluster/${selected}` : null,
    fetcher
  );

  function switchTab(newTab: "role" | "domain") {
    setTab(newTab);
    setSelected(null);
    setShowAllCompanies(false);
  }

  async function createEventFromCluster(cluster: ClusterSummary) {
    setCreatingEvent(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${cluster.name} Hiring Night`,
          description: `Hiring event focused on ${cluster.name} ${tab === "role" ? "roles" : "companies"} at YC startups. ${cluster.jobCount} open positions across ${cluster.companyCount} companies.`,
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
    <div className="p-4 pt-14 md:pt-8 md:p-8 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yc-dark">Clusters</h1>
        <p className="text-sm text-yc-text-secondary mt-1">
          {tab === "role"
            ? "Job postings grouped by description similarity. Pick a cluster to create an event theme."
            : "Companies grouped by industry/domain. Pick a cluster to create an industry-themed event."}
        </p>
      </div>

      <div className="mb-6 flex gap-1 bg-yc-bg rounded-lg p-1 w-fit">
        <button
          onClick={() => switchTab("role")}
          className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            tab === "role"
              ? "bg-white text-yc-dark shadow-sm"
              : "text-yc-text-secondary hover:text-yc-dark"
          }`}
        >
          By Role
        </button>
        <button
          onClick={() => switchTab("domain")}
          className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            tab === "domain"
              ? "bg-white text-yc-dark shadow-sm"
              : "text-yc-text-secondary hover:text-yc-dark"
          }`}
        >
          By Domain
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cluster list — hidden on small screens when a cluster is selected */}
        <div className={`w-full lg:w-72 shrink-0 space-y-2 ${selected ? "hidden lg:block" : ""}`}>
          {clusters?.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelected(c.id); setShowAllCompanies(false); }}
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

        {/* Detail panel — on small screens, shows a back button when selected */}
        <div className={`flex-1 min-w-0 ${!selected ? "hidden lg:block" : ""}`}>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="mb-4 flex items-center gap-1 text-[13px] text-yc-text-secondary hover:text-yc-dark transition-colors lg:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to clusters
            </button>
          )}

          {selected && !activeCluster && (
            <div className="text-center py-16 text-sm text-yc-text-secondary">
              Loading cluster details...
            </div>
          )}
          {activeCluster ? (
            <>
              <div className="bg-white border border-yc-border rounded-lg p-5 mb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors disabled:opacity-50 w-full sm:w-auto"
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
                  {(() => {
                    const allCompanies = activeCluster.jobs
                      .map((j) => j.company)
                      .filter(
                        (c, i, a) =>
                          a.findIndex((x) => x.slug === c.slug) === i
                      );
                    const visible = showAllCompanies ? allCompanies : allCompanies.slice(0, 20);
                    return (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {visible.map((company) => (
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
                        {allCompanies.length > 20 && (
                          <button
                            onClick={() => setShowAllCompanies(!showAllCompanies)}
                            className="mt-2 text-[12px] font-medium text-yc-orange hover:text-yc-orange-hover transition-colors"
                          >
                            {showAllCompanies
                              ? "Show fewer"
                              : `Show all ${allCompanies.length} companies`}
                          </button>
                        )}
                      </>
                    );
                  })()}
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
