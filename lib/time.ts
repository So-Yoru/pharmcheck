export function parseSqliteUtc(value: string): number {
  if (!value) return Date.now();
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

export function minutesSince(value: string): number {
  return Math.max(1, Math.round((Date.now() - parseSqliteUtc(value)) / 60000));
}

export function formatRelativeFromSqlite(value: string): string {
  const diffMs = Math.max(0, Date.now() - parseSqliteUtc(value));
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatDateTimeFromSqlite(value: string): string {
  const date = new Date(parseSqliteUtc(value));
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}
