// Minimal .ics parser for VEVENT entries (SUMMARY, DTSTART, DTEND).
export type ICalEvent = {
  title: string;
  start: Date;
  end?: Date;
};

function parseDate(value: string): Date | null {
  // forms: 20260415T140000Z, 20260415T140000, 20260415
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : ""}`;
  const dt = new Date(iso);
  return isNaN(+dt) ? null : dt;
}

export function parseICS(text: string): ICalEvent[] {
  // unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: ICalEvent[] = [];
  let cur: Partial<ICalEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur && cur.title && cur.start) events.push(cur as ICalEvent);
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).split(";")[0];
      const val = line.slice(idx + 1);
      if (key === "SUMMARY") cur.title = val;
      else if (key === "DTSTART") {
        const d = parseDate(val);
        if (d) cur.start = d;
      } else if (key === "DTEND") {
        const d = parseDate(val);
        if (d) cur.end = d;
      }
    }
  }
  return events;
}