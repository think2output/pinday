// 실행: node scripts/collect-docent-evidence.mjs [--limit=3] [--refresh]
// Node.js 로컬/서버에서만 실행한다. 키를 포함한 URL/오류/응답 전체는 저장하지 않는다.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { array, request, heritageList, heritageKey, detailUrl, nearbyHeritage, normalizeName, themeMatch, classify, applyReview, textLength, sleep } from "./lib/docent-evidence.mjs";

process.loadEnvFile(".env");
const key = process.env.DATA_GO_KR_SERVICE_KEY;
if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY가 필요합니다.");
const args = process.argv.slice(2);
if (args.some((a) => a !== "--refresh" && !/^--limit=[1-9]\d*$/.test(a))) throw new Error("옵션: --limit=양의정수, --refresh");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);
const refresh = args.includes("--refresh");
const memory = new Map();
const root = "data/docent";
const out = `${root}/evidence`;
const cache = `${root}/cache`;
await mkdir(out, { recursive: true });
await mkdir(cache, { recursive: true });
const load = async (path) => JSON.parse(await readFile(path, "utf8"));
const save = async (path, data) => {
  const json = JSON.stringify(data, null, 2) + "\n";
  if (json.includes(key) || /[?&]servicekey=/i.test(json)) throw new Error("인증정보 저장 차단");
  await writeFile(path, json);
};
async function cached(name, fetcher) {
  if (memory.has(name)) return memory.get(name);
  const path = `${cache}/${name}.json`;
  if (!refresh) {
    try {
      const result = await load(path);
      memory.set(name, result);
      return result;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const result = { fetchedAt: new Date().toISOString(), ...await fetcher() };
  await save(path, result);
  memory.set(name, result);
  await sleep(120);
  return result;
}
const places = (await load("data/places/places.json")).slice(0, limit);
const themeSnapshot = await readFile("data/places/raw/busan-theme-travel.json", "utf8");
const themeHash = createHash("sha256").update(themeSnapshot).digest("hex");
const themes = JSON.parse(themeSnapshot);
const rules = await load(`${root}/evidence-rules.json`);
const reviewReport = await load(`${root}/reviews/representative-2026-10-24.json`);
// 부산 경계 밖 1km 내 자료도 포함한다. 코드 21 부산·26 울산·38 경남은 실제 목록 응답 확인.
const heritage = { items: [] };
for (const region of ["21", "26", "38"]) {
  const list = await cached(`heritage-list-${region}`, () => heritageList(region));
  heritage.items.push(...list.items);
}
const summary = { generatedAt: new Date().toISOString(), rulesVersion: "paragraph-v2", scope: places.length, counts: { "sufficient-candidate": 0, "introduction-only": 0, "no-direct-evidence": 0, failed: 0 }, totalEvidence: 0, relationCounts: {}, reviewCounts: {}, sourceCounts: { tourapi: 0, heritage: 0, "busan-theme": 0 }, places: [] };
for (const [index, place] of places.entries()) {
  const evidence = [];
  const errors = [];
  try {
    const tour = await cached(`tour-${place.id}`, async () => {
      const url = new URL("https://apis.data.go.kr/B551011/KorService2/detailCommon2");
      url.search = new URLSearchParams({ serviceKey: key, MobileOS: "ETC", MobileApp: "PinDay", _type: "json", contentId: place.id });
      const { data } = await request(url, "json");
      const item = array(data.response.body.items?.item).find((i) => String(i.contentid) === place.id);
      if (!item) throw new Error("TourAPI 상세 없음");
      return { item };
    });
    if (tour.item.overview?.trim()) evidence.push({ id: `tourapi:${place.id}`, provider: "tourapi", source: "한국관광공사 국문 관광정보 TourAPI 4.3", title: tour.item.title, relation: "same-place", originalText: tour.item.overview, url: `https://apis.data.go.kr/B551011/KorService2/detailCommon2?contentId=${place.id}&MobileOS=ETC&MobileApp=PinDay&_type=json`, linkNote: "API 원문 주소. 호출 시 별도 인증키 필요", fetchedAt: tour.fetchedAt, modifiedAt: tour.item.modifiedtime });
  } catch (error) { errors.push({ provider: "tourapi", message: error.message }); }
  for (const { item, distance } of nearbyHeritage(place, heritage.items)) {
    try {
      const record = await cached(`heritage-${heritageKey(item)}`, async () => {
        const { data, raw } = await request(detailUrl(item));
        if (!data.item?.ccbaMnm1 || data.ccbaAsno !== item.ccbaAsno || data.ccbaKdcd !== item.ccbaKdcd || data.ccbaCtcd !== item.ccbaCtcd) throw new Error("국가유산 상세 식별자 불일치");
        return { item: data.item, rawXml: raw };
      });
      if (record.item.content?.trim()) evidence.push({ id: `heritage:${heritageKey(item)}`, provider: "heritage", source: "국가유산청 국가유산 상세정보", title: record.item.ccbaMnm1, relation: normalizeName(place.name) === normalizeName(record.item.ccbaMnm1) ? "same-place" : "nearby-only", distanceMeters: Math.round(distance), coordinates: { lat: Number(item.latitude), lng: Number(item.longitude) }, originalText: record.item.content, url: detailUrl(item), fetchedAt: record.fetchedAt, license: "이용 조건 별도 확인 필요; 이미지·음성은 수집하지 않음" });
    } catch (error) { errors.push({ provider: "heritage", id: heritageKey(item), message: error.message }); }
  }
  for (const story of themes) {
    const match = themeMatch(place, story, rules.aliases[place.id]?.names ?? []);
    if (!match || !story.ITEMCNTNTS?.trim()) continue;
    const { passages, relation, ...matchInfo } = match;
    evidence.push({ id: `busan-theme:${story.UC_SEQ}`, provider: "busan-theme", source: "부산광역시 부산테마여행정보", title: story.TITLE || story.MAIN_TITLE, relation, passages, match: { ...matchInfo, placeName: place.name, review: "pending" }, originalText: story.ITEMCNTNTS, url: `https://apis.data.go.kr/6260000/RecommendedService/getRecommendedKr?UC_SEQ=${story.UC_SEQ}&pageNo=1&numOfRows=1&resultType=json`, linkNote: "API 원문 주소. 호출 시 별도 ServiceKey 필요", sourceSnapshot: "data/places/raw/busan-theme-travel.json", sourceSnapshotSha256: themeHash, sourceSnapshotDate: "unknown" });
  }
  for (const source of evidence) {
    if (source.provider !== "busan-theme") source.passages = [{ text: source.originalText, characters: textLength(source.originalText), reason: "source-description" }];
  }
  const review = reviewReport.reviews.find((r) => r.placeId === place.id);
  applyReview(evidence, review, rules.quarantines);
  const classification = classify(evidence);
  if (errors.length) classification.status = "collection-incomplete";
  const reviewNotes = ["자동 수집 원문이며 사실 검증·장소 연결 검수 전. nearby-only 자료를 해당 장소의 역사로 사용하지 말 것."];
  if (place.id === "126814") reviewNotes.push("출처 충돌: TourAPI는 일제강점기 독립운동, 국가유산청은 임진왜란 순절 제단으로 설명. 해설 생성 전 확인 필요.");
  await save(`${out}/${place.id}.json`, { schemaVersion: 2, rulesVersion: "paragraph-v2", place: { id: place.id, name: place.name, lat: place.lat, lng: place.lng }, collectedAt: new Date().toISOString(), classification, reviewNotes, evidence, errors });
  summary.counts[errors.length ? "failed" : classification.status]++;
  for (const provider of Object.keys(summary.sourceCounts)) if (evidence.some((e) => e.provider === provider)) summary.sourceCounts[provider]++;
  summary.totalEvidence += evidence.length;
  for (const source of evidence) {
    summary.relationCounts[source.relation] = (summary.relationCounts[source.relation] ?? 0) + 1;
    if (source.review) summary.reviewCounts[source.review.status] = (summary.reviewCounts[source.review.status] ?? 0) + 1;
  }
  summary.places.push({ id: place.id, name: place.name, status: classification.status, evidenceCount: evidence.length, errors: errors.length });
  console.log(`[${index + 1}/${places.length}] ${place.name}: ${classification.status} (${evidence.length})`);
}
await save(`${root}/evidence-summary${Number.isFinite(limit) ? "-sample" : ""}.json`, summary);
console.log(JSON.stringify(summary.counts));
if (summary.counts.failed) process.exitCode = 1;
