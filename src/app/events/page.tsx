"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";

interface Event {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  status: string;
  cluster: { id: string; name: string } | null;
  candidates: { id: string; inviteStatus: string }[];
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "green" | "orange" | "blue" | "neutral"> = {
  draft: "neutral",
  planning: "blue",
  active: "orange",
  completed: "green",
};

export default function EventsPage() {
  const { data: events, mutate } = useSWR<Event[]>("/api/events", fetcher);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

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
        {events?.map((event) => {
          const rsvp = event.candidates.filter(
            (c) => c.inviteStatus === "rsvp"
          ).length;
          const contacted = event.candidates.filter(
            (c) => c.inviteStatus === "contacted"
          ).length;

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block bg-white border border-yc-border rounded-lg p-5 hover:border-yc-orange/30 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
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
                </div>
                <div className="flex items-center gap-4 text-xs text-yc-text-secondary">
                  <div className="text-center">
                    <div className="text-base font-semibold text-yc-dark">
                      {event.candidates.length}
                    </div>
                    <div>sourced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold text-yc-blue">
                      {contacted}
                    </div>
                    <div>contacted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold text-yc-green">
                      {rsvp}
                    </div>
                    <div>RSVP</div>
                  </div>
                  <button
                    onClick={(e) => deleteEvent(e, event.id)}
                    className="ml-2 p-1.5 text-yc-text-secondary/40 hover:text-red-500 transition-colors rounded"
                    title="Delete event"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
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
