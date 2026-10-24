import "server-only";

import { getPlace } from "./places";
import { requireEnv } from "./env";
import { dailyForecast, dateKst, datePlus, isDate, latestIssue, previousIssue, toGrid, type ForecastRow, type Grid, type Issue } from "./weather-model";

const ENDPOINT = "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst";
const TTL = 5 * 60000;
type Forecast = { issue: Issue; rows: ForecastRow[]; fetchedAt: string };
const cache = new Map<string, { expiresAt: number; forecast: Forecast }>();
const pending = new Map<string, Promise<Forecast>>();
export class WeatherError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "WeatherError";
  }
}
class NoDataError extends Error {}

export function parseWeatherQuery(params: URLSearchParams, now = new Date()) {
  for (const name of params.keys()) {
    if (!["placeId", "startDate", "days"].includes(name) || params.getAll(name).length > 1) {
      throw new WeatherError("INVALID_QUERY", 400, "지원하지 않거나 중복된 검색 조건이 있어요.");
    }
  }
  const today = dateKst(now);
  const startDate = params.get("startDate") ?? datePlus(today, 1);
  const rawDays = params.get("days") ?? "3";
  const days = Number(rawDays);
  if (!isDate(startDate) || startDate < today || !/^\d+$/.test(rawDays) || days < 1 || days > 14 || !isDate(datePlus(startDate, days - 1))) {
    throw new WeatherError("INVALID_QUERY", 400, "날짜는 오늘 이후, 기간은 1~14일로 넣어주세요.");
  }
  // 기본 위치는 기존 실제 호출에서 확인한 부산 대표 격자이며 선택 장소가 있으면 그 좌표를 변환한다.
  const id = params.get("placeId");
  const place = id === null ? null : getPlace(id);
  if (id !== null && !place) throw new WeatherError("PLACE_NOT_FOUND", 404, "장소를 찾을 수 없어요.");
  const grid = place ? toGrid(place.lat, place.lng) : { nx: 98, ny: 76 };
  if (!Number.isInteger(grid.nx) || !Number.isInteger(grid.ny) || grid.nx < 1 || grid.nx > 149 || grid.ny < 1 || grid.ny > 253) {
    throw new WeatherError("INVALID_LOCATION", 400, "예보를 조회할 수 없는 장소 좌표예요.");
  }
  return { startDate, days, grid, location: { placeId: place?.id ?? null, name: place?.name ?? "부산 대표 격자", ...grid } };
}

function validateRows(value: unknown, issue: Issue, grid: Grid): ForecastRow[] {
  if (!Array.isArray(value)) throw new Error("invalid rows");
  return value.map((row: ForecastRow) => {
    if (!row || row.baseDate !== issue.date || row.baseTime !== issue.time || row.nx !== grid.nx || row.ny !== grid.ny || typeof row.category !== "string" || typeof row.fcstDate !== "string" || !/^\d{8}$/.test(row.fcstDate) || row.fcstDate < issue.date || !isDate(`${row.fcstDate.slice(0,4)}-${row.fcstDate.slice(4,6)}-${row.fcstDate.slice(6,8)}`) || typeof row.fcstTime !== "string" || !/^(?:[01]\d|2[0-3])00$/.test(row.fcstTime) || !["number", "string"].includes(typeof row.fcstValue)) {
      throw new Error("invalid row");
    }
    return row;
  });
}
async function fetchIssue(issue: Issue, grid: Grid): Promise<Forecast> {
  let key: string;
  try { key = requireEnv("KMA_APIHUB_AUTH_KEY"); }
  catch { throw new WeatherError("WEATHER_NOT_CONFIGURED", 503, "날씨 서비스를 준비 중이에요."); }
  const rows: ForecastRow[] = [];
  let total: number | undefined;
  for (let page = 1; page <= 10; page++) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ authKey: key, dataType: "JSON", base_date: issue.date, base_time: issue.time, nx: String(grid.nx), ny: String(grid.ny), pageNo: String(page), numOfRows: "1000" }).toString();
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("upstream HTTP error");
      const json = await response.json();
      const { header, body } = json.response ?? {};
      if (header?.resultCode === "03" && page === 1) throw new NoDataError();
      if (header?.resultCode !== "00" || !body || !Number.isSafeInteger(body.totalCount) || body.totalCount < 0 || body.totalCount > 10000 || Number(body.pageNo) !== page) throw new Error("invalid response");
      if (total !== undefined && total !== body.totalCount) throw new Error("inconsistent page count");
      total = Number(body.totalCount);
      if (total === 0 && page === 1) throw new NoDataError();
      const batch = validateRows(body.items?.item, issue, grid);
      if (!batch.length || rows.length + batch.length > total) throw new Error("incomplete page");
      rows.push(...batch);
      if (rows.length === total) {
        const ids = new Set(rows.map((r) => `${r.fcstDate}/${r.fcstTime}/${r.category}`));
        if (ids.size !== rows.length) throw new Error("duplicate rows");
        return { issue, rows, fetchedAt: new Date().toISOString() };
      }
    } catch (error) {
      if (error instanceof NoDataError) throw error;
      // fetch 오류·응답 본문에는 키가 포함될 수 있다. 원래 오류와 URL은 외부로 넘기거나 출력하지 않는다.
      throw new WeatherError("WEATHER_UNAVAILABLE", 502, "날씨를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }
  throw new WeatherError("WEATHER_UNAVAILABLE", 502, "날씨를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
}

async function loadForecast(grid: Grid, now: Date): Promise<Forecast> {
  const issue = latestIssue(now);
  const id = `${grid.nx}/${grid.ny}/${issue.date}/${issue.time}`;
  const existing = cache.get(id);
  if (existing && existing.expiresAt > now.getTime()) return existing.forecast;
  if (pending.has(id)) return pending.get(id)!;
  const task = (async () => {
    let result: Forecast;
    try { result = await fetchIssue(issue, grid); }
    catch (error) {
      if (!(error instanceof NoDataError)) throw error;
      // 최신 발표의 NO_DATA만 직전 발표로 한 번 대체. 실제 사용한 발표시각을 그대로 반환한다.
      try { result = await fetchIssue(previousIssue(issue), grid); }
      catch (previousError) {
        if (previousError instanceof WeatherError) throw previousError;
        throw new WeatherError("WEATHER_UNAVAILABLE", 502, "날씨를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    }
    for (const [key, value] of cache) if (value.expiresAt <= now.getTime()) cache.delete(key);
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(id, { expiresAt: Date.now() + TTL, forecast: result });
    return result;
  })();
  pending.set(id, task);
  try { return await task; } finally { pending.delete(id); }
}

export async function getWeather(params: URLSearchParams, now = new Date()) {
  const query = parseWeatherQuery(params, now);
  const forecast = await loadForecast(query.grid, now);
  const date = forecast.issue.date;
  return {
    location: query.location,
    source: { name: "기상청 단기예보", url: "https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286" },
    issuedAt: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${forecast.issue.time.slice(0,2)}:00:00+09:00`,
    fetchedAt: forecast.fetchedAt,
    days: dailyForecast(forecast.rows, query.startDate, query.days),
  };
}
