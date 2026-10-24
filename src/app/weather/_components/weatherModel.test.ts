import { describe, expect, it } from "vitest";
import { activeSwaps, dayCard, indoorAlternatives, rainTimeline, tripSummary, type WeatherPlace } from "./weatherModel";
import type { WeatherState } from "../../schedule/_components/scheduleModel";

const place = (id: string, lat: number, lng: number, indoor: boolean): WeatherPlace =>
  ({ id, name: id, region: "부산광역시 수영구", category: "분류 > 소분류", lat, lng, indoor });
const places = {
  beach: place("beach", 35.15, 129.11, false),
  museum: place("museum", 35.155, 129.11, true),
  far: place("far", 35.3, 129.2, true),
  story: place("story", 35.165, 129.11, true),
  park: place("park", 35.151, 129.11, false),
  banbong: place("banbong", 19.69442748, 117.9925662504, false),
  broken: place("broken", 19.7, 118, true),
};

const ready = (days: object[]): WeatherState => ({
  kind: "ready",
  data: { location: { name: "부산", nx: 98, ny: 76 }, issuedAt: "2026-10-25T05:00:00+09:00", days: days as never },
});
const forecast = (date: string, extra: object) => ({
  date, status: "forecast", condition: "clear", precipitationExpected: false, maxPrecipitationProbability: 10, minTemperature: 12, maxTemperature: 20, ...extra,
});

describe("날짜 카드", () => {
  it("비 예보가 있으면 대안을 보여줄 날로 표시하고 강수확률을 적는다", () => {
    const card = dayCard("2026-10-26", "2026-10-25", ready([forecast("2026-10-26", { condition: "rain", precipitationExpected: true, maxPrecipitationProbability: 80 })]));
    expect(card).toMatchObject({ label: "비", rain: true, detail: "강수확률 최대 80%" });
  });
  it("비 예보가 없으면 하늘 상태와 기온을 보여준다", () => {
    expect(dayCard("2026-10-26", "2026-10-25", ready([forecast("2026-10-26", {})]))).toMatchObject({ label: "맑음", rain: false, detail: "12° / 20°" });
  });
  it("예보 전·자료 없음·판단 불가·실패를 맑음이나 비 없음으로 바꾸지 않는다", () => {
    const state = ready([forecast("2026-10-26", { status: "unavailable" }), forecast("2026-10-27", { precipitationExpected: null, condition: "unknown" })]);
    expect(dayCard("2026-10-30", "2026-10-25", state)).toMatchObject({ label: "예보 전", rain: false });
    expect(dayCard("2026-10-26", "2026-10-25", state)).toMatchObject({ label: "자료 없음", rain: false });
    expect(dayCard("2026-10-27", "2026-10-25", state)).toMatchObject({ label: "강수 확인 어려움", rain: false });
    expect(dayCard("2026-10-26", "2026-10-25", { kind: "error", message: "x" })).toMatchObject({ label: "확인 실패", rain: false });
    expect(dayCard("2026-10-24", "2026-10-25", state)).toMatchObject({ label: "지난 날짜", rain: false });
  });
});

describe("실내 대안", () => {
  it("실내 장소만 가까운 순으로, 거리 제한 없이 고른다", () => {
    const result = indoorAlternatives(places.beach, places, new Set(), new Set())!;
    expect(result.map((entry) => entry.place.id)).toEqual(["museum", "story", "far"]);
  });
  it("직선 2km 안의 이야기 있는 곳을 앞에 둔다", () => {
    const result = indoorAlternatives(places.beach, places, new Set(), new Set(["story", "far"]))!;
    expect(result.map((entry) => [entry.place.id, entry.story])).toEqual([["story", true], ["museum", false], ["far", true]]);
  });
  it("웰니스는 더 가까워도 뒤로 미룬다", () => {
    const spa = { ...place("spa", 35.1505, 129.11, true), category: "웰니스관광 > 뷰티스파" };
    const result = indoorAlternatives(places.beach, { ...places, spa }, new Set(), new Set())!;
    expect(result.map((entry) => entry.place.id)).toEqual(["museum", "story", "far"]);
    expect(indoorAlternatives(places.beach, { ...places, spa }, new Set(), new Set(), 4)!.at(-1)!.place.id).toBe("spa");
  });
  it("이미 일정에 있는 곳과 좌표가 잘못된 곳은 빼고, 최대 개수를 지킨다", () => {
    const result = indoorAlternatives(places.beach, places, new Set(["museum"]), new Set(), 1)!;
    expect(result.map((entry) => entry.place.id)).toEqual(["story"]);
  });
  it("기준 장소 좌표가 잘못됐으면 찾지 않는다", () => {
    expect(indoorAlternatives(places.banbong, places, new Set(), new Set())).toBeNull();
    expect(indoorAlternatives(undefined, places, new Set(), new Set())).toBeNull();
  });
});

describe("시간별 비 예보", () => {
  const period = (time: string, pty: number | null) => ({ time, precipitationType: pty, precipitationProbability: 60 });
  it("비 구간과 그 뒤 비 소식이 없는 시각을 알려준다", () => {
    const state = ready([forecast("2026-10-26", { condition: "rain", precipitationExpected: true, periods: [period("07:00", 1), period("08:00", 1), period("09:00", 0), period("10:00", 0)] })]);
    expect(rainTimeline("2026-10-26", state)!.summary).toBe("7시~8시에 비 예보가 있어요. 9시부터는 비 소식이 없어요.");
  });
  it("떨어진 구간은 나눠 적고, 자료가 빈 시각을 비 없음으로 채우지 않는다", () => {
    const state = ready([forecast("2026-10-26", { periods: [period("00:00", 1), period("03:00", 0), period("06:00", 4), period("09:00", null)] })]);
    const timeline = rainTimeline("2026-10-26", state)!;
    expect(timeline.summary).toBe("0시, 6시에 비 예보가 있어요.");
    expect(timeline.cells.at(-1)!.rain).toBeNull();
  });
  it("예보 전이거나 시각 자료가 없으면 막대를 그리지 않는다", () => {
    expect(rainTimeline("2026-10-30", ready([]))).toBeNull();
    expect(rainTimeline("2026-10-26", { kind: "loading" })).toBeNull();
  });
});

describe("여행 요약", () => {
  const short = (date: string) => date.slice(5);
  const dates = ["2026-10-26", "2026-10-27"];
  it("비 오는 날과 그날 정할 야외 장소 수를 알려준다", () => {
    const state = ready([forecast(dates[0], { condition: "rain", precipitationExpected: true }), forecast(dates[1], {})]);
    const cards = dates.map((date) => dayCard(date, "2026-10-25", state));
    const result = tripSummary(dates, cards, [["beach", "museum", "park"], []], places, state, short);
    expect(result.title).toBe("1일차 10-26에 비 예보가 있어요");
    expect(result.body).toContain("야외 장소 2곳");
  });
  it("비 소식이 없으면 예보 전 날 수를 함께 알려준다", () => {
    const state = ready([forecast(dates[0], {})]);
    const cards = dates.map((date) => dayCard(date, "2026-10-25", state));
    expect(tripSummary(dates, cards, [[], []], places, state, short)).toMatchObject({ title: "예보가 나온 날엔 비 소식이 없어요", body: "1일은 아직 예보 전이에요.", rain: false });
  });
});

describe("바꾼 장소 기억", () => {
  it("지금 일정의 그날에 남아 있는 교체만 표시한다", () => {
    const swaps = [
      { day: 1, fromId: "beach", toId: "museum", addedCandidate: true },
      { day: 2, fromId: "park", toId: "story", addedCandidate: false },
    ];
    expect(activeSwaps(swaps, [["museum"], ["park"]])).toEqual([swaps[0]]);
  });
});
