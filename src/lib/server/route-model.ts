// 카카오맵 경로 API 응답을 화면용 구간으로 바꾸는 순수 계산. 응답 규격: https://developers.kakao.com/docs/ko/kakaomap/rest-api
// 대중교통 응답에는 출발지→첫 정류장, 마지막 정류장→도착지 걷는 길이 없다(카카오 데브톡 답변). 그래서 지도에는 그 부분을 따로 잇는다.

export type RouteStep = { type: "BUS" | "SUBWAY" | "WALKING"; minutes: number; names: string[]; board: string | null; alight: string | null; stopCount: number };
export type RouteLine = { type: "BUS" | "SUBWAY" | "WALKING"; points: [number, number][] };
export type RouteLeg =
  | { kind: "transit"; minutes: number; transfers: number; steps: RouteStep[]; lines: RouteLine[] }
  | { kind: "walk"; minutes: number; meters: number; steps: []; lines: RouteLine[] };

const STEP_TYPES = new Set(["BUS", "SUBWAY", "WALKING"]);
const toMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/** [x, y] 좌표를 지도용 [위도, 경도]로, 점이 많으면 솎아낸다 */
export function toLatLng(points: unknown, every = 2): [number, number][] {
  if (!Array.isArray(points)) return [];
  const valid = points.filter((point): point is [number, number] =>
    Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  return valid
    .filter((_, index) => index % every === 0 || index === valid.length - 1)
    .map(([x, y]) => [Math.round(y * 1e5) / 1e5, Math.round(x * 1e5) / 1e5]);
}

/** 대중교통 응답에서 카카오가 맨 앞에 준 경로 하나. 결과가 없으면 null */
export function parseTransit(body: unknown): RouteLeg | null {
  const data = body as { status?: string; routes?: { properties?: { totalTime?: number; transfers?: number }; steps?: unknown[] }[] } | null;
  if (data?.status !== "OK") return null;
  const route = data.routes?.[0];
  const total = route?.properties?.totalTime;
  if (!route || !Number.isFinite(total) || !Array.isArray(route.steps) || route.steps.length === 0) return null;
  const steps: RouteStep[] = [];
  const lines: RouteLine[] = [];
  for (const raw of route.steps) {
    const step = raw as { properties?: { type?: string; time?: number; stops?: { name?: string }[]; vehicles?: { name?: string }[] }; path?: { points?: unknown } };
    const type = step.properties?.type;
    if (!type || !STEP_TYPES.has(type)) return null;
    const stops = (step.properties?.stops ?? []).map((stop) => stop?.name).filter((name): name is string => typeof name === "string" && name.length > 0);
    steps.push({
      type: type as RouteStep["type"],
      minutes: toMinutes(Number(step.properties?.time) || 0),
      names: (step.properties?.vehicles ?? []).map((vehicle) => vehicle?.name).filter((name): name is string => typeof name === "string" && name.length > 0),
      board: stops[0] ?? null,
      alight: stops.at(-1) ?? null,
      stopCount: Math.max(0, stops.length - 1),
    });
    lines.push({ type: type as RouteLine["type"], points: toLatLng(step.path?.points) });
  }
  if (!steps.some((step) => step.type !== "WALKING")) return null;
  return { kind: "transit", minutes: toMinutes(total!), transfers: Math.max(0, Number(route.properties?.transfers) || 0), steps, lines };
}

/** 도보 응답. 결과가 없으면 null */
export function parseWalk(body: unknown): RouteLeg | null {
  const data = body as { status?: string; route?: { properties?: { totalTime?: number; totalDistance?: number }; legs?: { steps?: { path?: { points?: unknown } }[] }[] } } | null;
  if (data?.status !== "OK" || !data.route) return null;
  const { totalTime, totalDistance } = data.route.properties ?? {};
  if (!Number.isFinite(totalTime) || !Number.isFinite(totalDistance)) return null;
  const points = (data.route.legs ?? []).flatMap((leg) => (leg.steps ?? []).flatMap((step) => (Array.isArray(step.path?.points) ? step.path.points : [])));
  return { kind: "walk", minutes: toMinutes(totalTime!), meters: Math.round(totalDistance!), steps: [], lines: [{ type: "WALKING", points: toLatLng(points, 1) }] };
}
