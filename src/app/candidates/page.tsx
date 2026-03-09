"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { CandidateCard } from "@/components/CandidateCard";
import { Badge } from "@/components/Badge";

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
  event: { id: string; name: string } | null;
}

export default function CandidatesPage() {
  const { data: candidates, mutate } = useSWR<Candidate[]>("/api/candidates", fetcher);
  const [filter, setFilter] = useState("all");

  async function updateStatus(id: string, status: string) {
    mutate(
      (prev) => prev?.map((c) => (c.id === id ? { ...c, inviteStatus: status } : c)),
      false
    );
    await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, inviteStatus: status }),
    });
    mutate();
  }

  const all = candidates || [];
  const filtered = filter === "all" ? all : all.filter((c) => c.inviteStatus === filter);

  const counts = {
    all: all.length,
    not_contacted: all.filter((c) => c.inviteStatus === "not_contacted").length,
    contacted: all.filter((c) => c.inviteStatus === "contacted").length,
    rsvp: all.filter((c) => c.inviteStatus === "rsvp").length,
    declined: all.filter((c) => c.inviteStatus === "declined").length,
    attended: all.filter((c) => c.inviteStatus === "attended").length,
  };

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-yc-dark">All Candidates</h1>
        <p className="text-sm text-yc-text-secondary mt-1">
          Track sourced candidates across all events
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {(
          [
            ["all", "All"],
            ["not_contacted", "Not Contacted"],
            ["contacted", "Contacted"],
            ["rsvp", "RSVP"],
            ["declined", "Declined"],
            ["attended", "Attended"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              filter === key
                ? "bg-yc-orange text-white"
                : "bg-white border border-yc-border text-yc-text-secondary hover:text-yc-dark"
            }`}
          >
            {label}{" "}
            <span className="opacity-70">
              ({counts[key as keyof typeof counts]})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id}>
            {c.event && (
              <div className="mb-1 ml-1">
                <Badge variant="purple">{c.event.name}</Badge>
              </div>
            )}
            <CandidateCard
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
              onStatusChange={updateStatus}
            />
          </div>
        ))}
        {!candidates && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            Loading candidates...
          </div>
        )}
        {candidates && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            {all.length === 0
              ? "No candidates sourced yet. Source candidates from an event page."
              : "No candidates match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
