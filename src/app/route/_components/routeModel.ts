// 어떻게 갈까? 화면의 순수 계산.
import type { LegState } from "./useRouteLegs";

/** 28분, 1시간 5분, 2시간 */
export function minutesLabel(total: number): string {
  const hours = Math.floor(total / 60), minutes = total % 60;
  if (!hours) return `${minutes}분`;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

/** 카카오맵 길찾기 URL (https://apis.map.kakao.com/web/guide/#routeurl) */
export function kakaoRouteUrl(mode: "traffic" | "walk", from: { name: string; lat: number; lng: number }, to: { name: string; lat: number; lng: number }): string {
  const point = (place: { name: string; lat: number; lng: number }) => `${encodeURIComponent(place.name.replaceAll(",", " ").replaceAll("/", " "))},${place.lat},${place.lng}`;
  return `https://map.kakao.com/link/by/${mode}/${point(from)}/${point(to)}`;
}

/** 맨 위 한 줄: 이동 합계. 찾는 중이거나 못 찾은 구간은 합계에 넣지 않고 따로 알린다 */
export function daySummary(states: LegState[]): { title: string; detail: string } {
  if (states.some((state) => state.kind === "loading")) return { title: "찾는 중", detail: "" };
  const legs = states.flatMap((state) => (state.kind === "ready" ? [state.leg] : []));
  const failed = states.length - legs.length;
  if (!legs.length) return { title: "확인하지 못했어요", detail: "카카오맵에서 구간별로 확인해주세요" };
  const minutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
  const transit = legs.filter((leg) => leg.kind === "transit").length;
  const parts = [
    transit ? `대중교통 ${transit}번` : "",
    legs.length - transit ? `걸어서 ${legs.length - transit}번` : "",
    failed ? `못 찾은 구간 ${failed}개 빼고` : "",
  ].filter(Boolean);
  return { title: `${failed ? "약 " : ""}${minutesLabel(minutes)}`, detail: parts.join(" · ") };
}
