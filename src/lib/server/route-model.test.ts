import { describe, expect, it } from "vitest";
import { parseTransit, parseWalk, toLatLng } from "./route-model";

const bus = (time: number, names: string[], stops: string[]) => ({
  properties: { type: "BUS", time, stops: stops.map((name) => ({ name })), vehicles: names.map((name) => ({ name, type: "일반" })) },
  path: { points: [[129.01, 35.09], [129.012, 35.085], [129.016, 35.074]] },
});

describe("parseTransit", () => {
  it("카카오가 맨 앞에 준 경로 하나만 쓴다", () => {
    const leg = parseTransit({
      status: "OK",
      routes: [
        { properties: { totalTime: 1680, transfers: 0 }, steps: [bus(743, ["61"], ["감천문화마을", "중간", "송도입구"])] },
        { properties: { totalTime: 1620, transfers: 1 }, steps: [bus(600, ["7"], ["a", "b"])] },
      ],
    });
    expect(leg).toMatchObject({ kind: "transit", minutes: 28, transfers: 0 });
    expect(leg?.steps).toEqual([{ type: "BUS", minutes: 12, names: ["61"], board: "감천문화마을", alight: "송도입구", stopCount: 2 }]);
    expect(leg?.lines[0].points[0]).toEqual([35.09, 129.01]);
  });

  it("환승 사이 걷기 단계를 순서대로 남긴다", () => {
    const leg = parseTransit({
      status: "OK",
      routes: [{ properties: { totalTime: 1860, transfers: 1 }, steps: [
        bus(500, ["서구2-2"], ["a", "b"]),
        { properties: { type: "WALKING", time: 120 }, path: { points: [] } },
        bus(700, ["96", "26"], ["c", "d", "e"]),
      ] }],
    });
    expect(leg?.steps.map((step) => step.type)).toEqual(["BUS", "WALKING", "BUS"]);
    expect(leg?.steps[2].names).toEqual(["96", "26"]);
  });

  it("결과 없음·모르는 단계·걷기만 있는 경로는 null", () => {
    expect(parseTransit({ status: "NO_RESULTS" })).toBeNull();
    expect(parseTransit({ status: "OK", routes: [{ properties: { totalTime: 60 }, steps: [{ properties: { type: "SHIP", time: 60 } }] }] })).toBeNull();
    expect(parseTransit({ status: "OK", routes: [{ properties: { totalTime: 60 }, steps: [{ properties: { type: "WALKING", time: 60 } }] }] })).toBeNull();
    expect(parseTransit(null)).toBeNull();
  });
});

describe("parseWalk", () => {
  it("걷는 시간·거리와 길 좌표를 돌려준다", () => {
    const leg = parseWalk({
      status: "OK",
      route: { properties: { totalTime: 600, totalDistance: 575 }, legs: [{ steps: [{ path: { points: [[129.0326, 35.1004], [129.0321, 35.1027]] } }] }] },
    });
    expect(leg).toEqual({ kind: "walk", minutes: 10, meters: 575, steps: [], lines: [{ type: "WALKING", points: [[35.1004, 129.0326], [35.1027, 129.0321]] }] });
  });

  it("결과가 없으면 null", () => {
    expect(parseWalk({ status: "TOO_FAR_AWAY" })).toBeNull();
  });
});

describe("toLatLng", () => {
  it("점을 솎아도 마지막 점은 남기고 잘못된 점은 뺀다", () => {
    expect(toLatLng([[1, 2], [3, 4], ["x", 5], [5, 6], [7, 8]], 2)).toEqual([[2, 1], [6, 5], [8, 7]]);
  });
});
