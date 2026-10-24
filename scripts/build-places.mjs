// 원본(data/places/raw/)에서 서비스용 장소 목록 data/places/places.json을 만든다.
// 분류 규칙은 docs/분류표.md와 같아야 한다. 규칙을 바꾸면 둘 다 고친다.
// 실행: node scripts/build-places.mjs
import { readFile, writeFile } from "node:fs/promises";

const RAW = "data/places/raw";
const read = async (name) => JSON.parse(await readFile(`${RAW}/${name}.json`, "utf8"));

// 법정동 시군구 코드 → 구·군 이름 (TourAPI ldongCode2, lDongRegnCd=26)
const GUGUN = {
  110: "중구", 140: "서구", 170: "동구", 200: "영도구", 230: "부산진구", 260: "동래구",
  290: "남구", 320: "북구", 350: "해운대구", 380: "사하구", 410: "금정구", 440: "강서구",
  470: "연제구", 500: "수영구", 530: "사상구", 710: "기장군",
};

// 문화시설(콘텐츠 타입 14) 중 넣는 분류: 박물관·기념관·전시관·과학관·미술관·수족관
const CULTURE_INCLUDE = ["VE070100", "VE070200", "VE070300", "VE070500", "VE070600", "VE020400"];

// 목록에서 빼는 장소: 일반 회사·업체로 보이는 곳, 고속도로 휴게소
const EXCLUDE_IDS = ["3511000", "3510987", "3511057", "3511018", "3511071", "2782772"];

// 취향 유형 → 분류 코드. 코드가 이 값으로 시작하면 해당 취향. 한 장소가 여러 취향에 들어갈 수 있다.
const TASTE_RULES = {
  // 이바구길 골목 산책자
  alley: [
    "VE040100", // 골목길, 문화거리
    "VE040200", // 마을관광지
    "VE040300", // 둘레길
    "EX030100", // 체험마을
    "VE050100", // 관광단지
    "HS011100", // 근대건축물
  ],
  // 광안리 노을 감상가
  sunset: [
    "NA020900", // 해변. 해수욕장
    "NA020800", // 해안절경 (파도 탐험가와 겹침)
    "NA020500", // 섬
    "NA020700", // 항구/포구
    "VE010300", // 다리 / 대교
    "VE010400", // 분수
    "VE010800", // 등대
    "VE030500", // 주제공원
  ],
  // 동래성 시간 여행자
  history: [
    "HS01", // 역사유적지 전부
    "HS020100", // 탑ㆍ비석ㆍ기념탑
    "HS03", // 종교성지 전부
    "VE070100", // 박물관
    "VE070200", // 기념관
  ],
  // 태종대 파도 탐험가
  wave: [
    "NA020800", // 해안절경
    "VE010200", // 타워 / 전망대
    "NA01", // 자연경관(산) 전부
    "NA040400", // 지질공원
    "NA040500", // 생태관광지
    "NA040600", // 자연휴양림
    "VE020100", // 테마파크
    "EX070100", // 유람선/잠수함관광
  ],
};

// 실내 분류. 나머지는 야외. 장소마다 다른 분류(전망대·테마파크 등)는 기본 야외, 실내인 곳만 INDOOR_IDS에 추가한다.
const INDOOR_PREFIXES = ["VE07", "VE020400", "EX05", "VE120300"];
const INDOOR_IDS = [];

const lcls = await read("tourapi-lcls-names");
const lclsName = Object.fromEntries(lcls.map((x) => [x.lclsSystm3Cd, `${x.lclsSystm2Nm} > ${x.lclsSystm3Nm}`]));

const attractions = await read("tourapi-12-attractions");
const culture = (await read("tourapi-14-culture")).filter((x) => CULTURE_INCLUDE.includes(x.lclsSystm3));

const places = [...attractions, ...culture]
  .filter((x) => !EXCLUDE_IDS.includes(x.contentid))
  .map((x) => {
    const code = x.lclsSystm3;
    const gugun = GUGUN[x.lDongSignguCd];
    if (!gugun) throw new Error(`구·군 코드를 모르는 장소: ${x.contentid} ${x.title}`);
    return {
      id: x.contentid,
      name: x.title,
      region: `부산광역시 ${gugun}`,
      address: [x.addr1, x.addr2].filter(Boolean).join(" "),
      lat: Number(x.mapy),
      lng: Number(x.mapx),
      kind: x.contenttypeid === "12" ? "attraction" : "culture",
      category: lclsName[code] ?? code,
      categoryCode: code,
      tastes: Object.entries(TASTE_RULES)
        .filter(([, prefixes]) => prefixes.some((p) => code.startsWith(p)))
        .map(([taste]) => taste),
      indoor: INDOOR_PREFIXES.some((p) => code.startsWith(p)) || INDOOR_IDS.includes(x.contentid),
      image: x.firstimage ? { url: x.firstimage, thumb: x.firstimage2 || x.firstimage, license: x.cpyrhtDivCd || null } : null,
      tel: x.tel || null,
      modifiedAt: x.modifiedtime,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "ko"));

await writeFile("data/places/places.json", JSON.stringify(places, null, 2) + "\n");

const count = (fn) => places.filter(fn).length;
console.log(`장소 ${places.length}곳 (관광지 ${count((p) => p.kind === "attraction")}, 문화시설 ${count((p) => p.kind === "culture")})`);
for (const t of Object.keys(TASTE_RULES)) console.log(`  ${t}: ${count((p) => p.tastes.includes(t))}`);
console.log(`  취향 없음: ${count((p) => p.tastes.length === 0)}, 여러 취향: ${count((p) => p.tastes.length > 1)}`);
console.log(`  실내: ${count((p) => p.indoor)}, 사진 없음: ${count((p) => !p.image)}`);
