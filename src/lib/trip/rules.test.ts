import { describe, expect, it } from "vitest";
import { dateOfDay, dayCount, validatePeriod } from "./dates";
import * as r from "./rules";

const TODAY = "2026-10-24";
const base = () => r.createAutoTrip(TODAY);

describe("자동 여행", () => {
  it("부산 전체 + 내일부터 2박 3일", () => {
    const t = base();
    expect(t.regions).toEqual([]);
    expect([t.startDate, t.endDate]).toEqual(["2026-10-25", "2026-10-27"]);
    expect(t.days).toHaveLength(3);
    expect(t.periodSource).toBe("auto");
  });
});

describe("기간", () => {
  it("지난 날짜, 거꾸로 된 기간, 14일 초과는 막는다", () => {
    expect(validatePeriod("2026-10-23", "2026-10-25", TODAY)).toBe("past");
    expect(validatePeriod("2026-10-26", "2026-10-25", TODAY)).toBe("end-before-start");
    expect(validatePeriod("2026-10-25", "2026-11-07", TODAY)).toBeNull(); // 14일
    expect(validatePeriod("2026-10-25", "2026-11-08", TODAY)).toBe("too-long");
    expect(validatePeriod("2026-13-01", "2026-13-02", TODAY)).toBe("invalid");
  });

  it("일수와 일차 날짜", () => {
    expect(dayCount("2026-10-25", "2026-10-25")).toBe(1);
    expect(dayCount("2026-10-30", "2026-11-02")).toBe(4);
    expect(dateOfDay("2026-10-30", 3)).toBe("2026-11-01");
  });

  it("기간을 줄이면 사라진 일차의 장소는 날짜 없는 곳으로 옮기고 알린다", () => {
    let t = r.addToDay(base(), "a", 1);
    t = r.addToDay(t, "b", 3);
    t = r.addToDay(t, "c", 3);
    const { trip, moved, error } = r.setPeriod(t, "2026-10-25", "2026-10-26", TODAY);
    expect(error).toBeNull();
    expect(trip.days).toEqual([["a"], []]);
    expect(r.unscheduled(trip)).toEqual(["b", "c"]);
    expect(r.movedNotice(moved)).toBe("3일차 장소 2곳이 날짜 없는 곳으로 옮겨졌어요");
    expect(trip.periodSource).toBe("user");
  });

  it("기간을 늘리면 빈 날이 생기고 기존 일정은 그대로", () => {
    const t = r.addToDay(base(), "a", 2);
    const { trip, moved } = r.setPeriod(t, "2026-10-25", "2026-10-29", TODAY);
    expect(trip.days).toEqual([[], ["a"], [], [], []]);
    expect(moved).toEqual([]);
  });

  it("잘못된 기간이면 여행은 그대로", () => {
    const t = base();
    const result = r.setPeriod(t, "2026-10-20", "2026-10-22", TODAY);
    expect(result.error).toBe("past");
    expect(result.trip).toBe(t);
  });
});

describe("후보함과 일정", () => {
  it("같은 장소는 후보함에 한 번만", () => {
    const t = r.addCandidate(r.addCandidate(base(), "a"), "a");
    expect(t.candidates).toEqual(["a"]);
  });

  it("후보함에 없는 장소를 일정에 넣으면 후보함에도 추가, 일정에 넣어도 후보함에 남는다", () => {
    const t = r.addToDay(base(), "a", 1);
    expect(t.candidates).toEqual(["a"]);
    expect(t.days[0]).toEqual(["a"]);
    expect(r.unscheduled(t)).toEqual([]);
  });

  it("같은 장소는 하루에만", () => {
    const t = r.addToDay(base(), "a", 1);
    expect(r.addToDay(t, "a", 2)).toBe(t);
    expect(r.dayOf(t, "a")).toBe(1);
  });

  it("다른 날로 옮기기", () => {
    const t = r.moveToDay(r.addToDay(base(), "a", 1), "a", 3);
    expect(t.days).toEqual([[], [], ["a"]]);
  });

  it("일정에서 빼면 날짜 없는 곳으로, 후보함에서 빼면 일정에서도 빠진다", () => {
    let t = r.addToDay(base(), "a", 1);
    t = r.removeFromSchedule(t, "a");
    expect(r.unscheduled(t)).toEqual(["a"]);
    t = r.removeCandidate(r.addToDay(t, "a", 2), "a");
    expect(t.candidates).toEqual([]);
    expect(t.days).toEqual([[], [], []]);
  });

  it("그날 안에서 순서 바꾸기", () => {
    let t = base();
    for (const id of ["a", "b", "c"]) t = r.addToDay(t, id, 1);
    expect(r.reorderInDay(t, 1, "c", 0).days[0]).toEqual(["c", "a", "b"]);
    expect(r.reorderInDay(t, 1, "a", 99).days[0]).toEqual(["b", "c", "a"]);
  });

  it("날씨 대안 바꾸기는 날짜와 순서를 유지한다", () => {
    let t = r.addToDay(base(), "a", 1);
    t = r.addToDay(t, "b", 1);
    t = r.replaceInDay(t, 1, "a", "indoor");
    expect(t.days[0]).toEqual(["indoor", "b"]);
    expect(t.candidates).toContain("indoor");
  });

  it("지역을 바꿔도 담은 장소는 그대로", () => {
    const t = r.setRegions(r.addCandidate(base(), "a"), ["부산광역시 수영구"]);
    expect(t.candidates).toEqual(["a"]);
    expect(t.regions).toEqual(["부산광역시 수영구"]);
  });

  it("초기화 확인 창 숫자", () => {
    let t = r.addCandidate(base(), "x");
    t = r.addToDay(t, "a", 1);
    t = r.addToDay(t, "b", 2);
    expect(r.summary(t)).toEqual({ candidates: 3, scheduled: 2 });
  });
});
