"use client";

import { useState } from "react";
import { Badge } from "./Badge";

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

interface ExperienceEntry {
  title: string;
  company: string;
  years: string;
}

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "rsvp", label: "RSVP" },
  { value: "declined", label: "Declined" },
  { value: "attended", label: "Attended" },
];

export function CandidateCard({
  id,
  name,
  title,
  company,
  profileUrl,
  highlights,
  fitScore,
  source,
  experience,
  inviteStatus,
  onStatusChange,
}: {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  profileUrl?: string | null;
  highlights?: string | null;
  fitScore?: number | null;
  fitReason?: string | null;
  source?: string | null;
  experience?: { current: ExperienceEntry | null; previous: ExperienceEntry | null } | null;
  inviteStatus: string;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const skills = extractSkills(highlights ?? null);
  const rawExp = experience as { current: ExperienceEntry | null; previous: ExperienceEntry | null } | null;
  const hasCurrent = !!(rawExp?.current?.title || rawExp?.current?.company);
  const hasPrevious = !!(rawExp?.previous?.title || rawExp?.previous?.company);
  const exp = { current: hasCurrent ? rawExp!.current : null, previous: hasPrevious ? rawExp!.previous : null };

  return (
    <div className="bg-white border border-yc-border rounded-xl p-4 transition-colors hover:border-yc-orange/20">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-yc-orange-light rounded-full flex items-center justify-center text-sm font-bold text-yc-orange shrink-0 mt-0.5">
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          {/* Name + score + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-yc-dark">{name}</span>
            {fitScore != null && (
              <span className="text-[11px] font-medium text-yc-orange">
                {Math.round(fitScore * 100)}% match
              </span>
            )}
            {source && (
              <span className="text-[10px] text-yc-text-secondary/40 hidden sm:inline">{source}</span>
            )}
          </div>

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
          ) : (title || company) ? (
            <div className="text-xs text-yc-text-secondary mt-0.5">
              {title}{company ? ` · ${company}` : ""}
            </div>
          ) : null}

          {/* Skills */}
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

          {/* Summary */}
          {highlights && (
            <div className="mt-2 text-xs text-yc-text leading-relaxed">
              <p className={expanded ? "" : "line-clamp-2"}>{highlights}</p>
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-0.5 text-[11px] text-yc-text-secondary/50 hover:text-yc-text-secondary transition-colors"
              >
                {expanded ? "see less" : "see more"}
              </button>
            </div>
          )}
        </div>

        {/* Right side: status + profile link */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {onStatusChange && (
            <select
              value={inviteStatus}
              onChange={(e) => onStatusChange(id, e.target.value)}
              className="text-[11px] border border-yc-border rounded px-2 py-1 text-yc-text-secondary focus:outline-none focus:border-yc-orange"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {!onStatusChange && (
            <Badge variant={inviteStatus === "rsvp" ? "green" : inviteStatus === "attended" ? "orange" : inviteStatus === "contacted" ? "blue" : "neutral"}>
              {STATUS_OPTIONS.find((o) => o.value === inviteStatus)?.label || inviteStatus}
            </Badge>
          )}
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-yc-text-secondary/30 hover:text-yc-dark transition-colors"
              title="View profile"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M6 3H3v10h10v-3M9 3h4v4M14 2L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
