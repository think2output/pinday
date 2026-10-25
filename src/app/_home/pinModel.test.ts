import { describe, expect, it } from "vitest";
import { choosePin, pinPool, PIN_TRIES, type PinPlace } from "./pinModel";

const places: PinPlace[] = [
  { id: "a", name: "A", region: "부산광역시 동구", category: "골목", summary: "승인 해설", image: null },
  { id: "b", name: "B", region: "부산광역시 영도구", category: "바다", summary: "승인 해설", image: null },
];
describe("오늘의 핀 뽑기", () => {
  it("지역 미선택·부산 전체는 전체, 선택 지역은 해당 지역만", () => {
    expect(PIN_TRIES).toBe(3);
    expect(pinPool(places, [], null)).toHaveLength(2);
    expect(pinPool(places, ["부산광역시"], null)).toHaveLength(2);
    expect(pinPool(places, ["부산광역시 동구"], null).map((place) => place.id)).toEqual(["a"]);
    expect(pinPool(places, ["부산광역시 수영구"], null)).toEqual([]);
  });
  it("직전 결과와 중복 ID를 빼며 한 곳뿐이면 새 결과를 만들지 않는다", () => {
    expect(pinPool([...places, places[1]], [], "a").map((place) => place.id)).toEqual(["b"]);
    expect(pinPool(places, ["부산광역시 동구"], "a")).toEqual([]);
  });
  it("난수 구간의 양 끝과 빈 목록·잘못된 난수를 처리한다", () => {
    expect(choosePin(places, 0)?.id).toBe("a");
    expect(choosePin(places, 0.999)?.id).toBe("b");
    expect(choosePin([], 0)).toBeNull();
    expect(choosePin(places, NaN)).toBeNull();
    expect(choosePin(places, 1)).toBeNull();
    expect(choosePin(places, -0.1)).toBeNull();
  });
});
