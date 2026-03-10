"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { mutate } from "swr";

export interface Operation {
  id: string;
  type: "scrape" | "cluster-role" | "cluster-domain" | "source";
  status: "running" | "done" | "error";
  message: string;
  startedAt: number;
}

interface OperationsContextType {
  operations: Operation[];
  runScrape: () => void;
  runClustering: (k: number) => void;
  runDomainClustering: (k: number) => void;
  runSourceCandidates: (clusterId: string, eventId: string) => void;
  dismiss: (id: string) => void;
  isRunning: (type: Operation["type"]) => boolean;
}

const OperationsContext = createContext<OperationsContextType | null>(null);

export function useOperations() {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error("useOperations must be inside OperationsProvider");
  return ctx;
}

let opCounter = 0;

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const opsRef = useRef(operations);
  opsRef.current = operations;

  const upsert = useCallback((id: string, patch: Partial<Operation>) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, ...patch } : op))
    );
  }, []);

  const add = useCallback((type: Operation["type"], message: string) => {
    const id = `${type}-${++opCounter}`;
    const op: Operation = { id, type, status: "running", message, startedAt: Date.now() };
    setOperations((prev) => [...prev, op]);
    return id;
  }, []);

  const revalidateAll = useCallback(() => {
    mutate(
      (key) => typeof key === "string" && (
        key.startsWith("/api/stats") ||
        key.startsWith("/api/scrape") ||
        key.startsWith("/api/cluster") ||
        key.startsWith("/api/events")
      ),
      undefined,
      { revalidate: true }
    );
  }, []);

  const isRunning = useCallback(
    (type: Operation["type"]) => opsRef.current.some((op) => op.type === type && op.status === "running"),
    []
  );

  const runScrape = useCallback(() => {
    if (isRunning("scrape")) return;
    const id = add("scrape", "Scraping WaaS + YC Directory for SF Bay Area jobs...");
    (async () => {
      try {
        const res = await fetch("/api/scrape", { method: "POST" });
        const data = await res.json();
        upsert(id, {
          status: "done",
          message: `Found ${data.total} listings (${data.fromWaaS} WaaS, ${data.fromYCDirectory} YC Dir). ${data.created} new, ${data.skipped} skipped.`,
        });
        revalidateAll();
      } catch (err) {
        upsert(id, { status: "error", message: `Scrape failed: ${err}` });
      }
    })();
  }, [add, upsert, revalidateAll, isRunning]);

  const runClustering = useCallback(
    (k: number) => {
      if (isRunning("cluster-role")) return;
      const id = add("cluster-role", "Embedding jobs and clustering by role...");
      (async () => {
        try {
          const res = await fetch("/api/cluster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ k }),
          });
          const data = await res.json();
          if (data.error) {
            upsert(id, { status: "error", message: `Clustering error: ${data.error}` });
          } else {
            upsert(id, { status: "done", message: `Created ${data.clusterCount} role clusters.` });
            revalidateAll();
          }
        } catch (err) {
          upsert(id, { status: "error", message: `Clustering failed: ${err}` });
        }
      })();
    },
    [add, upsert, revalidateAll, isRunning]
  );

  const runDomainClustering = useCallback(
    (k: number) => {
      if (isRunning("cluster-domain")) return;
      const id = add("cluster-domain", "Embedding companies and clustering by domain...");
      (async () => {
        try {
          const res = await fetch("/api/cluster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "domain", k }),
          });
          const data = await res.json();
          if (data.error) {
            upsert(id, { status: "error", message: `Domain clustering error: ${data.error}` });
          } else {
            upsert(id, { status: "done", message: `Created ${data.clusterCount} domain clusters.` });
            revalidateAll();
          }
        } catch (err) {
          upsert(id, { status: "error", message: `Domain clustering failed: ${err}` });
        }
      })();
    },
    [add, upsert, revalidateAll, isRunning]
  );

  const runSourceCandidates = useCallback(
    (clusterId: string, eventId: string) => {
      if (isRunning("source")) return;
      const id = add("source", "Sourcing candidates via Exa...");
      (async () => {
        try {
          const res = await fetch("/api/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clusterId, eventId }),
          });
          const data = await res.json();
          if (data.success) {
            upsert(id, { status: "done", message: `Sourced ${data.count} candidates.` });
            mutate(
              (key) => typeof key === "string" && (
                key.startsWith("/api/events") ||
                key.startsWith("/api/candidates")
              ),
              undefined,
              { revalidate: true }
            );
          } else {
            upsert(id, { status: "error", message: `Sourcing error: ${data.error || "Unknown"}` });
          }
        } catch (err) {
          upsert(id, { status: "error", message: `Sourcing failed: ${err}` });
        }
      })();
    },
    [add, upsert, isRunning]
  );

  const dismiss = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  return (
    <OperationsContext.Provider
      value={{ operations, runScrape, runClustering, runDomainClustering, runSourceCandidates, dismiss, isRunning }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function OperationsBanner() {
  const { operations, dismiss } = useOperations();
  const [now, setNow] = useState(Date.now());

  const hasRunning = operations.some((op) => op.status === "running");

  useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasRunning]);

  const visible = operations.filter((op) => op.status === "running" || Date.now() - op.startedAt < 30000);
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 md:left-60 z-50 flex flex-col gap-1 p-2 pointer-events-none">
      {visible.map((op) => {
        const elapsed = Math.max(0, Math.floor((now - op.startedAt) / 1000));
        const isRunning = op.status === "running";
        const isError = op.status === "error";
        return (
          <div
            key={op.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm shadow-lg border backdrop-blur-sm ${
              isError
                ? "bg-red-50/95 border-red-200 text-red-800"
                : isRunning
                ? "bg-yc-orange-light/95 border-yc-orange/20 text-yc-dark"
                : "bg-green-50/95 border-green-200 text-green-800"
            }`}
          >
            {isRunning && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yc-orange opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yc-orange" />
              </span>
            )}
            <span className="flex-1 truncate">{op.message}</span>
            {isRunning && (
              <span className="text-xs text-yc-text-secondary font-mono tabular-nums shrink-0">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            )}
            {!isRunning && (
              <button
                onClick={() => dismiss(op.id)}
                className="text-xs opacity-60 hover:opacity-100 shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
