import { describe, expect, it } from "vitest";
import { daySummary, kakaoRouteUrl, minutesLabel } from "./routeModel";
import type { LegState } from "./useRouteLegs";

const transit = (minutes: number): LegState => ({ kind: "ready", leg: { kind: "transit", minutes, transfers: 0, steps: [], lines: [] } });
const walk = (minutes: number): LegState => ({ kind: "ready", leg: { kind: "walk", minutes, meters: 500, steps: [], lines: [] } });

describe("minutesLabel", () => {
  it("한 시간이 넘으면 시간과 분으로", () => {
    expect(minutesLabel(28)).toBe("28분");
    expect(minutesLabel(65)).toBe("1시간 5분");
    expect(minutesLabel(120)).toBe("2시간");
  });
});

describe("daySummary", () => {
  it("모두 찾으면 합계와 수단별 횟수", () => {
    expect(daySummary([transit(28), transit(37), walk(10)])).toEqual({ title: "1시간 15분", detail: "대중교통 2번 · 걸어서 1번" });
  });

  it("하나라도 찾는 중이면 합계를 보여주지 않는다", () => {
    expect(daySummary([transit(28), { kind: "loading" }]).title).toBe("찾는 중");
  });

  it("못 찾은 구간은 합계에서 빼고 알린다", () => {
    expect(daySummary([transit(28), { kind: "error", message: "x", retry: false }])).toEqual({ title: "약 28분", detail: "대중교통 1번 · 못 찾은 구간 1개 빼고" });
    expect(daySummary([{ kind: "error", message: "x", retry: true }]).title).toBe("확인하지 못했어요");
  });
});

describe("kakaoRouteUrl", () => {
  it("공식 길찾기 주소 형식으로 이름의 쉼표·빗금을 비운다", () => {
    expect(kakaoRouteUrl("walk", { name: "A,B", lat: 35.1, lng: 129.0 }, { name: "C/D", lat: 35.2, lng: 129.1 }))
      .toBe("https://map.kakao.com/link/by/walk/A%20B,35.1,129/C%20D,35.2,129.1");
  });
});
