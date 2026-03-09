"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { StatsCard } from "@/components/StatsCard";
import { ClusterCard } from "@/components/ClusterCard";
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
  cluster: { id: string; name: string } | null;
}

interface ClusterSummary {
  id: string;
  name: string;
  keywords: string[];
  jobCount: number;
  companyCount: number;
}

interface Stats {
  jobCount: number;
  companyCount: number;
  clusterCount: number;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
}

export default function DemandMap() {
  const { data: stats, mutate: mutateStats } = useSWR<Stats>("/api/stats", fetcher);
  const { data: clusters, mutate: mutateClusters } = useSWR<ClusterSummary[]>("/api/cluster?type=role", fetcher);
  const { data: jobsData, mutate: mutateJobs } = useSWR<JobsResponse>("/api/scrape?limit=50", fetcher);

  const [scraping, setScraping] = useState(false);
  const [clustering, setClustering] = useState(false);
  const [domainClustering, setDomainClustering] = useState(false);
  const [status, setStatus] = useState("");
  const [showAllThemes, setShowAllThemes] = useState(false);

  const jobs = jobsData?.jobs || [];
  const totalJobs = jobsData?.total || stats?.jobCount || 0;

  async function runScrape() {
    setScraping(true);
    setStatus("Scraping WaaS + YC Directory for SF Bay Area jobs... (this may take a few minutes)");
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      setStatus(
        `Found ${data.total} listings (${data.fromWaaS} from WaaS, ${data.fromYCDirectory} from YC Directory). ${data.created} new jobs added, ${data.skipped} skipped.`
      );
      mutateStats();
      mutateClusters();
      mutateJobs();
    } catch (err) {
      setStatus(`Scrape failed: ${err}`);
    }
    setScraping(false);
  }

  async function runClustering() {
    setClustering(true);
    setStatus("Embedding jobs and clustering...");
    try {
      const res = await fetch("/api/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: Math.max(5, Math.round(totalJobs / 45)) }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus(`Clustering error: ${data.error}`);
      } else {
        setStatus(`Created ${data.clusterCount} clusters.`);
        mutateStats();
        mutateClusters();
        mutateJobs();
      }
    } catch (err) {
      setStatus(`Clustering failed: ${err}`);
    }
    setClustering(false);
  }

  async function runDomainClustering() {
    setDomainClustering(true);
    setStatus("Embedding companies and clustering by domain...");
    try {
      const companyCount = stats?.companyCount || 0;
      const res = await fetch("/api/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "domain",
          k: Math.max(5, Math.round(companyCount / 40)),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus(`Domain clustering error: ${data.error}`);
      } else {
        setStatus(`Created ${data.clusterCount} domain clusters.`);
        mutateStats();
      }
    } catch (err) {
      setStatus(`Domain clustering failed: ${err}`);
    }
    setDomainClustering(false);
  }

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-yc-dark">Demand Map</h1>
          <p className="text-sm text-yc-text-secondary mt-1">
            SF Bay Area YC startup hiring demand, clustered by role type
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runScrape}
            disabled={scraping}
            className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? "Scraping..." : "Scrape Jobs"}
          </button>
          <button
            onClick={runClustering}
            disabled={clustering || totalJobs === 0}
            className="px-4 py-2 text-[13px] font-medium border border-yc-border text-yc-dark rounded-md hover:bg-yc-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clustering ? "Clustering..." : "Cluster by Role"}
          </button>
          <button
            onClick={runDomainClustering}
            disabled={domainClustering || (stats?.companyCount ?? 0) === 0}
            className="px-4 py-2 text-[13px] font-medium border border-yc-border text-yc-dark rounded-md hover:bg-yc-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {domainClustering ? "Clustering..." : "Cluster by Domain"}
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-6 px-4 py-3 bg-yc-orange-light border border-yc-orange/20 rounded-lg text-sm text-yc-dark">
          {status}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Jobs" value={stats?.jobCount ?? 0} subtitle="SF Bay Area" />
        <StatsCard label="Companies" value={stats?.companyCount ?? 0} subtitle="YC startups" />
        <StatsCard label="Clusters" value={stats?.clusterCount ?? 0} subtitle="Role themes" />
        <StatsCard label="Recent Jobs" value={jobs.length} subtitle={`of ${totalJobs} shown`} />
      </div>

      {(clusters?.length ?? 0) > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-yc-dark">
              Top Event Themes
            </h2>
            <span className="text-xs text-yc-text-secondary">
              By demand (roles + companies)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(showAllThemes ? clusters! : clusters!.slice(0, 6)).map((c) => (
              <ClusterCard
                key={c.id}
                id={c.id}
                name={c.name}
                keywords={c.keywords}
                jobCount={c.jobCount}
                companyCount={c.companyCount}
                topCompanies={[]}
              />
            ))}
          </div>
          {clusters!.length > 6 && (
            <button
              onClick={() => setShowAllThemes(!showAllThemes)}
              className="mt-4 w-full py-2 text-[13px] font-medium text-yc-text-secondary border border-yc-border rounded-lg hover:bg-yc-bg transition-colors"
            >
              {showAllThemes ? "Show fewer" : `Show all ${clusters!.length} themes`}
            </button>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-yc-dark">
            All Jobs ({totalJobs})
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {jobs.map((job) => (
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
          {jobs.length === 0 && !jobsData && (
            <div className="text-center py-16 text-yc-text-secondary">
              <p className="text-sm">Loading jobs...</p>
            </div>
          )}
          {jobs.length === 0 && jobsData && (
            <div className="text-center py-16 text-yc-text-secondary">
              <p className="text-sm">No jobs scraped yet.</p>
              <p className="text-xs mt-1">
                Click &quot;Scrape Jobs&quot; to pull SF Bay Area YC startup listings.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
