// Node.js 로컬 수집 전용. 브라우저/화면 코드에서 가져오지 않는다.
import { XMLParser, XMLValidator } from "fast-xml-parser";

const parser = new XMLParser({ parseTagValue: false, trimValues: true });
export const array = (value) => value == null || value === "" ? [] : Array.isArray(value) ? value : [value];
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function parseXml(xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error("올바르지 않은 XML 응답");
  const result = parser.parse(xml).result;
  if (!result) throw new Error("국가유산 응답에 result가 없음");
  return result;
}
export async function request(url, format = "xml") {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      const data = format === "xml" ? parseXml(raw) : JSON.parse(raw);
      if (format === "json" && data.response?.header?.resultCode !== "0000") throw new Error("공공데이터 API 결과 오류");
      return { data, raw };
    } catch {
      // fetch 오류에는 인증 URL이 들어갈 수 있어 원래 오류/URL을 출력하지 않는다.
      if (attempt === 3) throw new Error(`${format} API 요청 실패 (4회 시도)`);
      await sleep(1000 * (attempt + 1));
    }
  }
}
export function heritageUrl(operation, params) {
  return `https://www.khs.go.kr/cha/${operation}.do?${new URLSearchParams(params)}`;
}
export function heritageKey(item) {
  return [item.ccbaKdcd, item.ccbaCtcd, item.ccbaAsno].join("-");
}
export function detailUrl(item) {
  return heritageUrl("SearchKindOpenapiDt", { ccbaKdcd: item.ccbaKdcd, ccbaCtcd: item.ccbaCtcd, ccbaAsno: item.ccbaAsno });
}
export async function heritageList(region = "21") {
  const items = [];
  const pages = [];
  for (let page = 1; ; page++) {
    const url = heritageUrl("SearchKindOpenapiList", { ccbaCtcd: region, pageUnit: "100", pageIndex: String(page) });
    const { data, raw } = await request(url);
    const batch = array(data.item);
    if (!Number.isFinite(Number(data.totalCnt))) throw new Error("유산 목록 totalCnt 없음");
    if (!batch.length && items.length < Number(data.totalCnt)) throw new Error("유산 목록이 중간에 끊김");
    items.push(...batch);
    pages.push({ url, raw });
    if (items.length >= Number(data.totalCnt)) break;
    await sleep(150);
  }
  return { items, pages };
}
export function validCoords(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) > 33 && Number(lat) < 39 && Number(lng) > 124 && Number(lng) < 132;
}
export function distanceMeters(a, b) {
  const rad = (n) => n * Math.PI / 180;
  const dlat = rad(b.lat - a.lat), dlng = rad(b.lng - a.lng);
  const v = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, v)));
}
export function nearbyHeritage(place, items) {
  if (!validCoords(place.lat, place.lng)) return [];
  return items.filter((item) => item.ccbaCncl === "N" && validCoords(item.latitude, item.longitude))
    .map((item) => ({ item, distance: distanceMeters(place, { lat: Number(item.latitude), lng: Number(item.longitude) }) }))
    .filter(({ distance }) => distance <= 1000).sort((a, b) => a.distance - b.distance);
}
export function normalizeName(value) {
  return String(value).normalize("NFKC").replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/^부산(?:광역시)?\s*/, "").replace(/[\s·ㆍ\-]/g, "").trim();
}
export function themeMatch(place, story) {
  const name = normalizeName(place.name);
  const fields = ["PLACE", "MAIN_PLACE", "MAIN_TITLE", "TITLE"];
  for (const field of fields) {
    if (String(story[field] ?? "").split(/[,，\n/]/).some((part) => normalizeName(part) === name)) return { field, method: "exact-name" };
  }
  // 근접 좌표만으로 글 전체를 연결하지 않는다. 전체 장소명이 명시된 경우만 후보로 수집.
  if (name.length >= 4 && normalizeName(story.ITEMCNTNTS ?? "").includes(name)) return { field: "ITEMCNTNTS", method: "full-name-mention" };
  return null;
}
export function textLength(text) {
  return String(text).replace(/<[^>]*>/g, "").replace(/\s/g, "").length;
}
export function classify(evidence) {
  // 주변 유산은 해당 장소의 역사라는 근거가 아니다. 직접 연결된 추가 자료만 집계.
  const supporting = evidence.filter((e) => e.relation === "same-place" && e.provider !== "tourapi" && textLength(e.originalText) >= 300);
  const hasDirectText = evidence.some((e) => e.relation === "same-place" && textLength(e.originalText) > 0);
  return { status: supporting.length ? "sufficient-candidate" : hasDirectText ? "introduction-only" : "no-direct-evidence", supportingIds: supporting.map((e) => e.id), humanReview: "pending" };
}
