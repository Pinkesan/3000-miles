// Day numbers (DESIGN §5): days since 1970-01-01 of the local date, with a 4 a.m. rollover.

export const ROLLOVER_HOUR = 4;

export function dayNumber(date = new Date(), rolloverHour = ROLLOVER_HOUR) {
  const d = new Date(date.getTime() - rolloverHour * 3600000);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}

export function dayToDate(day) {
  const u = new Date(day * 86400000);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12, 0, 0);
}

export function daysBetween(a, b) {
  return b - a;
}
