import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseXml, nearbyHeritage, normalizeName, themeMatch, classify, htmlBlocks, applyReview, sha256 } from "./docent-evidence.mjs";

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
    expect(themeMatch({ name: "168계단" }, { PLACE: "초량이바구길, 168계단", ITEMCNTNTS: "168계단은 산복도로를 잇는다." })?.field).toBe("PLACE");
    expect(themeMatch({ name: "해운대해수욕장" }, { ITEMCNTNTS: "해운대해수욕장은 도시의 해변이다." })?.method).toBe("body-mention");
    expect(themeMatch({ name: "범어사" }, { ITEMCNTNTS: "범어사의 이야기" })).toBeNull();
    expect(themeMatch({ name: "해운대해수욕장" }, { LAT: 35.1, LNG: 129.1, ITEMCNTNTS: "근처 다른 장소 이야기" })).toBeNull();
  });
  it("TourAPI 소개·주변 유산만으로 충분하다고 세지 않는다", () => {
    const text = "가".repeat(300);
    const tour = { id: "tour", provider: "tourapi", relation: "same-place", originalText: text };
    const heritage = { id: "heritage", provider: "heritage", relation: "nearby-only", originalText: text, passages: [{ text }] };
    expect(classify([tour, heritage]).status).toBe("introduction-only");
    expect(classify([heritage]).status).toBe("no-direct-evidence");
    expect(classify([]).status).toBe("no-direct-evidence");
    expect(classify([{ ...heritage, relation: "same-place" }]).status).toBe("sufficient-candidate");
    expect(classify([{ ...heritage, relation: "same-place", originalText: "짧은 설명", passages: [{ text: "짧은 설명" }] }]).status).toBe("introduction-only");
  });
  it("속성·주석·스크립트는 버리고 엔티티와 인라인 글자는 이어 읽는다", () => {
    expect(htmlBlocks('<p>해운대<span>해수욕장</span>&amp;바다</p><img alt="감천문화마을"><!-- 태종대 --><script>복천박물관</script><style>범어사</style>').map(b => b.text)).toEqual(["해운대해수욕장&바다"]);
    expect(themeMatch({ name: "태종대" }, { PLACE: "태종대", ITEMCNTNTS: '<img alt="태종대"><a href="/태종대">코스 보기</a>' })).toBeNull();
  });
  it("다른 장소의 긴 본문으로 한 줄 소개를 충분 근거로 세지 않는다", () => {
    const match = themeMatch({ name: "태종대" }, { PLACE: "태종대", ITEMCNTNTS: '<h2>태종대</h2>태종대는 바위해안이다.<h2>다른 곳</h2>' + "다른 곳의 이야기 ".repeat(100) });
    expect(match.passages).toHaveLength(1);
    expect(classify([{ provider: "busan-theme", relation: match.relation, passages: match.passages, originalText: "전체 글 ".repeat(300) }]).status).toBe("introduction-only");
    const withoutNextHeading = themeMatch({ name: "태종대" }, { PLACE: "태종대", ITEMCNTNTS: '<h2>태종대</h2>짧은 해안 소개.\n\n' + "다른 곳의 이야기 ".repeat(100) });
    expect(withoutNextHeading.passages).toHaveLength(1);
    expect(withoutNextHeading.passages[0].text).toBe("짧은 해안 소개.");
  });
  it("검수에서 찾은 실제 속성 연결·비교·주차장 회귀 사례를 구분한다", () => {
    const stories = JSON.parse(readFileSync("data/places/raw/busan-theme-travel.json", "utf8"));
    const story = (id) => stories.find(s => s.UC_SEQ === id);
    expect(themeMatch({ name: "부산 감천문화마을" }, story(857)).relation).toBe("mentioned-only");
    expect(themeMatch({ name: "태종대" }, story(1218))).toBeNull();
    expect(themeMatch({ name: "부산 감천문화마을" }, story(846)).relation).toBe("mentioned-only");
    expect(themeMatch({ name: "복천박물관" }, story(1184)).relation).toBe("mentioned-only");
    expect(themeMatch({ name: "동아대학교 석당박물관" }, story(303))).toBeNull();
    expect(themeMatch({ name: "동아대학교 석당박물관" }, story(303), ["석당박물관"])).not.toBeNull();
    expect(themeMatch({ name: "부산 구 백제병원" }, story(58), ["옛백제병원"])).not.toBeNull();
  });
  it("제외·미검수·변경된 원문을 충분 근거에서 빼고 원문은 보존한다", () => {
    const text = "가".repeat(350);
    const make = () => ({ id: "source", provider: "heritage", relation: "same-place", originalText: text, passages: [{ text }] });
    const source = make();
    applyReview([source], { selectedExcerpts: [], excludedSources: [{ sourceId: "source", originalTextSha256: sha256(text), reason: "출처 충돌" }] });
    expect(source.review.status).toBe("excluded");
    expect(source.originalText).toBe(text);
    expect(classify([source]).status).toBe("no-direct-evidence");
    const stale = make();
    applyReview([stale], { selectedExcerpts: [], excludedSources: [{ sourceId: "source", originalTextSha256: sha256("예전 원문"), reason: "출처 충돌" }] });
    expect(stale.review.status).toBe("needs-revalidation");
    expect(classify([stale]).supportingIds).toEqual([]);
    const unreviewed = make();
    applyReview([unreviewed], { selectedExcerpts: [], excludedSources: [] });
    expect(classify([unreviewed]).supportingIds).toEqual([]);
  });
  it("검수된 문단만 쓰고 원문 변경 시 문단 사용을 중단한다", () => {
    const originalText = "검수된 소개." + "미검수 뒷부분".repeat(100);
    const review = { excludedSources: [], selectedExcerpts: [{ sourceId: "theme", originalTextSha256: sha256(originalText), start: 0, end: 7, originalText: originalText.slice(0,7) }] };
    const source = { id: "theme", provider: "busan-theme", relation: "mentioned-only", originalText, passages: [] };
    applyReview([source], review);
    expect(source.review.status).toBe("selected-scope");
    expect(source.passages).toHaveLength(1);
    expect(classify([source]).status).toBe("introduction-only");
    const changed = { ...source, originalText: originalText + "수정" };
    applyReview([changed], review);
    expect(changed.review.status).toBe("needs-revalidation");
    expect(changed.passages).toEqual([]);
  });
});
