import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./places", () => ({ getPlace: (id: string) => ({ a: { id: "a", name: "출발", lat: 35.1, lng: 129.1 }, b: { id: "b", name: "도착", lat: 35.2, lng: 129.2 } })[id as "a" | "b"] }));

const transit = { status: "OK", routes: [{ properties: { totalTime: 600 }, steps: [{ properties: { type: "BUS", time: 600, vehicles: [{ name: "61" }], stops: [{ name: "출발 정류장" }, { name: "도착 정류장" }] }, path: { points: [[129.1, 35.1], [129.2, 35.2]] } }] }] };
const walk = { status: "OK", route: { properties: { totalTime: 1200, totalDistance: 1000 }, legs: [] } };
const query = (mode = "transit") => new URLSearchParams({ from: "a", to: "b", mode });

beforeEach(() => { vi.resetModules(); vi.stubEnv("KAKAO_REST_API_KEY", "test-only-placeholder"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("경로 조회 서버", () => {
  it("수단별 API를 호출하고 같은 구간·수단만 재사용한다", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(transit)).mockResolvedValueOnce(Response.json(walk));
    vi.stubGlobal("fetch", fetcher);
    const { getRoute } = await import("./route");
    const [first, second] = await Promise.all([getRoute(query()), getRoute(query())]);
    expect(first).toEqual(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await getRoute(query("walk"))).leg.kind).toBe("walk");
    expect(fetcher.mock.calls[0][0]).toContain("/routing/publictraffic?");
    expect(fetcher.mock.calls[1][0]).toContain("/routing/walk?");
    await getRoute(query());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("대중교통 결과가 없어도 도보로 자동 변경하지 않는다", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "NO_RESULTS" }));
    vi.stubGlobal("fetch", fetcher);
    const { getRoute } = await import("./route");
    await expect(getRoute(query())).rejects.toMatchObject({ code: "ROUTE_NOT_FOUND" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("한도 오류는 재사용하지 않아 다음 요청이 다시 조회할 수 있다", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 429 })).mockResolvedValueOnce(Response.json(transit));
    vi.stubGlobal("fetch", fetcher);
    const { getRoute } = await import("./route");
    await expect(getRoute(query())).rejects.toMatchObject({ code: "ROUTE_QUOTA", status: 429 });
    expect((await getRoute(query())).leg.kind).toBe("transit");
  });

  it("지원하지 않는 수단과 중복 조건은 외부 호출 전에 거절한다", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { getRoute } = await import("./route");
    await expect(getRoute(query("car"))).rejects.toMatchObject({ code: "INVALID_QUERY" });
    await expect(getRoute(new URLSearchParams("from=a&to=b&mode=walk&mode=transit"))).rejects.toMatchObject({ code: "INVALID_QUERY" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("서버 캐시 만료 후 다시 조회한다", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json(transit)));
    vi.stubGlobal("fetch", fetcher);
    const { getRoute } = await import("./route");
    await getRoute(query());
    await getRoute(query(), Date.now() + 7 * 60 * 60 * 1000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
