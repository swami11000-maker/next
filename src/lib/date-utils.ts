export const INDIAN_TIMEZONE = "Asia/Kolkata";

export function formatIndianDateTime(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: INDIAN_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

export function formatIndianDate(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    timeZone: INDIAN_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatIndianTime(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    timeZone: INDIAN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}
