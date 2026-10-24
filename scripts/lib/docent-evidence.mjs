// Node.js 로컬 수집 전용. 브라우저/화면 코드에서 가져오지 않는다.
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Parser } from "htmlparser2";
import { createHash } from "node:crypto";

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
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const compact = (text) => String(text).normalize("NFKC").replace(/[\s·ㆍ\-]/g, "");
// 속성·주석·스크립트를 읽지 않고 텍스트 노드와 문단/소제목 경계만 사용한다.
export function htmlBlocks(html) {
  const blocks = [];
  let buffer = "", ignored = 0;
  const headings = [];
  const blockTags = new Set(["p", "div", "section", "article", "li", "tr", "td", "h1", "h2", "h3", "h4", "h5", "h6", "br"]);
  const hiddenTags = new Set(["script", "style", "template", "noscript"]);
  const flush = () => {
    for (const part of buffer.split(/\n\s*\n/)) {
      const text = part.replace(/\s+/g, " ").trim();
      if (text) blocks.push({ kind: headings.length ? "heading" : "paragraph", text });
    }
    buffer = "";
  };
  const parser = new Parser({
    onopentag(name, attrs) {
      if (hiddenTags.has(name)) { ignored++; return; }
      if (ignored) return;
      if (blockTags.has(name)) flush();
      if (/^h[1-6]$/.test(name) || (name === "p" && /font-size(?:20|23|28)\b/.test(attrs.class ?? ""))) headings.push(name);
    },
    ontext(text) { if (!ignored) buffer += text; },
    onclosetag(name) {
      if (hiddenTags.has(name)) { ignored = Math.max(0, ignored - 1); return; }
      if (ignored) return;
      if (blockTags.has(name)) flush();
      if (headings.at(-1) === name) headings.pop();
    },
  }, { decodeEntities: true });
  parser.end(String(html));
  flush();
  return blocks;
}
function navigationOrComparison(text, names) {
  const normalized = compact(text);
  return /^(?:위치|주소|추천코스|코스\d|바로가기|https?:)/.test(normalized)
    || /전용주차장|주차장|[→]/.test(normalized)
    || (text.match(/\s[-–]\s/g)?.length ?? 0) >= 2
    || names.some((name) => ["보다", "처럼", "근처", "인근", "방면", "을정면으로", "를정면으로"].some((suffix) => normalized.includes(name + suffix)));
}
export function themeMatch(place, story, aliases = []) {
  const names = [...new Set([normalizeName(place.name), ...aliases.map(normalizeName)])].filter(Boolean);
  const fields = ["PLACE", "MAIN_PLACE", "MAIN_TITLE", "TITLE"];
  const field = fields.find((f) => String(story[f] ?? "").split(/[,，\n/]/).some((part) => names.includes(normalizeName(part))));
  const blocks = htmlBlocks(story.ITEMCNTNTS ?? "");
  const mentioned = blocks.some((block) => names.some((name) => compact(block.text).includes(name)));
  // 메타데이터에 이름이 있어도 본문이 비어 있거나 이미지 속성에만 있으면 연결하지 않는다.
  if (!mentioned || (!field && !names.some((name) => name.length >= 4 && blocks.some((block) => compact(block.text).includes(name))))) return null;
  let ownHeading = false;
  const passages = [];
  for (const block of blocks) {
    if (block.kind === "heading") {
      const title = normalizeName(block.text);
      ownHeading = !/[\/→,]|말고|근처|인근|보다|추천코스/.test(block.text) && names.some((name) => title === name || (title.includes(name) && title.length <= name.length + 12));
      continue;
    }
    // 소제목의 문맥은 바로 다음 문단에만 적용한다. 뒤의 다른 장소 문단까지 이어 붙이지 않는다.
    const followsHeading = ownHeading;
    ownHeading = false;
    if (navigationOrComparison(block.text, names)) continue;
    const text = compact(block.text).replace(/^부산(?:광역시)?/, "");
    const startsDescription = names.some((name) => text.startsWith(name) && /^(?:은|는|이|가|의|에는|에서는|에위치|에자리|으로|로불)/.test(text.slice(name.length)));
    const explicitSubject = names.some((name) => ["은", "는"].some((suffix) => text.includes(name + suffix)));
    if (followsHeading || startsDescription || explicitSubject) passages.push({ text: block.text, reason: followsHeading ? "place-heading" : "place-subject", characters: textLength(block.text) });
  }
  return { field: field ?? "ITEMCNTNTS", method: field ? "exact-name-and-body" : "body-mention", matchedNames: names, relation: passages.length ? "same-place" : "mentioned-only", passages };
}
export function textLength(text) {
  return htmlBlocks(text).map((block) => block.text).join("").replace(/\s/g, "").length;
}
export function applyReview(evidence, review, quarantines = []) {
  for (const source of evidence) {
    const hash = sha256(source.originalText);
    const quarantine = quarantines.find((rule) => rule.sourceId === source.id);
    const excluded = review?.excludedSources.find((rule) => rule.sourceId === source.id);
    const selected = review?.selectedExcerpts.filter((rule) => rule.sourceId === source.id) ?? [];
    const rule = quarantine ?? excluded;
    if (rule) {
      source.review = { status: rule.originalTextSha256 === hash ? "excluded" : "needs-revalidation", reason: rule.reason, humanReview: "pending" };
      source.passages = [];
    } else if (selected.length) {
      const valid = selected.every((rule) => rule.originalTextSha256 === hash && source.originalText.slice(rule.start, rule.end) === rule.originalText);
      source.review = { status: valid ? "selected-scope" : "needs-revalidation", humanReview: "pending" };
      if (valid) {
        source.passages = selected.map((rule) => ({ text: htmlBlocks(rule.originalText).map((b) => b.text).join("\n\n"), reason: "ai-reviewed-scope", characters: textLength(rule.originalText) }));
        if (source.provider === "busan-theme") { source.autoRelation = source.relation; source.relation = "same-place"; }
      } else source.passages = [];
    } else if (review) source.review = { status: "unreviewed", humanReview: "pending" };
  }
}
export function classify(evidence) {
  // 주변 유산은 해당 장소의 역사라는 근거가 아니다. 직접 연결된 추가 자료만 집계.
  const usable = evidence.filter((e) => !["excluded", "needs-revalidation", "unreviewed"].includes(e.review?.status));
  const supporting = usable.filter((e) => e.relation === "same-place" && e.provider !== "tourapi" && (e.passages ?? []).some((p) => textLength(p.text) >= 300));
  // 미검수 소개는 존재 여부만 집계한다. 충분 근거/생성 허용과 구분한다.
  const hasDirectText = evidence.some((e) => !["excluded", "needs-revalidation"].includes(e.review?.status) && e.relation === "same-place" && textLength(e.originalText) > 0);
  return { status: supporting.length ? "sufficient-candidate" : hasDirectText ? "introduction-only" : "no-direct-evidence", supportingIds: supporting.map((e) => e.id), humanReview: "pending" };
}
