import { describe, expect, it } from "vitest";
import { canMapPlace } from "./mapCoordinates";

describe("탐색 지도 좌표 보호", () => {
  it("부산 내 장소 좌표는 지도에 표시한다", () => {
    expect(canMapPlace({ lat: 35.1587, lng: 129.1604 })).toBe(true);
  });
  it("원본 반송공원의 부산 밖 좌표가 지도 범위를 넓히지 않게 한다", () => {
    expect(canMapPlace({ lat: 19.69442748, lng: 117.9925662504 })).toBe(false);
  });
  it("유효하지 않거나 비어 있는 좌표는 지도에서 제외한다", () => {
    expect(canMapPlace({ lat: NaN, lng: 129.1 })).toBe(false);
    expect(canMapPlace({ lat: 0, lng: 0 })).toBe(false);
  });
});
