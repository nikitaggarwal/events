/** Ops / events UI: show completed first so past outcomes are visible immediately. */

const STATUS_ORDER: Record<string, number> = {
  completed: 0,
  active: 1,
  planning: 2,
  draft: 3,
};

export function eventStatusRank(status: string): number {
  return STATUS_ORDER[status] ?? 99;
}

function dateDesc(a: Date | null | undefined, b: Date | null | undefined): number {
  const ta = a instanceof Date ? a.getTime() : 0;
  const tb = b instanceof Date ? b.getTime() : 0;
  return tb - ta;
}

/** Completed → active → planning → draft; within each tier, newest date first. */
export function compareEventsByStatusThenDateDesc(
  a: { status: string; date: Date | null },
  b: { status: string; date: Date | null },
): number {
  const ra = eventStatusRank(a.status);
  const rb = eventStatusRank(b.status);
  if (ra !== rb) return ra - rb;
  return dateDesc(a.date, b.date);
}
