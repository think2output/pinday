// 언제 갈까? 화면의 순수 계산. 저장 규칙은 src/lib/trip/rules.ts를 그대로 쓰고 여기서는 표시만 계산한다.
import { addDays, dayCount } from "../../../lib/trip/dates";
import { canMapPlace } from "../../explore/_components/mapCoordinates";

export type SchedulePlace = { id: string; name: string; region: string; category: string; lat: number; lng: number };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "10.24 (토)" */
export function shortDate(date: string): string {
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${date.slice(5, 7)}.${date.slice(8, 10)} (${weekday})`;
}

/** 지도에 찍을 수 있는 장소만, 일정 순서 번호(1부터)를 유지한 채로 고른다 */
export function mapStops(ids: string[], places: Record<string, SchedulePlace>) {
  return ids.flatMap((id, index) => {
    const place = places[id];
    return place && canMapPlace(place) ? [{ no: index + 1, place }] : [];
  });
}

/** 좌표가 없거나 잘못돼 지도에서 뺀 장소의 순서 번호 */
export function unmappedNumbers(ids: string[], places: Record<string, SchedulePlace>): number[] {
  return ids.flatMap((id, index) => (places[id] && canMapPlace(places[id]) ? [] : [index + 1]));
}

/**
 * 날씨 API 요청 범위. API는 오늘 이후만 받으므로 이미 지난 날은 빼고, 여행이 모두 지났으면 null.
 * 최대 14일은 여행 기간 규칙과 같다.
 */
export function weatherRequest(startDate: string, endDate: string, today: string): { startDate: string; days: number } | null {
  if (endDate < today) return null;
  const from = startDate < today ? today : startDate;
  return { startDate: from, days: Math.min(14, dayCount(from, endDate)) };
}

export type WeatherDay = {
  date: string;
  status: "forecast" | "not-forecast" | "unavailable";
  condition: "clear" | "cloudy" | "overcast" | "rain" | "snow" | "rain-snow" | "unknown";
  precipitationExpected: boolean | null;
  maxPrecipitationProbability: number | null;
};
export type WeatherResponse = { location: { name: string; nx: number; ny: number }; issuedAt: string; days: WeatherDay[] };
export type WeatherState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "none" }
  | { kind: "ready"; data: WeatherResponse };

export type DayWeather = { text: string; rain: boolean; description: string };

/** 날짜 탭에 붙일 강수 표시. 예보 전·자료 없음·실패를 '비 없음'으로 바꾸지 않는다 */
export function dayWeather(date: string, today: string, state: WeatherState): DayWeather {
  if (date < today) return { text: "지난 날짜", rain: false, description: "지난 날짜라 예보가 없어요" };
  if (state.kind === "loading") return { text: "날씨 확인 중", rain: false, description: "날씨를 확인하고 있어요" };
  if (state.kind === "error") return { text: "날씨 확인 실패", rain: false, description: "날씨를 불러오지 못했어요" };
  const day = state.kind === "ready" ? state.data.days.find((entry) => entry.date === date) : undefined;
  if (!day || day.status === "not-forecast") return { text: "예보 전", rain: false, description: "아직 예보가 나오지 않았어요" };
  if (day.status === "unavailable") return { text: "예보 자료 없음", rain: false, description: "이 날 예보 자료가 비어 있어요" };
  if (day.precipitationExpected === true) {
    const kind = day.condition === "snow" ? "눈" : day.condition === "rain-snow" ? "비·눈" : "비";
    return { text: `☂ ${kind} 예보`, rain: true, description: `${kind} 예보가 있어요` };
  }
  if (day.precipitationExpected === false) return { text: "비 예보 없음", rain: false, description: "받은 예보 시각에는 비·눈 예보가 없어요" };
  return { text: "강수 확인 어려움", rain: false, description: "예보 자료 일부가 비어 강수를 판단하기 어려워요" };
}

/** "10.25 20시 발표" */
export function issuedLabel(issuedAt: string): string {
  return `${issuedAt.slice(5, 7)}.${issuedAt.slice(8, 10)} ${Number(issuedAt.slice(11, 13))}시 발표`;
}

export const NEARBY_KM = 2;

/** 두 좌표의 직선거리(km). 길찾기 거리가 아니다 */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "약 800m" / "약 1.4km" */
export function distanceLabel(km: number): string {
  return km < 1 ? `약 ${Math.max(100, Math.round(km * 10) * 100)}m` : `약 ${km.toFixed(1)}km`;
}

/** 그날 장소 중 가장 가까운 곳과 거리. 좌표가 잘못된 곳은 기준으로 쓰지 않는다 */
export function nearestAnchor(target: SchedulePlace | undefined, dayIds: string[], places: Record<string, SchedulePlace>) {
  if (!target || !canMapPlace(target)) return null;
  let best: { anchor: SchedulePlace; km: number } | null = null;
  for (const id of dayIds) {
    const anchor = places[id];
    if (!anchor || anchor.id === target.id || !canMapPlace(anchor)) continue;
    const km = distanceKm(anchor, target);
    if (!best || km < best.km) best = { anchor, km };
  }
  return best;
}

/** 아직 담지 않은 곳 중 그날 장소에서 직선 NEARBY_KM 안의 가까운 순 */
export function nearbySuggestions(dayIds: string[], taken: Set<string>, places: Record<string, SchedulePlace>, limit = 3) {
  return Object.values(places)
    .filter((place) => !taken.has(place.id))
    .flatMap((place) => {
      const near = nearestAnchor(place, dayIds, places);
      return near && near.km <= NEARBY_KM ? [{ place, ...near }] : [];
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** 날짜 없는 곳: 그날 장소와 가까운 곳을 앞으로, 나머지는 담은 순서 그대로 */
export function sortByCloseness(ids: string[], dayIds: string[], places: Record<string, SchedulePlace>) {
  const entries = ids.map((id, order) => {
    const near = nearestAnchor(places[id], dayIds, places);
    return { id, order, near: near && near.km <= NEARBY_KM ? near : null };
  });
  return entries.sort((a, b) => (a.near && b.near ? a.near.km - b.near.km : a.near ? -1 : b.near ? 1 : a.order - b.order));
}

/** 탭 날짜 목록: n일차 → 날짜 */
export function tripDates(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(startDate, index));
}
