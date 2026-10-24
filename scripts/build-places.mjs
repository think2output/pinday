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
// TourAPI 소개 글에 방문객이 머물 수 있는 실내 공간(체험관·전시실·실내 놀이시설·실내 전망대)이 적힌 곳.
// 야외가 함께 있어도 실내에서 지낼 수 있으면 넣는다. 공원·거리·사찰·배처럼 실내가 부속 시설뿐인 곳은 넣지 않는다.
const INDOOR_IDS = [
  "2496023", // 키자니아 부산 (센텀시티몰 4~6층)
  "3083429", // 벡스코 상상체험 키즈월드 (실내 놀이공간)
  "2470024", // 삼진어묵 체험·역사과학관 (1~3층)
  "3070686", // 부산광역시 119안전체험관 (지하 1층·지상 3층)
  "3442423", // 부산기후변화체험교육관 (지하 1층·지상 2층)
  "2668973", // 부산엑스더스카이 (엘시티 랜드마크타워 전망대)
  "2554068", // 부산영화체험박물관 (전시 체험 시설)
  "3016002", // 부산과학체험관 (과학 체험물)
  "1082315", // 스포원파크재난안전체험관 (체험관·전시관)
  "2554141", // 낙동강문화관 (전시·체험 시설)
  "2456837", // 부산 영화의 전당 (극장·영화도서관, 야외극장도 있음)
  "2755676", // 구포 어린이교통공원 (실내 체험장)
  "3038572", // 몬스터파크 부산명지점 (실내 테마파크)
  "3038622", // 노리클럽 (키즈카페)
  "3060803", // 키위키즈랜드 (실내 어린이 놀이시설)
  "3015559", // 히어로테마파크 정관점 (실내 테마파크)
  "2994680", // 클럽디 오아시스 (엘시티 3~6층 워터파크·스파)
  "2732397", // 물빛색스튜디오 (수중 촬영 스튜디오)
  "3350219", // 을숙도 들락날락 (지하 1층~3층 체험 공간)
  "2733473", // 아미산 전망대 (2층 전시관·3층 실내 전망대)
  "3017347", // 해돋이전망대 (3층 건물, 카페·전망대)
  "2994364", // 송도스카이파크 (지하 1층 케이블카 뮤지엄 등)
  "127149", // 민주공원 (민주항쟁기념관 전시실·공연장)
  "1945300", // 유치환 우체통 전망대 (2층 통유리 전시 공간)
  "3544138", // 부네치아 선셋 전망대 (2층 홍보관·카페)
  "2733472", // 황령산 전망대 (내부 시설)
  "1607286", // 문화공감 수정 (일본식 가옥 내부)
  "3011182", // 문화골목 (복합 문화 공간·객석)
];

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
