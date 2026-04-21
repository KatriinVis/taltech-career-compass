export type FitResult =
  | { status: "fits" }
  | { status: "conflicts"; with: string[] }
  | { status: "unknown" };

type CourseLike = {
  day?: number | null;
  start?: string | null;
  end?: string | null;
};

type EventLike = {
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  title: string;
};

function toMin(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function checkFit(course: CourseLike, events: EventLike[]): FitResult {
  const day = course.day ?? null;
  const cStart = toMin(course.start);
  const cEnd = toMin(course.end) ?? (cStart != null ? cStart + 120 : null);
  if (day == null || cStart == null || cEnd == null) return { status: "unknown" };

  const conflicts = new Set<string>();
  const now = Date.now();

  for (const ev of events) {
    // Recurring class
    if (ev.day_of_week != null && ev.start_time) {
      if (ev.day_of_week === day) {
        const eS = toMin(ev.start_time);
        const eE = toMin(ev.end_time) ?? (eS != null ? eS + 120 : null);
        if (eS != null && eE != null && overlap(cStart, cEnd, eS, eE)) {
          conflicts.add(ev.title);
        }
      }
      continue;
    }
    // One-off
    if (ev.starts_at) {
      const start = new Date(ev.starts_at);
      if (isNaN(start.getTime())) continue;
      if (start.getTime() < now) continue;
      // JS getDay: 0=Sun..6=Sat. Our day uses 1=Mon..7=Sun.
      const jsDay = start.getDay();
      const evDay = jsDay === 0 ? 7 : jsDay;
      if (evDay !== day) continue;
      const eS = start.getHours() * 60 + start.getMinutes();
      const end = ev.ends_at ? new Date(ev.ends_at) : null;
      const eE = end && !isNaN(end.getTime())
        ? end.getHours() * 60 + end.getMinutes()
        : eS + 60;
      if (overlap(cStart, cEnd, eS, eE)) {
        conflicts.add(ev.title);
      }
    }
  }

  if (conflicts.size === 0) return { status: "fits" };
  return { status: "conflicts", with: [...conflicts] };
}
