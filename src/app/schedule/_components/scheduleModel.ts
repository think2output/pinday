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

/** 탭 날짜 목록: n일차 → 날짜 */
export function tripDates(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(startDate, index));
}
