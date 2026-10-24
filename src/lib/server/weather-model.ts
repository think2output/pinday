import "server-only";

export type Grid = { nx: number; ny: number };
export type Issue = { date: string; time: string };
export type ForecastRow = {
  baseDate: string; baseTime: string; category: string;
  fcstDate: string; fcstTime: string; fcstValue: string | number;
  nx: number; ny: number;
};
const DAY = 86400000;
const KST = 9 * 3600000;
export const dateKst = (now: Date) => new Date(now.getTime() + KST).toISOString().slice(0, 10);
export const datePlus = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
export function isDate(value: string) {
  const ms = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
export function latestIssue(now: Date): Issue {
  // 공식 API 제공 시각: 발표 10분 후. KST 02/05/08/11/14/17/20/23시.
  const ready = new Date(now.getTime() + KST - 10 * 60000);
  const hour = [23, 20, 17, 14, 11, 8, 5, 2].find((h) => h <= ready.getUTCHours());
  if (hour === undefined) ready.setUTCDate(ready.getUTCDate() - 1);
  return { date: ready.toISOString().slice(0,10).replaceAll("-", ""), time: `${String(hour ?? 23).padStart(2,"0")}00` };
}
export function previousIssue(issue: Issue): Issue {
  const raw = `${issue.date.slice(0,4)}-${issue.date.slice(4,6)}-${issue.date.slice(6,8)}T${issue.time.slice(0,2)}:00:00+09:00`;
  return latestIssue(new Date(Date.parse(raw) - 3 * 3600000 + 10 * 60000));
}
export function toGrid(lat: number, lng: number): Grid {
  // 기상청 260623 활용가이드의 Lambert 정각원추도법 C 예제와 1부터 시작하는 격자 변환.
  const rad = Math.PI / 180;
  const re = 6371.00877 / 5;
  const lat1 = 30 * rad, lat2 = 60 * rad;
  const sn = Math.log(Math.cos(lat1) / Math.cos(lat2)) / Math.log(Math.tan(Math.PI/4 + lat2/2) / Math.tan(Math.PI/4 + lat1/2));
  const sf = Math.pow(Math.tan(Math.PI/4 + lat1/2), sn) * Math.cos(lat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI/4 + 38*rad/2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI/4 + lat*rad/2), sn);
  const theta = (lng - 126) * rad * sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 42 + 1.5), ny: Math.floor(ro - ra * Math.cos(theta) + 135 + 1.5) };
}

function numeric(value: string | number | undefined, min: number, max: number) {
  if (value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > -900 && number < 900 && number >= min && number <= max ? number : null;
}
function code(value: string | number | undefined, allowed: number[]) {
  const number = numeric(value, 0, 10);
  return number !== null && allowed.includes(number) ? number : null;
}
const weatherCategories = new Set(["TMP", "SKY", "PTY", "POP"]);
export function dailyForecast(rows: ForecastRow[], startDate: string, days: number) {
  const grouped = new Map<string, Map<string, Record<string, string | number>>>();
  const dailyTemps = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    const date = `${row.fcstDate.slice(0,4)}-${row.fcstDate.slice(4,6)}-${row.fcstDate.slice(6,8)}`;
    if (row.category === "TMN" || row.category === "TMX") {
      const temperatures = dailyTemps.get(date) ?? {};
      temperatures[row.category] = row.fcstValue;
      dailyTemps.set(date, temperatures);
    }
    if (!weatherCategories.has(row.category)) continue;
    const slots = grouped.get(date) ?? new Map();
    const slot = slots.get(row.fcstTime) ?? {};
    slot[row.category] = row.fcstValue;
    slots.set(row.fcstTime, slot);
    grouped.set(date, slots);
  }
  const dates = [...grouped.keys()].sort();
  const lastDate = dates.at(-1) ?? null;
  return Array.from({ length: days }, (_, index) => {
    const date = datePlus(startDate, index);
    const slots = grouped.get(date);
    const periods = [...(slots?.entries() ?? [])].sort(([a],[b]) => a.localeCompare(b)).map(([time, values]) => ({
      time: `${time.slice(0,2)}:${time.slice(2,4)}`,
      temperature: numeric(values.TMP, -100, 100),
      precipitationProbability: numeric(values.POP, 0, 100),
      precipitationType: code(values.PTY, [0,1,2,3,4]),
      sky: code(values.SKY, [1,3,4]),
    }));
    const hasRain = periods.some((p) => p.precipitationType !== null && [1,2,4].includes(p.precipitationType));
    const hasSnow = periods.some((p) => p.precipitationType !== null && [2,3].includes(p.precipitationType));
    const complete = periods.length > 0 && periods.every((p) => p.precipitationType !== null && p.sky !== null);
    const usable = periods.some((p) => p.precipitationType !== null || p.sky !== null);
    const sky = Math.max(...periods.map((p) => p.sky ?? 0));
    const condition = hasRain && hasSnow ? "rain-snow" : hasRain ? "rain" : hasSnow ? "snow" : !complete ? "unknown" : sky === 4 ? "overcast" : sky === 3 ? "cloudy" : "clear";
    const probabilities = periods.map((p) => p.precipitationProbability).filter((p) => p !== null);
    return {
      date,
      status: usable ? "forecast" : lastDate && date > lastDate ? "not-forecast" : "unavailable",
      condition,
      precipitationExpected: hasRain || hasSnow ? true : periods.length > 0 && periods.every((p) => p.precipitationType === 0) ? false : null,
      maxPrecipitationProbability: probabilities.length ? Math.max(...probabilities) : null,
      minTemperature: numeric(dailyTemps.get(date)?.TMN, -100, 100),
      maxTemperature: numeric(dailyTemps.get(date)?.TMX, -100, 100),
      periods,
    };
  });
}
