// 날짜는 "YYYY-MM-DD" 문자열로 다룬다. 시간대 때문에 하루가 밀리지 않도록 UTC 기준으로 계산한다.

export const MAX_TRIP_DAYS = 14;

/** 사용자 기기 기준 오늘 */
export function todayLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** 출발일부터 도착일까지 일수 (같은 날이면 1) */
export function dayCount(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** n일차(1부터)의 날짜 */
export function dateOfDay(startDate: string, day: number): string {
  return addDays(startDate, day - 1);
}

export type PeriodError = "invalid" | "past" | "end-before-start" | "too-long";

export function validatePeriod(startDate: string, endDate: string, today: string): PeriodError | null {
  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
  if (!isDate(startDate) || !isDate(endDate)) return "invalid";
  if (startDate < today) return "past";
  if (endDate < startDate) return "end-before-start";
  if (dayCount(startDate, endDate) > MAX_TRIP_DAYS) return "too-long";
  return null;
}
