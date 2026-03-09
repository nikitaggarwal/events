"use client";

import { useState, useEffect } from "react";
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

interface Cluster {
  id: string;
  name: string;
  keywords: string[];
  jobCount: number;
  companyCount: number;
  jobs: Job[];
}

export default function DemandMap() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [scraping, setScraping] = useState(false);
  const [clustering, setClustering] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [jobsRes, clustersRes] = await Promise.all([
      fetch("/api/scrape").then((r) => r.json()),
      fetch("/api/cluster").then((r) => r.json()),
    ]);
    setJobs(Array.isArray(jobsRes) ? jobsRes : []);
    setClusters(Array.isArray(clustersRes) ? clustersRes : []);
  }

  async function runScrape() {
    setScraping(true);
    setStatus("Scraping WaaS for SF Bay Area jobs...");
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      setStatus(
        `Scraped ${data.total} listings. ${data.created} new jobs added, ${data.skipped} skipped.`
      );
      await fetchData();
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
        body: JSON.stringify({ k: Math.min(8, Math.max(3, Math.floor(jobs.length / 3))) }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus(`Clustering error: ${data.error}`);
      } else {
        setStatus(`Created ${data.clusterCount} clusters.`);
        await fetchData();
      }
    } catch (err) {
      setStatus(`Clustering failed: ${err}`);
    }
    setClustering(false);
  }

  const uniqueCompanies = new Set(jobs.map((j) => j.company.slug));
  const recentJobs = jobs.filter((j) => {
    if (!j.postedAt) return false;
    return j.postedAt.includes("day") || j.postedAt.includes("hour");
  });

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
            disabled={clustering || jobs.length === 0}
            className="px-4 py-2 text-[13px] font-medium border border-yc-border text-yc-dark rounded-md hover:bg-yc-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clustering ? "Clustering..." : "Run Clustering"}
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-6 px-4 py-3 bg-yc-orange-light border border-yc-orange/20 rounded-lg text-sm text-yc-dark">
          {status}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Jobs" value={jobs.length} subtitle="SF Bay Area" />
        <StatsCard
          label="Companies"
          value={uniqueCompanies.size}
          subtitle="YC startups"
        />
        <StatsCard
          label="Clusters"
          value={clusters.length}
          subtitle="Role themes"
        />
        <StatsCard
          label="Recent"
          value={recentJobs.length}
          subtitle="Posted this week"
        />
      </div>

      {clusters.length > 0 && (
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
            {clusters.map((c) => (
              <ClusterCard
                key={c.id}
                id={c.id}
                name={c.name}
                keywords={c.keywords}
                jobCount={c.jobCount}
                companyCount={c.companyCount}
                topCompanies={c.jobs
                  .map((j) => j.company.name)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .slice(0, 5)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-yc-dark">
            All Jobs ({jobs.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {jobs.slice(0, 50).map((job) => (
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
          {jobs.length === 0 && (
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
