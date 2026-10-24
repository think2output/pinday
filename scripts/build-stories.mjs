// 부산테마여행정보 원본에서 홈 이야기 카드용 목록 data/stories/stories.json을 만든다.
// 장소 연결은 도슨트 근거 수집 결과(data/docent/evidence/)의 same-place 연결만 쓴다.
// 격리된 이야기(data/docent/evidence-rules.json quarantines)는 넣지 않는다.
// 실행: node scripts/build-stories.mjs (장소 목록·근거를 다시 만든 뒤 실행)
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const raw = await readJson("data/places/raw/busan-theme-travel.json");
const places = await readJson("data/places/places.json");
const rules = await readJson("data/docent/evidence-rules.json");

const placeById = new Map(places.map((p) => [p.id, p]));
const quarantined = new Set(rules.quarantines.map((q) => q.sourceId));

// 이야기 id → 같은 장소로 연결된 장소 id들 (근거 파일 이름 순서로 고정)
const linked = new Map();
const files = (await readdir("data/docent/evidence")).filter((f) => f.endsWith(".json")).sort();
for (const file of files) {
  const { place, evidence } = await readJson(`data/docent/evidence/${file}`);
  for (const item of evidence) {
    if (item.provider !== "busan-theme" || item.relation !== "same-place") continue;
    if (!linked.has(item.id)) linked.set(item.id, []);
    linked.get(item.id).push(place.id);
  }
}

// "초량이바구길 (한,영,중간,중번,일)"처럼 붙은 번역 언어 표시를 뗀다
const cleanTitle = (title) => title.replace(/\s*\((?:한|영|중간|중번|일)(?:,\s*(?:한|영|중간|중번|일))*\)\s*$/, "").trim();

const stories = [];
for (const item of raw) {
  const id = `busan-theme:${item.UC_SEQ}`;
  if (quarantined.has(id)) continue;
  const placeIds = (linked.get(id) ?? []).filter((placeId) => placeById.has(placeId));
  // 사진은 연결된 장소 중 TourAPI 사진이 있는 첫 장소의 것을 쓴다(부산테마여행 사진은 이용 조건 미확인)
  const photoPlace = placeIds.map((placeId) => placeById.get(placeId)).find((p) => p.image);
  stories.push({
    id,
    title: cleanTitle(item.MAIN_TITLE),
    // 카드 글: 부제목, 없으면 원본 제목
    subtitle: item.SUBTITLE.trim() || item.TITLE.trim(),
    region: `부산광역시 ${item.GUGUN_NM}`,
    kind: item.CATE2_NM,
    placeIds,
    photo: photoPlace
      ? { url: photoPlace.image.url, license: photoPlace.image.license, placeName: photoPlace.name }
      : null,
  });
}

// 이번 주 부산 이야기: 임시 목록(사용자가 고르기 전). 사진·부제목이 있는 이야기 중 서로 다른 구에서 4편
const weekly = [];
const usedRegions = new Set();
for (const story of stories) {
  if (weekly.length === 4) break;
  if (!story.photo || !raw.find((r) => `busan-theme:${r.UC_SEQ}` === story.id).SUBTITLE.trim()) continue;
  if (usedRegions.has(story.region)) continue;
  usedRegions.add(story.region);
  weekly.push(story.id);
}

await mkdir("data/stories", { recursive: true });
await writeFile(
  "data/stories/stories.json",
  JSON.stringify({ weekly, weeklyNote: "임시 목록: 사용자가 고르기 전", stories }, null, 2) + "\n",
);
console.log(`이야기 ${stories.length}편 (사진 있음 ${stories.filter((s) => s.photo).length}), 이번 주 ${weekly.join(", ")}`);
