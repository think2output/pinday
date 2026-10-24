import { describe, expect, it, vi } from "vitest";
import places from "../../../data/places/places.json";

vi.mock("server-only", () => ({}));

import { listPlaces, getPlace, PlaceQueryError } from "./places";
import { GET as listGET } from "../../app/api/places/route";
import { GET as detailGET } from "../../app/api/places/[id]/route";

const query = (params: Record<string, string> = {}) => listPlaces(new URLSearchParams(params));

describe("장소 목록", () => {
  it("페이지를 끝까지 읽으면 전체 장소가 누락·중복 없이 이름순으로 나온다", () => {
    const ids: string[] = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const page = query({ offset: String(offset) });
      expect(page.total).toBe(places.length);
      expect(page.items.length).toBeLessThanOrEqual(50);
      ids.push(...page.items.map((p) => p.id));
      offset = page.nextOffset;
    }
    expect(ids).toHaveLength(places.length);
    expect(new Set(ids)).toEqual(new Set(places.map((p) => p.id)));
    const expected = [...places].sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id, "ko"));
    expect(ids).toEqual(expected.map((p) => p.id));
    expect(query({ offset: "10000" }).items).toEqual([]);
    expect(query({ offset: "10000" }).nextOffset).toBeNull();
  });
  it("서구와 강서구를 정확히 구별하고 여러 지역은 합집합으로 조회한다", () => {
    const west = query({ region: "부산광역시 서구", limit: "500" });
    expect(west.total).toBeGreaterThan(0);
    expect(west.items.every((p) => p.region === "부산광역시 서구")).toBe(true);
    const params = new URLSearchParams({ limit: "500" });
    params.append("region", "부산광역시 서구");
    params.append("region", "부산광역시 강서구");
    const both = listPlaces(params);
    expect(both.total).toBe(places.filter((p) => ["부산광역시 서구", "부산광역시 강서구"].includes(p.region)).length);
    expect(query({ region: "부산광역시" }).total).toBe(places.length);
  });
  it("분류·실내 조건을 함께 적용하고 false를 야외 조건으로 읽는다", () => {
    const sample = places.find((p) => p.indoor)!;
    const result = query({ category: sample.categoryCode, indoor: "true", limit: "500" });
    expect(result.items.some((p) => p.id === sample.id)).toBe(true);
    expect(result.items.every((p) => p.categoryCode === sample.categoryCode && p.indoor)).toBe(true);
    expect(query({ indoor: "false", limit: "500" }).items.every((p) => !p.indoor)).toBe(true);
    const params = new URLSearchParams({ limit: "500" });
    const codes = [...new Set(places.map((p) => p.categoryCode))].slice(0, 2);
    for (const code of codes) params.append("category", code);
    expect(listPlaces(params).total).toBe(places.filter((p) => codes.includes(p.categoryCode)).length);
  });
  it("이름 검색은 공백을 무시하며 결과가 없으면 빈 목록을 돌려준다", () => {
    const results = query({ q: "감천 문화 마을", limit: "500" });
    expect(results.items.some((p) => p.name === "부산 감천문화마을")).toBe(true);
    expect(query({ q: "존재하지않는이름xyz" }).total).toBe(0);
    expect(query({ q: " " }).total).toBe(places.length);
  });
  it("지도 범위를 적용하고 경계의 장소도 포함한다", () => {
    const sample = places.find((p) => p.name === "해운대해수욕장")!;
    const bounds = [sample.lng, sample.lat, sample.lng, sample.lat].join(",");
    const result = query({ bounds, limit: "500" });
    expect(result.items.some((p) => p.id === sample.id)).toBe(true);
    expect(result.items.every((p) => p.lng === sample.lng && p.lat === sample.lat)).toBe(true);
    const west = query({ region: "부산광역시 서구", bounds });
    expect(west.total).toBe(0);
  });
  it("취향에 맞는 장소를 먼저 정렬하며 다른 장소도 모두 유지한다", () => {
    const result = query({ taste: "history", limit: "500" });
    expect(result.total).toBe(places.length);
    const count = places.filter((p) => p.tastes.includes("history")).length;
    expect(result.items.slice(0, count).every((p) => p.tastes.includes("history"))).toBe(true);
    expect(result.items.slice(count).every((p) => !p.tastes.includes("history"))).toBe(true);
    expect(query({ taste: "history", sort: "name", limit: "500" }).items).toEqual(query({ limit: "500" }).items);
    expect(query({ limit: "500" }).items.map((p) => p.id)).toEqual([...places].sort((a,b) => a.name.localeCompare(b.name,"ko") || a.id.localeCompare(b.id,"ko")).map((p) => p.id));
  });
  it.each([
    ["region", "서구"], ["category", "unknown"], ["indoor", "0"],
    ["taste", "unknown"], ["sort", "random"], ["sort", "taste"],
    ["limit", "0"], ["limit", "501"], ["limit", "1.5"], ["limit", "1e2"],
    ["offset", "-1"], ["offset", "9007199254740992"],
    ["bounds", "129,35,128,36"], ["bounds", "129,36,130,35"],
    ["bounds", "129,,130,36"], ["bounds", "129,35,Infinity,36"],
    ["bounds", "-181,35,130,36"], ["bounds", "129,35,181,36"],
    ["bounds", "129,-91,130,36"], ["bounds", "129,35,130,91"],
    ["bounds", "129,35,130"], ["bounds", "129,35,130,36,37"],
    ["q", "가".repeat(101)], ["hasStory", "true"],
  ])("잘못된 %s=%s 요청을 조용히 무시하지 않는다", (name, value) => {
    expect(() => query({ [name]: value })).toThrow(PlaceQueryError);
  });
  it("단일 조건의 중복은 거절하며 지역/분류 중복은 결과를 복제하지 않는다", () => {
    expect(() => listPlaces(new URLSearchParams("limit=1&limit=2"))).toThrow(PlaceQueryError);
    const params = new URLSearchParams();
    params.append("region", "부산광역시 서구");
    params.append("region", "부산광역시 서구");
    expect(listPlaces(params).total).toBe(query({ region: "부산광역시 서구" }).total);
  });
});

describe("장소 HTTP 응답", () => {
  it("목록은 JSON 200, 잘못된 조건은 JSON 400으로 구별한다", async () => {
    const ok = listGET(new Request("http://localhost/api/places?limit=500"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toContain("application/json");
    expect((await ok.json()).items).toHaveLength(places.length);
    const bad = listGET(new Request("http://localhost/api/places?indoor=maybe"));
    expect(bad.status).toBe(400);
    expect(bad.headers.get("Cache-Control")).toBe("no-store");
    expect((await bad.json()).error).toMatchObject({ code: "INVALID_QUERY", field: "indoor" });
  });
  it("비동기 주소 매개변수를 읽고 실제 장소는 200, 없는 장소는 404로 응답한다", async () => {
    const sample = places[0];
    const ok = await detailGET(new Request(`http://localhost/api/places/${sample.id}`), { params: Promise.resolve({ id: sample.id }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).place).toEqual(sample);
    expect(getPlace("없는장소")).toBeUndefined();
    const missing = await detailGET(new Request("http://localhost/api/places/missing"), { params: Promise.resolve({ id: "missing" }) });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("PLACE_NOT_FOUND");
  });
});
