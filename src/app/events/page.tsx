"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";

type EventListStageFilter =
  | "all"
  | "sourced"
  | "contacted"
  | "rsvp"
  | "attended"
  | "starred"
  | "spoke"
  | "followUp"
  | "interviewed"
  | "offered"
  | "hired";

interface InteractionStats {
  contacted: number;
  rsvp: number;
  attended: number;
  starred: number;
  spoke: number;
  followUp: number;
  interviewed: number;
  offered: number;
  hired: number;
}

interface Event {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  status: string;
  cluster: { id: string; name: string } | null;
  candidates: { id: string }[];
  interactionStats: InteractionStats;
  createdAt: string;
}

function eventMatchesListFilter(ev: Event, f: EventListStageFilter): boolean {
  if (f === "all") return true;
  const s = ev.interactionStats;
  const n = ev.candidates.length;
  switch (f) {
    case "sourced":
      return n > 0;
    case "contacted":
      return s.contacted > 0;
    case "rsvp":
      return s.rsvp > 0;
    case "attended":
      return s.attended > 0;
    case "starred":
      return s.starred > 0;
    case "spoke":
      return s.spoke > 0;
    case "followUp":
      return s.followUp > 0;
    case "interviewed":
      return s.interviewed > 0;
    case "offered":
      return s.offered > 0;
    case "hired":
      return s.hired > 0;
    default:
      return true;
  }
}

const STATUS_VARIANT: Record<string, "green" | "orange" | "blue" | "neutral"> = {
  draft: "neutral",
  planning: "blue",
  active: "orange",
  completed: "green",
};

export default function EventsPage() {
  const { data: events, mutate } = useSWR<Event[]>("/api/events", fetcher);
  const [listStageFilter, setListStageFilter] = useState<EventListStageFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const totals = useMemo(() => {
    if (!events?.length) {
      return {
        sourced: 0,
        contacted: 0,
        rsvp: 0,
        attended: 0,
        starred: 0,
        spoke: 0,
        followUp: 0,
        interviewed: 0,
        offered: 0,
        hired: 0,
      };
    }
    return events.reduce(
      (acc, ev) => {
        const s = ev.interactionStats;
        return {
          sourced: acc.sourced + ev.candidates.length,
          contacted: acc.contacted + s.contacted,
          rsvp: acc.rsvp + s.rsvp,
          attended: acc.attended + s.attended,
          starred: acc.starred + s.starred,
          spoke: acc.spoke + s.spoke,
          followUp: acc.followUp + s.followUp,
          interviewed: acc.interviewed + s.interviewed,
          offered: acc.offered + s.offered,
          hired: acc.hired + s.hired,
        };
      },
      {
        sourced: 0,
        contacted: 0,
        rsvp: 0,
        attended: 0,
        starred: 0,
        spoke: 0,
        followUp: 0,
        interviewed: 0,
        offered: 0,
        hired: 0,
      }
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!events?.length) return [];
    return events.filter((e) => eventMatchesListFilter(e, listStageFilter));
  }, [events, listStageFilter]);

  function toggleListFilter(next: EventListStageFilter) {
    setListStageFilter((prev) => (prev === next ? "all" : next));
  }

  async function deleteEvent(e: React.MouseEvent, eventId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this event and all its sourced candidates?")) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    mutate();
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, date: newDate || null }),
    });
    const event = await res.json();
    mutate();
    window.location.href = `/events/${event.id}`;
  }

  return (
    <div className="p-4 pt-14 md:pt-8 md:p-8 max-w-[1200px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-yc-dark">Events</h1>
          <p className="text-sm text-yc-text-secondary mt-1">
            Manage hiring events, track RSVPs, and source candidates
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors"
        >
          New Event
        </button>
      </div>

      {events && events.length > 0 && (
        <>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-4">
            {(
              [
                { label: "Sourced", value: totals.sourced, color: "text-yc-dark", key: "sourced" as const },
                { label: "Contacted", value: totals.contacted, color: "text-gray-600", key: "contacted" as const },
                { label: "RSVP", value: totals.rsvp, color: "text-sky-600", key: "rsvp" as const },
                { label: "Attended", value: totals.attended, color: "text-teal-600", key: "attended" as const },
                { label: "Starred", value: totals.starred, color: "text-yc-orange", key: "starred" as const },
                { label: "Spoke", value: totals.spoke, color: "text-yc-green", key: "spoke" as const },
                { label: "Follow Up", value: totals.followUp, color: "text-blue-600", key: "followUp" as const },
                { label: "Interview", value: totals.interviewed, color: "text-indigo-600", key: "interviewed" as const },
                { label: "Offered", value: totals.offered, color: "text-purple-600", key: "offered" as const },
                { label: "Hired", value: totals.hired, color: "text-emerald-600", key: "hired" as const },
              ] as const
            ).map((stat) => {
              const active = listStageFilter === stat.key;
              return (
                <button
                  key={stat.key}
                  type="button"
                  title={
                    active
                      ? "Show all events"
                      : `Only events with ${stat.label.toLowerCase()} activity`
                  }
                  onClick={() => toggleListFilter(stat.key)}
                  className={[
                    "rounded-lg py-2 px-1.5 text-center transition-colors duration-150 cursor-pointer",
                    "ring-1 ring-inset",
                    active
                      ? "bg-zinc-100/90 text-yc-dark ring-zinc-300/90"
                      : "bg-white ring-zinc-200/70 hover:bg-zinc-50 hover:ring-zinc-300/80",
                  ].join(" ")}
                >
                  <div className={`text-lg font-semibold tabular-nums ${stat.color}`}>{stat.value}</div>
                  <div
                    className={`text-[9px] mt-0.5 leading-tight ${
                      active ? "text-yc-dark font-medium" : "text-yc-text-secondary"
                    }`}
                  >
                    {stat.label}
                  </div>
                </button>
              );
            })}
          </div>
          {listStageFilter !== "all" && (
            <p className="text-xs text-yc-text-secondary mb-6">
              Showing {filteredEvents.length} of {events.length} events ·{" "}
              <button
                type="button"
                className="text-yc-orange hover:underline"
                onClick={() => setListStageFilter("all")}
              >
                Clear filter
              </button>
            </p>
          )}
        </>
      )}

      {showCreate && (
        <form
          onSubmit={createEvent}
          className="mb-6 bg-white border border-yc-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-yc-dark mb-3">
            Create Event
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Backend Infrastructure Hiring Night"
                required
                className="w-full px-3 py-2 text-sm border border-yc-border rounded-md focus:outline-none focus:border-yc-orange"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-yc-text-secondary uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-yc-border rounded-md focus:outline-none focus:border-yc-orange"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-[13px] font-medium bg-yc-orange text-white rounded-md hover:bg-yc-orange-hover transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-[13px] font-medium border border-yc-border text-yc-text-secondary rounded-md hover:bg-yc-bg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {filteredEvents.map((event) => {
          const s = event.interactionStats;

          return (
            <div
              key={event.id}
              className="bg-white border border-yc-border rounded-lg p-5 hover:border-yc-orange/30 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <Link href={`/events/${event.id}`} className="flex-1 min-w-0 hover:text-yc-orange transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-yc-dark">
                      {event.name}
                    </h3>
                    <Badge variant={STATUS_VARIANT[event.status] || "neutral"}>
                      {event.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-yc-text-secondary flex-wrap">
                    {event.date && (
                      <span>
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {event.location && <span>{event.location}</span>}
                    {event.cluster && (
                      <Badge variant="purple">{event.cluster.name}</Badge>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 text-xs text-yc-text-secondary flex-wrap">
                  {(
                    [
                      { label: "sourced", value: event.candidates.length, color: "text-yc-dark", filter: null as string | null },
                      { label: "contacted", value: s.contacted, color: "text-gray-600", filter: "contacted" },
                      { label: "RSVP", value: s.rsvp, color: "text-sky-600", filter: "rsvp" },
                      { label: "attended", value: s.attended, color: "text-teal-600", filter: "attended" },
                      { label: "starred", value: s.starred, color: "text-yc-orange", filter: "starred" },
                      { label: "spoke", value: s.spoke, color: "text-yc-green", filter: "spoke" },
                      { label: "follow up", value: s.followUp, color: "text-blue-600", filter: "followUp" },
                      { label: "interviewed", value: s.interviewed, color: "text-indigo-600", filter: "interviewed" },
                      { label: "offered", value: s.offered, color: "text-purple-600", filter: "offered" },
                      { label: "hired", value: s.hired, color: "text-emerald-600", filter: "hired" },
                    ] as const
                  ).map((stat) => {
                    const pill = (
                      <>
                        <div className={`text-base font-semibold ${stat.color}`}>
                          {stat.value}
                        </div>
                        <div>{stat.label}</div>
                      </>
                    );
                    const href = stat.filter
                      ? `/events/${event.id}?filter=${stat.filter}`
                      : `/events/${event.id}`;
                    return (
                      <Link
                        key={stat.label}
                        href={href}
                        title={
                          stat.filter
                            ? `Event: candidates with ${stat.label}`
                            : "Event detail"
                        }
                        className="text-center min-w-[40px] rounded-md px-1 py-0.5 hover:bg-yc-bg border border-transparent hover:border-yc-border transition-colors"
                      >
                        {pill}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={(e) => deleteEvent(e, event.id)}
                    className="ml-1 p-1.5 text-yc-text-secondary/40 hover:text-red-500 transition-colors rounded"
                    title="Delete event"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {events && events.length > 0 && filteredEvents.length === 0 && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            No events match this filter.{" "}
            <button
              type="button"
              className="text-yc-orange hover:underline"
              onClick={() => setListStageFilter("all")}
            >
              Clear filter
            </button>
          </div>
        )}
        {!events && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            Loading events...
          </div>
        )}
        {events?.length === 0 && (
          <div className="text-center py-16 text-sm text-yc-text-secondary">
            No events yet. Create one or generate from a cluster.
          </div>
        )}
      </div>
    </div>
  );
}
