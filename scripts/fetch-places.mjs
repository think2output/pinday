// 부산 장소 원본 데이터를 받아 data/places/raw/에 저장한다. 키 값은 저장·출력하지 않는다.
// 실행: node scripts/fetch-places.mjs
import { mkdir, writeFile } from "node:fs/promises";

process.loadEnvFile(".env");
const KEY = process.env.DATA_GO_KR_SERVICE_KEY;
if (!KEY) throw new Error(".env에 DATA_GO_KR_SERVICE_KEY가 없어요.");

const OUT = "data/places/raw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 공공데이터포털은 가끔 일시 오류(APPLICATION_ERROR)를 돌려주므로 몇 번 다시 시도한다
async function getJson(url, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    const text = await (await fetch(url)).text();
    try {
      const json = JSON.parse(text);
      if (!json.OpenAPI_ServiceResponse) return json;
    } catch {}
    if (i === tries) throw new Error("응답 오류: " + text.split(KEY).join("***").slice(0, 300));
    await sleep(1000 * i);
  }
}

function tourUrl(op, params) {
  return (
    `https://apis.data.go.kr/B551011/KorService2/${op}?` +
    new URLSearchParams({ serviceKey: KEY, MobileOS: "ETC", MobileApp: "PinDay", _type: "json", ...params })
  );
}

function asArray(items) {
  if (!items || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

async function tourList(op, params) {
  const all = [];
  for (let page = 1; ; page++) {
    const json = await getJson(tourUrl(op, { ...params, numOfRows: "100", pageNo: String(page) }));
    const body = json.response.body;
    all.push(...asArray(body.items));
    if (all.length >= body.totalCount || asArray(body.items).length === 0) return all;
    await sleep(300);
  }
}

async function themeList() {
  const all = [];
  for (let page = 1; ; page++) {
    const url =
      "https://apis.data.go.kr/6260000/RecommendedService/getRecommendedKr?" +
      new URLSearchParams({ ServiceKey: KEY, pageNo: String(page), numOfRows: "100", resultType: "json" });
    const body = (await getJson(url)).getRecommendedKr;
    all.push(...(body.item ?? []));
    if (all.length >= body.totalCount || !body.item?.length) return all;
    await sleep(300);
  }
}

async function save(name, data) {
  await writeFile(`${OUT}/${name}.json`, JSON.stringify(data, null, 2) + "\n");
  console.log(`${name}: ${data.length}건`);
}

await mkdir(OUT, { recursive: true });

// TourAPI 콘텐츠 타입: 12 관광지, 14 문화시설(박물관 등), 28 레포츠
// 지역은 법정동 코드(lDongRegnCd 26 = 부산)로 거른다. 옛 areaCode는 대부분 비어 있어 장소가 크게 빠진다.
for (const [id, label] of [["12", "attractions"], ["14", "culture"], ["28", "leports"]]) {
  await save(`tourapi-${id}-${label}`, await tourList("areaBasedList2", { lDongRegnCd: "26", contentTypeId: id }));
}
await save("tourapi-lcls-names", await tourList("lclsSystmCode2", { lclsSystmListYn: "Y" }));
await save("busan-theme-travel", await themeList());
