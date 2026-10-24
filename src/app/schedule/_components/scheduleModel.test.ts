import { describe, expect, it } from "vitest";
import { dayWeather, issuedLabel, mapStops, shortDate, unmappedNumbers, weatherRequest, type WeatherState } from "./scheduleModel";

const place = (id: string, lat: number, lng: number) => ({ id, name: id, region: "부산광역시 수영구", category: "해수욕장", lat, lng });
const places = {
  a: place("a", 35.15, 129.11),
  banbong: place("banbong", 19.69442748, 117.9925662504),
  c: place("c", 35.16, 129.16),
};

describe("일정 지도 순서", () => {
  it("좌표가 잘못된 장소는 지도에서 빼되 남은 장소의 순서 번호는 일정 그대로 둔다", () => {
    expect(mapStops(["a", "banbong", "c"], places).map((stop) => [stop.no, stop.place.id])).toEqual([[1, "a"], [3, "c"]]);
    expect(unmappedNumbers(["a", "banbong", "c"], places)).toEqual([2]);
  });
  it("목록에 없는 장소도 지도에서 빼고 번호를 알려준다", () => {
    expect(mapStops(["missing", "a"], places).map((stop) => stop.no)).toEqual([2]);
    expect(unmappedNumbers(["missing", "a"], places)).toEqual([1]);
  });
});

describe("날씨 요청 범위", () => {
  it("여행 기간을 그대로 요청한다", () => {
    expect(weatherRequest("2026-10-26", "2026-10-28", "2026-10-25")).toEqual({ startDate: "2026-10-26", days: 3 });
  });
  it("이미 시작한 여행은 오늘부터 요청한다", () => {
    expect(weatherRequest("2026-10-24", "2026-10-26", "2026-10-25")).toEqual({ startDate: "2026-10-25", days: 2 });
  });
  it("모두 지난 여행은 요청하지 않는다", () => {
    expect(weatherRequest("2026-10-20", "2026-10-22", "2026-10-25")).toBeNull();
  });
});

describe("날짜 탭 강수 표시", () => {
  const ready = (days: Partial<import("./scheduleModel").WeatherDay>[]): WeatherState => ({
    kind: "ready",
    data: {
      location: { name: "부산 대표 격자", nx: 98, ny: 76 }, issuedAt: "2026-10-25T20:00:00+09:00",
      days: days.map((day) => ({ date: "2026-10-26", status: "forecast", condition: "clear", precipitationExpected: false, maxPrecipitationProbability: 10, ...day })),
    },
  });
  const today = "2026-10-25";

  it("비 예보가 있으면 ☂ 표시", () => {
    const result = dayWeather("2026-10-26", today, ready([{ condition: "rain", precipitationExpected: true }]));
    expect(result).toMatchObject({ text: "☂ 비 예보", rain: true });
  });
  it("예보 전·자료 없음·판단 불가는 비 없음으로 바꾸지 않는다", () => {
    expect(dayWeather("2026-10-26", today, ready([{ status: "not-forecast", precipitationExpected: null }])).text).toBe("예보 전");
    expect(dayWeather("2026-10-26", today, ready([{ status: "unavailable", precipitationExpected: null }])).text).toBe("예보 자료 없음");
    expect(dayWeather("2026-10-26", today, ready([{ condition: "unknown", precipitationExpected: null }])).text).toBe("강수 확인 어려움");
    expect(dayWeather("2026-11-05", today, ready([{}])).text).toBe("예보 전");
  });
  it("불러오기 실패와 확인 중을 구분한다", () => {
    expect(dayWeather("2026-10-26", today, { kind: "error", message: "x" })).toMatchObject({ text: "날씨 확인 실패", rain: false });
    expect(dayWeather("2026-10-26", today, { kind: "loading" }).text).toBe("날씨 확인 중");
  });
  it("지난 날짜는 예보가 없다고 표시한다", () => {
    expect(dayWeather("2026-10-24", today, ready([{}])).text).toBe("지난 날짜");
  });
});

describe("표시 형식", () => {
  it("날짜와 발표 시각", () => {
    expect(shortDate("2026-10-24")).toBe("10.24 (토)");
    expect(issuedLabel("2026-10-25T05:00:00+09:00")).toBe("10.25 5시 발표");
  });
});
