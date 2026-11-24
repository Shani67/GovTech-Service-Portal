const zone = "Asia/Colombo";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: typeof value === "string" ? "UTC" : zone,
  }).format(date);
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: zone,
  })
    .format(value)
    .replace(" am", "am")
    .replace(" pm", "pm");
}

/** Combines separate day, month and year inputs into an ISO date, or "" when all are empty. */
export function combineDateParts(day: string, month: string, year: string): string {
  const parts = [day, month, year].map((part) => part.trim());
  if (parts.every((part) => part === "")) return "";
  const [d, m, y] = parts;
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return "invalid";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function splitDate(iso: string): { day: string; month: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return { day: "", month: "", year: "" };
  return { day: String(Number(match[3])), month: String(Number(match[2])), year: match[1] };
}
