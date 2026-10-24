// .env의 키가 동작하는지 API마다 한 번씩 불러 확인한다. 키 값은 출력하지 않는다.
// 실행: node scripts/check-keys.mjs
process.loadEnvFile(".env");

const keys = ["DATA_GO_KR_SERVICE_KEY", "KMA_APIHUB_AUTH_KEY"]
  .map((name) => process.env[name])
  .filter(Boolean);

// 혹시 응답에 키가 섞여 나와도 가린다
function redact(text) {
  return keys.reduce((t, k) => t.split(k).join("***"), String(text));
}

function todayKst() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replaceAll("-", "");
}

const checks = [
  {
    name: "TourAPI 국문 관광정보 (부산 관광지)",
    env: "DATA_GO_KR_SERVICE_KEY",
    url: (key) =>
      "https://apis.data.go.kr/B551011/KorService2/areaBasedList2?" +
      new URLSearchParams({
        serviceKey: key,
        MobileOS: "ETC",
        MobileApp: "PinDay",
        _type: "json",
        areaCode: "6",
        contentTypeId: "12",
        numOfRows: "1",
        pageNo: "1",
      }),
  },
  {
    name: "부산테마여행정보",
    env: "DATA_GO_KR_SERVICE_KEY",
    url: (key) =>
      "https://apis.data.go.kr/6260000/RecommendedService/getRecommendedKr?" +
      new URLSearchParams({ ServiceKey: key, pageNo: "1", numOfRows: "1", resultType: "json" }),
  },
  {
    name: "기상청 API허브 단기예보 (부산)",
    env: "KMA_APIHUB_AUTH_KEY",
    url: (key) =>
      "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?" +
      new URLSearchParams({
        authKey: key,
        pageNo: "1",
        numOfRows: "1",
        dataType: "JSON",
        base_date: todayKst(),
        base_time: "0500",
        nx: "98",
        ny: "76",
      }),
  },
];

for (const check of checks) {
  const key = process.env[check.env];
  if (!key) {
    console.log(`✗ ${check.name}: .env에 ${check.env}가 비어 있음`);
    continue;
  }
  try {
    const res = await fetch(check.url(key));
    const body = await res.text();
    console.log(`${res.ok ? "·" : "✗"} ${check.name}: HTTP ${res.status}`);
    console.log("  " + redact(body.slice(0, 400)).replace(/\s+/g, " "));
  } catch (err) {
    console.log(`✗ ${check.name}: 요청 실패 (${redact(err.message)})`);
  }
}
