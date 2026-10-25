import "server-only";

import { getPlace } from "./places";
import { requireEnv } from "./env";
import { parseTransit, parseWalk, type RouteLeg } from "./route-model";
import { canMapPlace } from "../../app/explore/_components/mapCoordinates";

// 같은 구간은 서버에서 다시 쓴다. 앱별 이용 한도는 카카오 앱 관리 화면에서 확인한다.
const TRANSIT = "https://dapi.kakao.com/v2/routing/publictraffic";
const WALK = "https://dapi.kakao.com/v2/routing/walk";
const TTL = 6 * 60 * 60000;
const cache = new Map<string, { expiresAt: number; leg: RouteLeg }>();
const pending = new Map<string, Promise<RouteLeg>>();

export class RouteError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "RouteError";
  }
}

const UNAVAILABLE = () => new RouteError("ROUTE_UNAVAILABLE", 502, "경로를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");

export function parseRouteQuery(params: URLSearchParams) {
  for (const name of params.keys()) {
    if (!["from", "to"].includes(name) || params.getAll(name).length > 1) {
      throw new RouteError("INVALID_QUERY", 400, "지원하지 않거나 중복된 검색 조건이 있어요.");
    }
  }
  const fromId = params.get("from"), toId = params.get("to");
  if (!fromId || !toId || fromId === toId) throw new RouteError("INVALID_QUERY", 400, "서로 다른 출발 장소와 도착 장소를 넣어주세요.");
  const from = getPlace(fromId), to = getPlace(toId);
  if (!from || !to) throw new RouteError("PLACE_NOT_FOUND", 404, "장소를 찾을 수 없어요.");
  if (!canMapPlace(from) || !canMapPlace(to)) throw new RouteError("INVALID_LOCATION", 422, "지도 위치를 확인할 수 없는 장소라 경로를 찾을 수 없어요.");
  return { from, to };
}

async function call(endpoint: string, key: string, params: Record<string, string>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${endpoint}?${new URLSearchParams(params)}`, { headers: { Authorization: `KakaoAK ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    // fetch 오류에는 요청 정보가 담길 수 있어 원래 오류는 넘기지 않는다.
    throw UNAVAILABLE();
  }
  if (response.status === 429) throw new RouteError("ROUTE_QUOTA", 429, "오늘 경로를 찾을 수 있는 횟수를 다 썼어요. 카카오맵에서 확인해주세요.");
  if (!response.ok) throw UNAVAILABLE();
  return response.json().catch(() => { throw UNAVAILABLE(); });
}

async function fetchLeg(from: { lat: number; lng: number; name: string }, to: { lat: number; lng: number; name: string }): Promise<RouteLeg> {
  let key: string;
  try { key = requireEnv("KAKAO_REST_API_KEY"); }
  catch { throw new RouteError("ROUTE_NOT_CONFIGURED", 503, "길찾기를 준비 중이에요."); }
  const params = {
    start_x: String(from.lng), start_y: String(from.lat), s_name: from.name,
    end_x: String(to.lng), end_y: String(to.lat), e_name: to.name,
  };
  // 카카오가 맨 앞에 준 대중교통 경로를 쓰고, 너무 가까워 결과가 없으면 걷는 길로 다시 찾는다.
  const transit = parseTransit(await call(TRANSIT, key, params));
  if (transit) return transit;
  const walk = parseWalk(await call(WALK, key, params));
  if (walk) return walk;
  throw new RouteError("ROUTE_NOT_FOUND", 404, "이 구간은 경로를 찾지 못했어요. 카카오맵에서 확인해주세요.");
}

export async function getRoute(params: URLSearchParams, now = Date.now()) {
  const { from, to } = parseRouteQuery(params);
  const id = `${from.id}>${to.id}`;
  const cached = cache.get(id);
  if (cached && cached.expiresAt > now) return { from: from.id, to: to.id, leg: cached.leg };
  if (!pending.has(id)) {
    pending.set(id, fetchLeg(from, to).then((leg) => {
      for (const [key, value] of cache) if (value.expiresAt <= now) cache.delete(key);
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(id, { expiresAt: Date.now() + TTL, leg });
      return leg;
    }).finally(() => pending.delete(id)));
  }
  return { from: from.id, to: to.id, leg: await pending.get(id)! };
}
