import { describe, expect, it } from "vitest";
import places from "../../../../data/places/places.json";
import { QUESTIONS, RESULTS, TASTE_IDS, newCourseIds, resolveCourse, scoreTaste, type TastePlace } from "./tasteModel";

const byId: Record<string, TastePlace> = Object.fromEntries(places.map((place) => [place.id, { ...place, story: null }]));

describe("이야기 취향 계산", () => {
  it("다섯 장면·각 네 선택지와 네 결과를 유지한다", () => {
    expect(QUESTIONS).toHaveLength(5);
    expect(QUESTIONS.every((question) => question.choices.length === 4)).toBe(true);
    for (const id of TASTE_IDS) expect(scoreTaste(Array(5).fill(id))).toBe(id);
  });
  it("최다 유형을 고르고 동점 후보 사이에서는 가장 최근 답을 쓴다", () => {
    expect(scoreTaste(["alley", "alley", "alley", "wave", "sunset"])).toBe("alley");
    expect(scoreTaste(["alley", "sunset", "alley", "sunset", "wave"])).toBe("sunset");
    expect(scoreTaste(["history", "wave", "wave", "history", "alley"])).toBe("history");
  });
  it("진행 중·잘못된 답은 결과로 저장하지 않는다", () => {
    expect(scoreTaste([])).toBeNull();
    expect(scoreTaste(["alley"])).toBeNull();
    expect(scoreTaste(["alley", "alley", "alley", "alley", "unknown" as "alley"])).toBeNull();
  });
});

describe("부산 대표 이야기 코스", () => {
  it("각 코스는 실제 장소 3곳이며 중복이나 잘못된 좌표가 없다", () => {
    for (const id of TASTE_IDS) {
      const course = resolveCourse(id, byId);
      expect(course).toHaveLength(3);
      expect(new Set(course.map((place) => place.id)).size).toBe(3);
      expect(course.map((place) => place.id)).toEqual(RESULTS[id].stops.map((stop) => stop.id));
      expect(course.every((place) => place.region.startsWith("부산광역시"))).toBe(true);
    }
  });
  it("장소가 사라지거나 좌표가 틀리면 가짜로 채우지 않는다", () => {
    const broken: Record<string, TastePlace> = { ...byId, "1942337": { ...byId["1942337"], lat: 0 } };
    delete broken["1997221"];
    expect(resolveCourse("alley", broken).map((place) => place.id)).toEqual(["2684712"]);
  });
  it("어느 날에든 이미 있는 장소는 유지하고 새 장소만 추천 순서로 반환한다", () => {
    const course = resolveCourse("alley", byId);
    expect(newCourseIds(course, [[course[1].id], [course[0].id]])).toEqual([course[2].id]);
    expect(newCourseIds(course, [course.map((place) => place.id)])).toEqual([]);
    expect(newCourseIds([...course, course[0]], [[]])).toEqual(course.map((place) => place.id));
  });
});
