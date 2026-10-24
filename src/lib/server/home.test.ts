import { describe, expect, it, vi } from "vitest";
import places from "../../../data/places/places.json";
import rules from "../../../data/docent/evidence-rules.json";

vi.mock("server-only", () => ({}));

import { homeData } from "./home";

describe("홈 데이터", () => {
  const data = homeData();

  it("구별 관광지 수는 16개 구·군이고 합이 전체 장소 수와 같다", () => {
    expect(Object.keys(data.regionCounts)).toHaveLength(16);
    expect(Object.values(data.regionCounts).reduce((a, b) => a + b, 0)).toBe(places.length);
  });

  it("이번 주 이야기는 서로 다른 구의 사진 있는 이야기 4편이다", () => {
    expect(data.weekly).toHaveLength(4);
    expect(new Set(data.weekly.map((s) => s.region)).size).toBe(4);
    for (const story of data.weekly) expect(story.photo).not.toBeNull();
  });

  it("구별 이야기는 그 구의 이야기만, 최대 4편, 사진 있는 이야기가 먼저 온다", () => {
    for (const [region, stories] of Object.entries(data.storiesByRegion)) {
      expect(stories.length).toBeGreaterThan(0);
      expect(stories.length).toBeLessThanOrEqual(4);
      for (const story of stories) expect(story.region).toBe(region);
      const firstWithout = stories.findIndex((s) => !s.photo);
      if (firstWithout >= 0) expect(stories.slice(firstWithout).every((s) => !s.photo)).toBe(true);
    }
  });

  it("격리된 이야기는 나오지 않는다", () => {
    const shown = [...data.weekly, ...Object.values(data.storiesByRegion).flat()].map((s) => s.id);
    for (const q of rules.quarantines) expect(shown).not.toContain(q.sourceId);
  });

  it("사진에는 출처와 공공누리 유형이 붙고, 3유형은 변경금지로 표시된다", () => {
    const photos = [...data.weekly, ...Object.values(data.storiesByRegion).flat()].flatMap((s) => (s.photo ? [s.photo] : []));
    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(photo.credit).toMatch(/^사진 한국관광공사/);
      if (photo.noDerivs) expect(photo.credit).toContain("변경금지");
    }
  });
});
