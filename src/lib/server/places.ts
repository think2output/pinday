import "server-only";

import placesData from "../../../data/places/places.json";
import type { TasteId } from "../trip/types";

export type Place = (typeof placesData)[number];
type Bounds = { west: number; south: number; east: number; north: number };
type PlaceQuery = {
  regions: string[];
  categories: string[];
  q: string;
  indoor?: boolean;
  taste?: TasteId;
  sort: "name" | "taste";
  bounds?: Bounds;
  offset: number;
  limit: number;
};

const places: readonly Place[] = placesData;
const byId = new Map(places.map((place) => [place.id, place]));
const regions = new Set(places.map((place) => place.region));
const categories = new Set(places.map((place) => place.categoryCode));
const tastes = new Set<string>(["alley", "sunset", "history", "wave"]);
const allowedParams = new Set(["region", "category", "q", "indoor", "taste", "sort", "bounds", "offset", "limit"]);
const collator = new Intl.Collator("ko");
const normalizeSearch = (value: string) => value.normalize("NFKC").replace(/\s/g, "").toLocaleLowerCase("ko");

export class PlaceQueryError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "PlaceQueryError";
  }
}

function integer(params: URLSearchParams, name: string, fallback: number, min: number, max: number) {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new PlaceQueryError(name, `${name} 값은 ${min}부터 ${max} 사이의 정수여야 해요.`);
  }
  return value;
}

function parseQuery(params: URLSearchParams): PlaceQuery {
  for (const name of params.keys()) {
    if (!allowedParams.has(name)) throw new PlaceQueryError("query", "지원하지 않는 검색 조건이 있어요.");
    if (name !== "region" && name !== "category" && params.getAll(name).length > 1) {
      throw new PlaceQueryError(name, "이 검색 조건은 한 번만 넣어주세요.");
    }
  }
  const selectedRegions = [...new Set(params.getAll("region"))];
  if (selectedRegions.some((region) => region !== "부산광역시" && !regions.has(region))) {
    throw new PlaceQueryError("region", "지역은 부산광역시 또는 부산광역시 구·군 전체 이름으로 넣어주세요.");
  }
  const selectedCategories = [...new Set(params.getAll("category"))];
  if (selectedCategories.some((code) => !categories.has(code))) {
    throw new PlaceQueryError("category", "장소 목록에 있는 분류 코드를 넣어주세요.");
  }
  const q = params.get("q")?.trim() ?? "";
  if (q.length > 100) throw new PlaceQueryError("q", "검색어는 100자까지 넣을 수 있어요.");
  const indoor = params.get("indoor");
  if (indoor !== null && indoor !== "true" && indoor !== "false") {
    throw new PlaceQueryError("indoor", "실내 조건은 true 또는 false로 넣어주세요.");
  }
  const taste = params.get("taste");
  if (taste !== null && !tastes.has(taste)) throw new PlaceQueryError("taste", "지원하는 취향 유형을 넣어주세요.");
  const sort = params.get("sort") ?? (taste ? "taste" : "name");
  if (sort !== "name" && sort !== "taste") throw new PlaceQueryError("sort", "정렬은 name 또는 taste로 넣어주세요.");
  if (sort === "taste" && !taste) throw new PlaceQueryError("taste", "취향순 정렬에는 취향 유형이 필요해요.");
  let bounds: Bounds | undefined;
  const rawBounds = params.get("bounds");
  if (rawBounds !== null) {
    const parts = rawBounds.split(",").map((value) => value.trim());
    const [west, south, east, north] = parts.map(Number);
    if (parts.length !== 4 || parts.some((value) => !value || !Number.isFinite(Number(value))) || west < -180 || east > 180 || south < -90 || north > 90 || west > east || south > north) {
      throw new PlaceQueryError("bounds", "지도 범위는 서쪽경도,남쪽위도,동쪽경도,북쪽위도 순서로 넣어주세요.");
    }
    bounds = { west, south, east, north };
  }
  return {
    regions: selectedRegions.includes("부산광역시") ? [] : selectedRegions,
    categories: selectedCategories,
    q: normalizeSearch(q),
    indoor: indoor === null ? undefined : indoor === "true",
    taste: taste === null ? undefined : taste as TasteId,
    sort,
    bounds,
    offset: integer(params, "offset", 0, 0, Number.MAX_SAFE_INTEGER),
    limit: integer(params, "limit", 50, 1, 500),
  };
}

export function listPlaces(params: URLSearchParams) {
  const query = parseQuery(params);
  const filtered = places.filter((place) => {
    if (query.regions.length && !query.regions.includes(place.region)) return false;
    if (query.categories.length && !query.categories.includes(place.categoryCode)) return false;
    if (query.q && !normalizeSearch(place.name).includes(query.q)) return false;
    if (query.indoor !== undefined && place.indoor !== query.indoor) return false;
    if (query.bounds && (place.lng < query.bounds.west || place.lng > query.bounds.east || place.lat < query.bounds.south || place.lat > query.bounds.north)) return false;
    return true;
  });
  filtered.sort((a, b) => {
    if (query.sort === "taste" && query.taste) {
      const match = Number(b.tastes.includes(query.taste)) - Number(a.tastes.includes(query.taste));
      if (match) return match;
    }
    return collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
  });
  const items = filtered.slice(query.offset, query.offset + query.limit);
  return {
    items,
    total: filtered.length,
    offset: query.offset,
    limit: query.limit,
    nextOffset: query.offset + items.length < filtered.length ? query.offset + items.length : null,
  };
}

export function getPlace(id: string): Place | undefined {
  return byId.get(id);
}
