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

interface OpsAnalytics {
  events: {
    id: string;
    name: string;
    status: string;
    sourced: number;
    attended: number;
    interviewed: number;
    offered: number;
    hired: number;
    attendRate: number;
    overallConversion: number;
  }[];
  totals: {
    events: number;
    sourced: number;
    contacted: number;
    rsvp: number;
    attended: number;
    spoke: number;
    interviewed: number;
    offered: number;
    hired: number;
    companies: number;
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function LandingPage() {
  const { data: stats } = useSWR<Stats>("/api/stats", fetcher);
  const { data: clusters } = useSWR<ClusterSummary[]>("/api/cluster?type=role", fetcher);
  const { data: jobsData } = useSWR<JobsResponse>("/api/scrape?limit=6", fetcher);
  const { data: analytics } = useSWR<OpsAnalytics>("/api/analytics/ops", fetcher);

  useScrollReveal();

  const jobs = jobsData?.jobs || [];
  const [detailed, setDetailed] = useState(false);
  const t = analytics?.totals;

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
            A tool for planning Work at a Startup hiring events — from scraping live YC job data to sourcing candidates and measuring hiring outcomes.
          </p>
        </div>

        {(stats || t) && (
          <div className="reveal reveal-delay-1 mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { value: stats?.jobCount, label: "Jobs Tracked" },
              { value: stats?.companyCount, label: "YC Companies" },
              { value: t?.events, label: "Events Run" },
              { value: t?.hired, label: "Hires Made" },
            ].filter((s) => s.value != null).map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-6 sm:gap-10">
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl font-bold text-yc-dark tabular-nums">
                    {s.value!.toLocaleString()}
                  </span>
                  <div className="mt-1 text-sm text-yc-text-secondary">{s.label}</div>
                </div>
                {i < arr.length - 1 && <div className="hidden sm:block w-px h-10 bg-yc-border" />}
              </div>
            ))}
          </div>
        )}

        <div className="reveal reveal-delay-2 mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            href="/clusters"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold bg-yc-orange text-white rounded-lg hover:bg-yc-orange-hover transition-colors"
          >
            Event Ops Console
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/founder"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold border-2 border-yc-dark text-yc-dark rounded-lg hover:bg-yc-dark hover:text-white transition-colors"
          >
            Founder Console
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
          <p className="mt-2 text-base text-yc-text-secondary">Eight steps from raw job data to measurable hiring outcomes.</p>
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

          <div className="reveal reveal-delay-1 mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="bg-yc-bg border border-yc-border rounded-lg p-3">
              <div className="text-[10px] font-medium text-yc-orange uppercase tracking-wider mb-2">By Role</div>
              <div className="space-y-1.5">
                <div className="bg-yc-orange-light border border-yc-orange/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-orange">Infra & DevTools</span>
                  <span className="text-[10px] text-yc-text-secondary">SRE, DevOps, Infra</span>
                </div>
                <div className="bg-yc-blue-light border border-yc-blue/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-blue">ML & Data</span>
                  <span className="text-[10px] text-yc-text-secondary">ML Eng, Data Eng</span>
                </div>
                <div className="bg-yc-purple-light border border-yc-purple/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-purple">Product & Design</span>
                  <span className="text-[10px] text-yc-text-secondary">PM, Designer</span>
                </div>
              </div>
            </div>
            <div className="bg-yc-bg border border-yc-border rounded-lg p-3">
              <div className="text-[10px] font-medium text-yc-blue uppercase tracking-wider mb-2">By Company Domain</div>
              <div className="space-y-1.5">
                <div className="bg-yc-blue-light border border-yc-blue/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-blue">FinTech</span>
                  <span className="text-[10px] text-yc-text-secondary">8 companies</span>
                </div>
                <div className="bg-yc-green-light border border-yc-green/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-green">Developer Tools</span>
                  <span className="text-[10px] text-yc-text-secondary">12 companies</span>
                </div>
                <div className="bg-yc-purple-light border border-yc-purple/20 rounded px-2.5 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-purple">Healthcare AI</span>
                  <span className="text-[10px] text-yc-text-secondary">5 companies</span>
                </div>
              </div>
            </div>
          </div>

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
              short="Candidates are pulled from multiple channels and tracked through a full hiring pipeline."
              long="In production, sourcing layers Exa semantic search with WaaS applicants who applied to matching roles and Luma RSVPs from related tech events. Each candidate's experience is enriched via GPT to extract structured job history and skills."
              detailed={detailed}
            />
          </div>

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

          <div className="reveal reveal-delay-2 mt-4 space-y-2 max-w-xl">
            {[
              { name: "Sarah Chen", title: "Staff SRE · Stripe", skills: ["Kubernetes", "Go", "Terraform"], source: "Applied to SRE Lead", badge: "orange" as const },
              { name: "James Liu", title: "Infra Eng · Vercel", skills: ["TypeScript", "AWS", "Docker"], source: "Luma: SF Infra", badge: "purple" as const },
              { name: "Marcus Rivera", title: "Platform Eng · Datadog", skills: ["Python", "K8s", "CI/CD"], source: "Exa", badge: "neutral" as const },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-yc-border">
                <div className="w-8 h-8 bg-yc-orange-light rounded-full flex items-center justify-center text-xs font-bold text-yc-orange shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-yc-dark">{c.name}</div>
                  <div className="text-xs text-yc-text-secondary">{c.title}</div>
                  <div className="flex gap-1 mt-1">
                    {c.skills.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 bg-yc-bg border border-yc-border rounded text-yc-text-secondary">{s}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-yc-text-secondary/60 shrink-0">{c.source}</span>
              </div>
            ))}
          </div>

          <div className="reveal reveal-delay-3 mt-6 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "Sourced", value: 105, color: "bg-gray-500 text-white" },
                { label: "Contacted", value: 72, color: "bg-gray-400 text-white" },
                { label: "RSVP'd", value: 48, color: "bg-sky-500 text-white" },
                { label: "Attended", value: 38, color: "bg-teal-500 text-white" },
                { label: "Spoke", value: 26, color: "bg-green-500 text-white" },
                { label: "Hired", value: 8, color: "bg-emerald-600 text-white" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-yc-text-secondary/40 text-xs">→</span>}
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${s.color}`}>
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
            <Badge variant="green">Live</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Founder-facing event dashboard
            </h2>
            <Desc
              short="Founders get their own console — select their company, browse matched candidates, log interactions, and track their full hiring pipeline."
              long="The founder console spans two levels: a per-event view for live interaction with candidates, and an overall company dashboard aggregating pipeline stats and analytics across all events."
              detailed={detailed}
            />
          </div>

          {/* Mock founder view — richer */}
          <div className="reveal reveal-delay-1 mt-10 bg-white border border-yc-border rounded-xl overflow-hidden max-w-lg">
            <div className="px-5 py-3 border-b border-yc-border bg-yc-bg/50 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-yc-dark">Robot Fight Club</div>
                <div className="text-[10px] text-yc-text-secondary">18 candidates matched to 4 open roles</div>
              </div>
              <Badge variant="orange">Founder View</Badge>
            </div>

            {/* Role filter bubbles */}
            <div className="px-5 pt-3 flex flex-wrap gap-1.5">
              {["SRE Lead", "Backend Engineer", "Infra Engineer"].map((r, i) => (
                <span key={r} className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${i === 0 ? "bg-purple-100 border-purple-300 text-purple-700 font-medium" : "bg-white border-yc-border text-yc-text-secondary hover:border-purple-200"}`}>
                  {r}
                </span>
              ))}
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-yc-border text-yc-text-secondary/50">
                DevOps Eng
              </span>
            </div>

            <div className="p-5 space-y-2.5">
              {[
                { name: "Sarah Chen", current: "Staff SRE · Stripe · 3y", skills: ["Kubernetes", "Go", "Terraform"], stages: ["★", "Spoke", "Interviewed"], match: "94%" },
                { name: "Marcus Rivera", current: "Platform Eng · Datadog · 2y", skills: ["Python", "K8s", "CI/CD"], stages: ["★", "Spoke"], match: "89%" },
                { name: "Priya Patel", current: "Infra Lead · Figma · 4y", skills: ["AWS", "Docker", "Golang"], stages: ["★"], match: "85%" },
              ].map((c) => (
                <div key={c.name} className="bg-yc-bg rounded-lg px-3 py-2.5 border border-yc-border">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-yc-orange-light rounded-full flex items-center justify-center text-[10px] font-bold text-yc-orange shrink-0 mt-0.5">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-yc-dark">{c.name}</span>
                        <span className="text-[11px] font-semibold text-yc-orange">{c.match}</span>
                      </div>
                      <div className="text-[11px] text-yc-text-secondary">{c.current}</div>
                      <div className="flex gap-1 mt-1.5">
                        {c.skills.map((s) => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 bg-white border border-yc-border rounded text-yc-text-secondary">{s}</span>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {c.stages.map((s) => (
                          <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            s === "★" ? "text-yc-orange bg-yc-orange-light" :
                            s === "Spoke" ? "text-green-700 bg-green-50" :
                            s === "Interviewed" ? "text-indigo-700 bg-indigo-50" :
                            "text-yc-text-secondary bg-yc-bg"
                          }`}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Founder console aggregate stats */}
          <div className="reveal reveal-delay-2 mt-6 max-w-lg">
            <div className="bg-yc-bg border border-yc-border rounded-xl p-4">
              <div className="text-[10px] font-medium text-yc-text-secondary uppercase tracking-wider mb-3">Founder Console — company pipeline</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "Attended", value: 56, color: "text-teal-600" },
                  { label: "Spoke", value: 43, color: "text-green-600" },
                  { label: "Interviewed", value: 30, color: "text-indigo-600" },
                  { label: "Offered", value: 10, color: "text-purple-600" },
                  { label: "Hired", value: 8, color: "text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-yc-border rounded-lg py-2 px-1 text-center">
                    <div className={`text-base font-semibold ${s.color}`}>{s.value}</div>
                    <div className="text-[8px] text-yc-text-secondary leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-yc-text-secondary">
                Aggregate pipeline across 3 events · includes per-event analytics tab
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 07: Analytics ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">07</span>
            <Badge variant="green">Live</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Analytics & hiring outcomes
            </h2>
            <Desc
              short="Both ops and founders get analytics dashboards — cross-event funnels, conversion rates, and a company hiring leaderboard."
              long="Ops see the full picture: which events drive the most hires, where the funnel leaks, and which companies engage the most. Founders see their own pipeline across all events with per-event breakdowns."
              detailed={detailed}
            />
          </div>

          {/* Analytics mock — two panels side by side */}
          <div className="reveal reveal-delay-1 mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {/* Ops analytics panel */}
            <div className="bg-white border border-yc-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-yc-border bg-yc-bg/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-yc-dark">Ops Analytics</span>
                <Badge variant="orange">Live</Badge>
              </div>
              <div className="p-4 space-y-2">
                {(() => {
                  const bars = [
                    { label: "Sourced", value: t?.sourced ?? 225, color: "bg-gray-300" },
                    { label: "Contacted", value: t?.contacted ?? 398, color: "bg-gray-400" },
                    { label: "RSVP'd", value: t?.rsvp ?? 324, color: "bg-sky-400" },
                    { label: "Attended", value: t?.attended ?? 280, color: "bg-teal-400" },
                    { label: "Spoke", value: t?.spoke ?? 195, color: "bg-green-400" },
                    { label: "Interviewed", value: t?.interviewed ?? 69, color: "bg-indigo-400" },
                    { label: "Offered", value: t?.offered ?? 35, color: "bg-purple-400" },
                    { label: "Hired", value: t?.hired ?? 28, color: "bg-emerald-500" },
                  ];
                  const maxVal = Math.max(...bars.map((b) => b.value), 1);
                  return bars.map((bar) => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <div className="w-14 text-[9px] text-yc-text-secondary text-right shrink-0">{bar.label}</div>
                      <div className="flex-1 bg-yc-bg rounded-full h-4 relative overflow-hidden">
                        <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.max(4, (bar.value / maxVal) * 100)}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-yc-dark">{bar.value}</span>
                      </div>
                    </div>
                  ));
                })()}
                <div className="pt-2 border-t border-yc-border/50 flex flex-wrap gap-3 text-[9px] text-yc-text-secondary">
                  <span>Hire rate: <strong className="text-emerald-600">{t ? pct(t.hired / Math.max(t.sourced, 1)) : "12%"}</strong></span>
                  <span>Attend%: <strong className="text-teal-600">{t ? pct(t.attended / Math.max(t.rsvp, 1)) : "86%"}</strong></span>
                </div>
              </div>
            </div>

            {/* Event comparison panel */}
            <div className="bg-white border border-yc-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-yc-border bg-yc-bg/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-yc-dark">Event Comparison</span>
                <span className="text-[10px] text-yc-text-secondary">{t?.events ?? 7} events</span>
              </div>
              <div className="p-4">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-yc-border text-yc-text-secondary">
                      <th className="text-left py-1 pr-2 font-medium">Event</th>
                      <th className="text-right px-1 py-1 font-medium">Att</th>
                      <th className="text-right px-1 py-1 font-medium">Intv</th>
                      <th className="text-right px-1 py-1 font-medium">Hired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.events ?? [
                      { id: "1", name: "Robot Fight Club", attended: 56, interviewed: 30, hired: 8, status: "completed" },
                      { id: "2", name: "AI/ML Engineers Meetup", attended: 35, interviewed: 18, hired: 8, status: "completed" },
                      { id: "3", name: "Infra & DevTools Night", attended: 38, interviewed: 12, hired: 6, status: "completed" },
                      { id: "4", name: "FinTech Founders", attended: 36, interviewed: 9, hired: 6, status: "completed" },
                      { id: "5", name: "Healthcare & Biotech", attended: 45, interviewed: 0, hired: 0, status: "active" },
                    ]).slice(0, 5).map((e) => (
                      <tr key={e.id} className="border-b border-yc-border/30">
                        <td className="py-1.5 pr-2 text-yc-dark font-medium max-w-[100px] truncate">{e.name}</td>
                        <td className="text-right px-1 tabular-nums">{e.attended}</td>
                        <td className="text-right px-1 tabular-nums">{e.interviewed}</td>
                        <td className="text-right px-1 tabular-nums font-semibold text-emerald-600">{e.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Visual bars per completed event */}
                <div className="mt-3 space-y-1.5">
                  {(analytics?.events ?? [
                    { id: "1", name: "Robot Fight Club", sourced: 75, attended: 56, hired: 8, status: "completed" },
                    { id: "2", name: "AI/ML Meetup", sourced: 25, attended: 35, hired: 8, status: "completed" },
                    { id: "3", name: "Infra Night", sourced: 25, attended: 38, hired: 6, status: "completed" },
                  ]).filter((e) => e.status === "completed").slice(0, 4).map((e) => (
                    <div key={e.id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-yc-text-secondary truncate max-w-[120px]">{e.name}</span>
                        <span className="text-[9px] text-emerald-600 font-semibold">{e.hired}h</span>
                      </div>
                      <div className="flex gap-px h-2.5 rounded-full overflow-hidden bg-yc-bg">
                        <div className="bg-teal-400 rounded-l-full" style={{ width: `${Math.max(2, (e.attended / Math.max(e.sourced, 1)) * 100)}%` }} />
                        <div className="bg-emerald-500 rounded-r-full" style={{ width: `${Math.max(2, (e.hired / Math.max(e.sourced, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Founder analytics teaser */}
          <div className="reveal reveal-delay-2 mt-4 max-w-2xl">
            <div className="bg-white border border-yc-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yc-dark">Founder Analytics</span>
                  <Badge variant="green">Live</Badge>
                </div>
                <div className="mt-1 text-[11px] text-yc-text-secondary">
                  Per-company hiring funnels, event-by-event breakdowns, and conversion rate comparison — all inside the founder console.
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                {[
                  { label: "Intv", value: 30, color: "text-indigo-600" },
                  { label: "Offer", value: 10, color: "text-purple-600" },
                  { label: "Hired", value: 8, color: "text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[8px] text-yc-text-secondary">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step 08: Customizable Clustering ── */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal">
            <span className="text-sm font-mono font-semibold text-yc-orange tracking-widest">08</span>
            <Badge variant="neutral">Coming Soon</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-yc-dark tracking-tight">
              Customizable clustering
            </h2>
            <Desc
              short="Ops can mix clustering dimensions to design events that go beyond role type — targeting founder needs, candidate fit, and timing."
              long="This lets the team experiment with event formats. Cluster by YC batch to target the freshest cohorts, by funding stage to match candidate risk appetite, or by hiring velocity to prioritize the companies scaling fastest."
              detailed={detailed}
            />
          </div>

          {/* Builder UI mock */}
          <div className="reveal reveal-delay-1 mt-10 max-w-2xl">
            <div className="bg-white border border-yc-border rounded-2xl overflow-hidden shadow-sm">
              {/* Mock window chrome */}
              <div className="px-5 py-3 border-b border-yc-border bg-gradient-to-r from-yc-bg to-white flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                </div>
                <div className="flex-1 text-center text-[10px] text-yc-text-secondary font-medium">Clustering Strategy Builder</div>
              </div>

              <div className="p-5 sm:p-6">
                {/* Active dimensions */}
                <div className="text-[10px] font-medium text-yc-text-secondary uppercase tracking-widest mb-3">Active Dimensions</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                  {[
                    { label: "Role Type", icon: "👤", examples: ["SRE", "Backend", "ML Eng", "Designer"], color: "border-yc-orange/30 bg-yc-orange-light" },
                    { label: "Company Domain", icon: "🏢", examples: ["FinTech", "DevTools", "Healthcare AI"], color: "border-blue-200 bg-blue-50" },
                  ].map((d) => (
                    <div key={d.label} className={`rounded-xl border-2 ${d.color} p-3.5 relative`}>
                      <div className="absolute top-2.5 right-2.5">
                        <div className="w-8 h-4.5 bg-yc-orange rounded-full flex items-center justify-end px-0.5">
                          <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                        </div>
                      </div>
                      <div className="text-base mb-1">{d.icon}</div>
                      <div className="text-[13px] font-semibold text-yc-dark">{d.label}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.examples.map((e) => (
                          <span key={e} className="text-[9px] px-1.5 py-0.5 bg-white/80 rounded-full text-yc-text-secondary border border-white">{e}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Available dimensions */}
                <div className="text-[10px] font-medium text-yc-text-secondary uppercase tracking-widest mb-3">Available</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "YC Batch", icon: "🎓", desc: "W25, S24, W24…" },
                    { label: "Funding Stage", icon: "💰", desc: "Seed → Series B+" },
                    { label: "Hiring Velocity", icon: "📈", desc: "5+ roles / 30 days" },
                    { label: "Founder Type", icon: "🧑‍💻", desc: "Technical, repeat…" },
                    { label: "Applicant Overlap", icon: "🔗", desc: "Shared WaaS pool" },
                    { label: "Event Format", icon: "🎤", desc: "Hackathon, panel…" },
                  ].map((d) => (
                    <div key={d.label} className="rounded-xl border border-yc-border bg-yc-bg/50 p-3 hover:border-yc-orange/30 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{d.icon}</span>
                        <div className="w-7 h-3.5 bg-yc-border rounded-full flex items-center px-0.5 group-hover:bg-yc-orange/20 transition-colors">
                          <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-yc-dark">{d.label}</div>
                      <div className="text-[9px] text-yc-text-secondary mt-0.5">{d.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Custom combo preview */}
                <div className="mt-5 rounded-xl border border-dashed border-yc-orange/40 bg-yc-orange-light/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">✨</span>
                    <span className="text-[11px] font-semibold text-yc-dark">Custom Combo</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yc-orange/10 text-yc-orange font-medium border border-yc-orange/20">Series A</span>
                    <span className="text-[10px] text-yc-text-secondary">+</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-200">FinTech</span>
                    <span className="text-[10px] text-yc-text-secondary">+</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium border border-purple-200">Senior ML Engineers</span>
                    <span className="text-yc-text-secondary/40 mx-1">→</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">3 companies · 7 roles</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="reveal">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/clusters"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold bg-yc-orange text-white rounded-lg hover:bg-yc-orange-hover transition-colors"
              >
                Event Ops Console
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold border-2 border-yc-orange text-yc-orange rounded-lg hover:bg-yc-orange hover:text-white transition-colors"
              >
                View Analytics
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/founder"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold border-2 border-yc-dark text-yc-dark rounded-lg hover:bg-yc-dark hover:text-white transition-colors"
              >
                Founder Console
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
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
