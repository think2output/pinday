import { describe, it, expect } from "vitest";
import { parseXml, nearbyHeritage, normalizeName, themeMatch, classify } from "./docent-evidence.mjs";

describe("국가유산 XML과 거리", () => {
  it("식별자 앞자리 0과 CDATA 원문, XML 엔티티를 보존한다", () => {
    const result = parseXml('<result><ccbaAsno>0000120000000</ccbaAsno><item><content><![CDATA[설명 <원문>]]></content><name>A &amp; B</name></item></result>');
    expect(result.ccbaAsno).toBe("0000120000000");
    expect(result.item.content).toBe("설명 <원문>");
    expect(result.item.name).toBe("A & B");
    expect(() => parseXml("<html>error</html>")).toThrow();
    expect(() => parseXml("<result><item></result>")).toThrow();
  });
  it("0 좌표·해제 유산·1km 밖을 제외한다", () => {
    const make = (latitude, longitude, ccbaCncl = "N") => ({ latitude, longitude, ccbaCncl });
    const nearby = nearbyHeritage({ lat: 35.1, lng: 129.1 }, [make(35.1, 129.1), make(0, 0), make(35.109, 129.1), make(35.108, 129.1), make(35.1, 129.1, "Y")]);
    expect(nearby).toHaveLength(2);
    expect(nearby[0].distance).toBe(0);
    expect(nearby[1].distance).toBeLessThan(1000);
  });
});
describe("장소 연결과 보수적 분류", () => {
  it("장소 전체 이름으로 연결하고 좌표만 가까운 글은 연결하지 않는다", () => {
    expect(normalizeName("범어사(부산)")).toBe("범어사");
    expect(themeMatch({ name: "168계단" }, { PLACE: "초량이바구길, 168계단" })?.field).toBe("PLACE");
    expect(themeMatch({ name: "해운대해수욕장" }, { ITEMCNTNTS: "해운대해수욕장을 걷다" })?.method).toBe("full-name-mention");
    expect(themeMatch({ name: "범어사" }, { ITEMCNTNTS: "범어사의 이야기" })).toBeNull();
    expect(themeMatch({ name: "해운대해수욕장" }, { LAT: 35.1, LNG: 129.1, ITEMCNTNTS: "근처 다른 장소 이야기" })).toBeNull();
  });
  it("TourAPI 소개·주변 유산만으로 충분하다고 세지 않는다", () => {
    const text = "가".repeat(300);
    const tour = { id: "tour", provider: "tourapi", relation: "same-place", originalText: text };
    const heritage = { id: "heritage", provider: "heritage", relation: "nearby-only", originalText: text };
    expect(classify([tour, heritage]).status).toBe("introduction-only");
    expect(classify([heritage]).status).toBe("no-direct-evidence");
    expect(classify([]).status).toBe("no-direct-evidence");
    expect(classify([{ ...heritage, relation: "same-place" }]).status).toBe("sufficient-candidate");
    expect(classify([{ ...heritage, relation: "same-place", originalText: "짧은 설명" }]).status).toBe("introduction-only");
  });
});
