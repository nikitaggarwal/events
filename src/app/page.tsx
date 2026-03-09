"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { Badge } from "@/components/Badge";

function Desc({ short, long, detailed }: { short: string; long: string; detailed: boolean }) {
  return (
    <p className="mt-4 text-base sm:text-lg text-yc-text-secondary leading-relaxed max-w-2xl">
      {detailed ? `${short} ${long}` : short}
    </p>
  );
}

interface Stats {
  jobCount: number;
  companyCount: number;
  clusterCount: number;
}

interface ClusterSummary {
  id: string;
  name: string;
  keywords: string[];
  jobCount: number;
  companyCount: number;
}

interface Job {
  id: string;
  title: string;
  company: { name: string; batch: string | null };
  location: string | null;
  role: string | null;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
}

export default function LandingPage() {
  const { data: stats } = useSWR<Stats>("/api/stats", fetcher);
  const { data: clusters } = useSWR<ClusterSummary[]>("/api/cluster?type=role", fetcher);
  const { data: jobsData } = useSWR<JobsResponse>("/api/scrape?limit=6", fetcher);

  useScrollReveal();

  const jobs = jobsData?.jobs || [];
  const [detailed, setDetailed] = useState(false);

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="reveal">
          <div className="w-14 h-14 bg-yc-orange rounded-xl flex items-center justify-center mx-auto mb-8 shadow-sm">
            <span className="text-white text-2xl font-bold">Y</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-yc-dark leading-tight max-w-3xl mx-auto tracking-tight">
            Event Ops Console
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-yc-text-secondary max-w-2xl mx-auto leading-relaxed">
            A tool for planning Work at a Startup hiring events — from scraping live YC job data to sourcing candidates.
          </p>
        </div>

        {stats && (
          <div className="reveal reveal-delay-1 mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            <div className="text-center">
              <span className="text-4xl sm:text-5xl font-bold text-yc-dark tabular-nums">
                {stats.jobCount.toLocaleString()}
              </span>
              <div className="mt-1 text-sm text-yc-text-secondary">Jobs Tracked</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-yc-border" />
            <div className="text-center">
              <span className="text-4xl sm:text-5xl font-bold text-yc-dark tabular-nums">
                {stats.companyCount.toLocaleString()}
              </span>
              <div className="mt-1 text-sm text-yc-text-secondary">YC Companies</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-yc-border" />
            <div className="text-center">
              <span className="text-4xl sm:text-5xl font-bold text-yc-dark tabular-nums">
                {stats.clusterCount.toLocaleString()}
              </span>
              <div className="mt-1 text-sm text-yc-text-secondary">Event Themes</div>
            </div>
          </div>
        )}

        <div className="reveal reveal-delay-2 mt-12">
          <Link
            href="/clusters"
            className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold bg-yc-orange text-white rounded-lg hover:bg-yc-orange-hover transition-colors"
          >
            View Clusters
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="mt-16 animate-bounce text-yc-text-secondary/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <div className="text-center px-6 pt-16 pb-8">
        <div className="reveal">
          <h2 className="text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">How it works</h2>
          <p className="mt-2 text-base text-yc-text-secondary">Seven steps from raw job data to measurable hiring outcomes.</p>
          <button
            onClick={() => setDetailed(!detailed)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yc-border text-[12px] text-yc-text-secondary hover:text-yc-dark hover:border-yc-text-secondary/30 transition-colors"
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${detailed ? "bg-yc-orange" : "bg-yc-border"}`} />
            {detailed ? "Detailed" : "Brief"}
          </button>
        </div>
      </div>

      {/* ── Step 01: Scrape ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">01</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Scrape job listings
            </h2>
            <Desc
              short="Pulls every SF Bay Area job listing from WaaS and the YC company directory, then deduplicates and stores them."
              long="It captures titles, companies, locations, salary ranges, and skills for each listing. Both sources are scraped in parallel and merged into a single dataset."
              detailed={detailed}
            />
          </div>

          {/* Data source diagram */}
          <div className="reveal reveal-delay-1 mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 max-w-xl">
            <div className="flex-1 w-full bg-white border border-yc-border rounded-lg px-3 py-2.5 text-center">
              <div className="text-[11px] font-medium text-yc-text-secondary">Work at a Startup</div>
              <div className="text-[10px] text-yc-text-secondary/70">workatastartup.com</div>
            </div>
            <div className="flex-1 w-full bg-white border border-yc-border rounded-lg px-3 py-2.5 text-center">
              <div className="text-[11px] font-medium text-yc-text-secondary">YC Company Directory</div>
              <div className="text-[10px] text-yc-text-secondary/70">ycombinator.com/companies</div>
            </div>
            <div className="text-yc-text-secondary/50 hidden sm:block shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="sm:hidden text-yc-text-secondary/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bg-yc-orange-light border border-yc-orange/20 rounded-lg px-3 py-2.5 text-center shrink-0">
              <div className="text-lg font-bold text-yc-orange">{stats?.jobCount?.toLocaleString() || "—"}</div>
              <div className="text-[10px] font-medium text-yc-orange">Jobs stored</div>
            </div>
          </div>

          {/* Sample job cards */}
          {jobs.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobs.slice(0, 4).map((job, i) => (
                <div
                  key={job.id}
                  className={`reveal reveal-delay-${i + 1} bg-white border border-yc-border rounded-lg px-3 py-2.5`}
                >
                  <div className="text-[13px] font-medium text-yc-dark">{job.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-yc-text-secondary">
                    <span className="font-medium text-yc-text">{job.company.name}</span>
                    {job.company.batch && <Badge variant="orange">{job.company.batch}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Step 02: Cluster ── */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">02</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Cluster into event themes
            </h2>
            <Desc
              short="Jobs are embedded via OpenAI and grouped with K-Means clustering, producing focused event themes."
              long="Each theme ensures every attendee is relevant to every company at the event. Clustering can also be run by company domain to group by industry vertical instead of role type."
              detailed={detailed}
            />
          </div>

          {/* Clustering visualization */}
          <div className="reveal reveal-delay-1 mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 max-w-xl">
            <div className="flex-1 w-full bg-yc-bg border border-yc-border rounded-lg px-3 py-3">
              <div className="text-[10px] font-medium text-yc-text-secondary uppercase tracking-wider mb-2">Ungrouped</div>
              <div className="flex flex-wrap gap-1">
                {["SRE", "ML Eng", "Backend", "DevOps", "Data Eng", "Infra", "PM", "Designer", "Security"].map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white border border-yc-border rounded text-yc-text-secondary">{t}</span>
                ))}
              </div>
            </div>
            <div className="text-yc-text-secondary/50 hidden sm:block shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="sm:hidden text-yc-text-secondary/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 w-full space-y-1.5">
              <div className="bg-yc-orange-light border border-yc-orange/20 rounded px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-yc-orange">Infra & DevTools</span>
                <span className="text-[10px] text-yc-text-secondary">SRE, DevOps, Infra</span>
              </div>
              <div className="bg-yc-blue-light border border-yc-blue/20 rounded px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-yc-blue">ML & Data</span>
                <span className="text-[10px] text-yc-text-secondary">ML Eng, Data Eng</span>
              </div>
              <div className="bg-yc-purple-light border border-yc-purple/20 rounded px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-yc-purple">Product & Design</span>
                <span className="text-[10px] text-yc-text-secondary">PM, Designer</span>
              </div>
            </div>
          </div>

          {/* Real cluster badges */}
          {clusters && clusters.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {clusters.slice(0, 8).map((c, i) => (
                <Link
                  key={c.id}
                  href={`/clusters?selected=${c.id}`}
                  className={`reveal reveal-delay-${(i % 4) + 1} bg-yc-bg border border-yc-border rounded px-3 py-2 hover:border-yc-orange/30 transition-colors`}
                >
                  <span className="text-[12px] font-medium text-yc-dark">{c.name}</span>
                  <span className="text-[10px] text-yc-text-secondary ml-1.5">{c.jobCount}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Step 03: Create Events ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">03</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Create events from clusters
            </h2>
            <Desc
              short="Any cluster becomes a hiring event with one click, inheriting its theme, companies, and open roles."
              long="Each event tracks name, date, location, and status (draft, planning, active, completed). The linked cluster gives it a clear focus from the start."
              detailed={detailed}
            />
          </div>

          <div className="reveal reveal-delay-1 mt-10 bg-white border border-yc-border rounded-xl p-6 sm:p-8 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yc-orange-light rounded-lg flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="14" rx="2" stroke="#f26625" strokeWidth="1.5" />
                  <line x1="2" y1="8" x2="18" y2="8" stroke="#f26625" strokeWidth="1.5" />
                  <line x1="6" y1="2" x2="6" y2="5" stroke="#f26625" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="14" y1="2" x2="14" y2="5" stroke="#f26625" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-yc-dark">Infrastructure & DevTools Hiring Night</div>
                <div className="text-xs text-yc-text-secondary">Thursday, April 10, 2026 · San Francisco</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="purple">Kubernetes</Badge>
              <Badge variant="purple">CI/CD</Badge>
              <Badge variant="purple">Observability</Badge>
              <Badge variant="neutral">32 roles</Badge>
              <Badge variant="neutral">14 companies</Badge>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="green">Active</Badge>
              <span className="text-xs text-yc-text-secondary">Linked to cluster</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 04: Source Candidates & Pipeline ── */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">04</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Source candidates & build the pipeline
            </h2>
            <Desc
              short="Candidates are pulled from multiple channels and tracked through a pipeline — sourced, contacted, RSVP'd, attended."
              long="In production, sourcing layers Exa semantic search with WaaS applicants who applied to matching roles and Luma RSVPs from related tech events."
              detailed={detailed}
            />
          </div>

          {/* Sourcing channels */}
          <div className="reveal reveal-delay-1 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
            {[
              { channel: "WaaS Applicants", desc: "Applied to Senior Backend Eng, SRE Lead, +12 more", count: 48, badge: "orange" as const },
              { channel: "Luma RSVPs", desc: "SF Infra Meetup, DevTools Demo Day, +3 events", count: 31, badge: "purple" as const },
              { channel: "Exa Search", desc: "Semantic match to event theme & roles", count: 26, badge: "neutral" as const },
            ].map((s) => (
              <div key={s.channel} className="bg-yc-bg border border-yc-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant={s.badge}>{s.channel}</Badge>
                  <span className="text-lg font-semibold text-yc-dark">{s.count}</span>
                </div>
                <div className="text-[11px] text-yc-text-secondary leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Sample candidates with sources */}
          <div className="reveal reveal-delay-2 mt-4 space-y-2 max-w-xl">
            {[
              { name: "Sarah Chen", title: "Staff SRE at Stripe", source: "Applied to SRE Lead", badge: "orange" as const },
              { name: "James Liu", title: "Infra Eng at Vercel", source: "Luma: SF Infra Meetup", badge: "purple" as const },
              { name: "Marcus Rivera", title: "Platform Eng at Datadog", source: "Exa", badge: "neutral" as const },
              { name: "Priya Patel", title: "Infra Lead at Figma", source: "Applied to Infra Eng", badge: "orange" as const },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-yc-border">
                <div className="w-8 h-8 bg-yc-orange-light rounded-full flex items-center justify-center text-xs font-bold text-yc-orange shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-yc-dark">{c.name}</div>
                  <div className="text-xs text-yc-text-secondary">{c.title}</div>
                </div>
                <Badge variant={c.badge}>{c.source}</Badge>
              </div>
            ))}
          </div>

          {/* Pipeline summary */}
          <div className="reveal reveal-delay-3 mt-6 max-w-xl">
            <div className="flex items-center gap-2">
              {[
                { label: "Sourced", value: 105, color: "bg-yc-dark text-white" },
                { label: "Contacted", value: 72, color: "bg-yc-blue text-white" },
                { label: "RSVP'd", value: 38, color: "bg-yc-green text-white" },
                { label: "Attended", value: 28, color: "bg-yc-orange text-white" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-yc-text-secondary/40 text-xs">→</span>}
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>
                    {s.value} {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 05: Outreach & Tracking ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">05</span>
            <Badge variant="neutral">Coming Soon</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Outreach & tracking
            </h2>
            <Desc
              short="Automated outreach to both candidates and founders, with every touchpoint tracked in the console."
              long="Candidates receive personalized invites referencing the roles they matched with, while founders get a brief with confirmed attendees relevant to their open roles. All responses — opens, RSVPs, declines — are logged automatically."
              detailed={detailed}
            />
          </div>

          <div className="reveal reveal-delay-1 mt-10 space-y-3 max-w-lg">
            <div className="bg-white border border-yc-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-yc-border bg-yc-bg/50">
                <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider">Candidate outreach</div>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { name: "Sarah Chen", status: "RSVP'd", statusColor: "text-yc-green", time: "2h ago", method: "Email" },
                  { name: "James Liu", status: "Opened", statusColor: "text-yc-blue", time: "4h ago", method: "Email" },
                  { name: "Marcus Rivera", status: "Sent", statusColor: "text-yc-text-secondary", time: "5h ago", method: "LinkedIn" },
                  { name: "Priya Patel", status: "RSVP'd", statusColor: "text-yc-green", time: "1d ago", method: "Email" },
                ].map((c, i) => (
                  <div key={c.name} className={`flex items-center justify-between py-1.5 ${i > 0 ? "border-t border-yc-border/40" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-yc-orange-light rounded-full flex items-center justify-center text-[10px] font-bold text-yc-orange shrink-0">
                        {c.name[0]}
                      </div>
                      <span className="text-sm text-yc-dark">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-yc-text-secondary">{c.method}</span>
                      <span className={`text-[11px] font-medium ${c.statusColor}`}>{c.status}</span>
                      <span className="text-[10px] text-yc-text-secondary/60 w-10 text-right">{c.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-yc-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-yc-border bg-yc-bg/50">
                <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider">Founder outreach</div>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { company: "NovaSec (W24)", status: "Confirmed", statusColor: "text-yc-green", attendees: "3 relevant candidates" },
                  { company: "Kubera (S23)", status: "Confirmed", statusColor: "text-yc-green", attendees: "5 relevant candidates" },
                  { company: "FluxDB (W25)", status: "Pending", statusColor: "text-yc-text-secondary", attendees: "2 relevant candidates" },
                ].map((f, i) => (
                  <div key={f.company} className={`flex items-center justify-between py-1.5 ${i > 0 ? "border-t border-yc-border/40" : ""}`}>
                    <span className="text-sm text-yc-dark">{f.company}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-yc-text-secondary">{f.attendees}</span>
                      <span className={`text-[11px] font-medium ${f.statusColor}`}>{f.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 06: Founder View ── */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">06</span>
            <Badge variant="neutral">Coming Soon</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Founder-facing event dashboard
            </h2>
            <Desc
              short="Founders get their own view — browse matched candidates before the event, log conversations during, and flag follow-ups after."
              long="This gives the ops team a full picture of event ROI without chasing founders for feedback. They can see which founders engaged, who they liked, and measure conversations held, follow-ups sent, and hires made."
              detailed={detailed}
            />
          </div>

          {/* Mock founder top-candidates view */}
          <div className="reveal reveal-delay-1 mt-10 bg-white border border-yc-border rounded-xl p-5 max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-yc-dark">Your Top Candidates</div>
                <div className="text-[11px] text-yc-text-secondary">Infra &amp; DevTools Hiring Night · 18 matched to your roles</div>
              </div>
              <Badge variant="orange">Founder View</Badge>
            </div>
            <div className="space-y-2">
              {[
                { name: "Sarah Chen", title: "Staff SRE at Stripe", match: "SRE role · 94% match", starred: true, spoke: true },
                { name: "Marcus Rivera", title: "Platform Eng at Datadog", match: "Infra Eng role · 89% match", starred: true, spoke: false },
                { name: "Priya Patel", title: "Infra Lead at Figma", match: "Eng Manager role · 85% match", starred: false, spoke: false },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 bg-yc-bg rounded-lg px-3 py-2.5 border border-yc-border">
                  <div className="w-7 h-7 bg-yc-orange-light rounded-full flex items-center justify-center text-[10px] font-bold text-yc-orange shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-yc-dark">{c.name}</div>
                    <div className="text-[11px] text-yc-text-secondary">{c.title} · {c.match}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.starred && (
                      <span className="text-yc-orange text-sm" title="Want to meet">★</span>
                    )}
                    {c.spoke && (
                      <Badge variant="green">Spoke</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal reveal-delay-2 mt-6 max-w-lg space-y-3">
            <div className="bg-yc-bg border border-yc-border rounded-lg px-4 py-3">
              <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-2">Before the event</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-orange-light flex items-center justify-center text-[10px] text-yc-orange shrink-0">1</span>
                  Browse ranked candidates matched to your open roles
                </div>
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-orange-light flex items-center justify-center text-[10px] text-yc-orange shrink-0">2</span>
                  Star candidates you want to meet at the event
                </div>
              </div>
            </div>
            <div className="bg-yc-bg border border-yc-border rounded-lg px-4 py-3">
              <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-2">During &amp; after</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-green-light flex items-center justify-center text-[10px] text-yc-green shrink-0">3</span>
                  Log who you spoke with and rate the conversation
                </div>
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-green-light flex items-center justify-center text-[10px] text-yc-green shrink-0">4</span>
                  Flag candidates for follow-up or next-round interviews
                </div>
              </div>
            </div>
            <div className="bg-yc-bg border border-yc-border rounded-lg px-4 py-3">
              <div className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-2">For the ops team</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-blue-light flex items-center justify-center text-[10px] text-yc-blue shrink-0">5</span>
                  See which founders engaged and who they liked
                </div>
                <div className="flex items-center gap-2 text-xs text-yc-text">
                  <span className="w-4 h-4 rounded bg-yc-blue-light flex items-center justify-center text-[10px] text-yc-blue shrink-0">6</span>
                  Measure event ROI: conversations held, follow-ups sent, hires made
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 07: Post-Event Analytics ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">07</span>
            <Badge variant="neutral">Coming Soon</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Post-event analytics
            </h2>
            <Desc
              short="In production, ops can compare hiring funnels across events — attendance, interviews, offers, and acceptances."
              long="This closes the loop on event ROI by measuring what actually matters. Over time, this data helps optimize which event themes and formats drive the most hires."
              detailed={detailed}
            />
          </div>

          <div className="reveal reveal-delay-1 mt-10 overflow-x-auto">
            <div className="min-w-[480px] max-w-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-yc-border">
                    <th className="text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider pb-3 pr-4">Metric</th>
                    {[
                      { name: "Infra & DevTools", date: "Apr 10" },
                      { name: "ML & Data", date: "Mar 20" },
                      { name: "Product & Design", date: "Mar 6" },
                    ].map((e) => (
                      <th key={e.name} className="text-[11px] font-medium text-yc-text-secondary pb-3 px-2 text-center">
                        <div className="text-yc-dark font-semibold">{e.name}</div>
                        <div className="font-normal mt-0.5">{e.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Attended", values: [42, 35, 28], color: "text-yc-dark" },
                    { label: "→ Interviews", values: [28, 22, 19], color: "text-yc-blue", prevs: [42, 35, 28] },
                    { label: "→ Offers", values: [9, 6, 8], color: "text-yc-green", prevs: [28, 22, 19] },
                    { label: "→ Accepted", values: [7, 5, 6], color: "text-yc-orange", prevs: [9, 6, 8] },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-yc-border/50">
                      <td className="text-xs text-yc-text py-3 pr-4 whitespace-nowrap">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="text-center py-3 px-2">
                          <span className={`text-sm font-semibold ${row.color}`}>{v}</span>
                          {row.prevs && (
                            <span className="text-[10px] text-yc-text-secondary ml-1">
                              {Math.round((v / row.prevs[i]) * 100)}%
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="text-[11px] font-semibold text-yc-text pt-3 pr-4">Hire Rate</td>
                    {[
                      { accepted: 7, attended: 42 },
                      { accepted: 5, attended: 35 },
                      { accepted: 6, attended: 28 },
                    ].map((e, i) => (
                      <td key={i} className="text-center pt-3 px-2">
                        <span className="text-sm font-bold text-yc-orange">{Math.round((e.accepted / e.attended) * 100)}%</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="reveal">
            <Link
              href="/clusters"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold bg-yc-orange text-white rounded-lg hover:bg-yc-orange-hover transition-colors"
            >
              View Clusters
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          <div className="reveal reveal-delay-1 mt-12 pt-8 border-t border-yc-border">
            <p className="text-sm text-yc-text-secondary">
              Built by Nikita Aggarwal
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
