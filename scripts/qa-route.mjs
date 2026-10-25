// 로컬 빌드 화면 검증. 경로 API는 모두 시험 응답으로 가로채므로 카카오 경로 호출이 없다.
// 실행: localhost:3000 서버를 켠 뒤 node scripts/qa-route.mjs
// ROUTE_QA_URL로 다른 로컬 주소 지정 가능. 지도는 카카오에 등록된 주소에서 확인한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.ROUTE_QA_URL ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "로컬 서버에서만 실행하세요");
const out = "docs/design/route-ux";
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-route-qa-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
const requests = [];
let failNext = false;
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((tab) => tab.type === "page"); } catch {}
  }
  assert(target, "Chrome 연결 실패");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  let sequence = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, `화면 실행 실패: ${expression}`);
    return result.result?.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error(`화면 대기 실패: ${expression}`);
  };
  ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    requests.push(url.search);
    const failure = failNext;
    failNext = false;
    const leg = url.searchParams.get("mode") === "walk"
      ? { kind: "walk", minutes: 42, meters: 2400, steps: [], lines: [{ type: "WALKING", points: [[35.09746, 129.0106], [35.07393, 129.01646]] }] }
      : { kind: "transit", minutes: 28, transfers: 1, steps: [
        { type: "BUS", minutes: 10, names: ["시험 버스 61"], board: "시험 승차 A", alight: "시험 하차 B", stopCount: 4 },
        { type: "WALKING", minutes: 3, names: [], board: null, alight: null, stopCount: 0 },
        { type: "SUBWAY", minutes: 8, names: ["시험 1호선"], board: "시험 환승 C", alight: "시험 하차 D", stopCount: 2 },
      ], lines: [{ type: "BUS", points: [[35.09746, 129.0106], [35.085, 129.013]] }, { type: "SUBWAY", points: [[35.085, 129.013], [35.07393, 129.01646]] }] };
    await send("Fetch.fulfillRequest", { requestId, responseCode: failure ? 502 : 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(failure ? { error: { code: "ROUTE_UNAVAILABLE", message: "시험 경로 오류" } } : { leg })).toString("base64") });
  });
  await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*", requestStage: "Request" }] });
  await send("Page.navigate", { url: `${base}/route` });
  await waitFor("document.readyState === 'complete'");
  const trip = { version: 1, regions: [], startDate: "2026-10-26", endDate: "2026-10-28", periodSource: "user", taste: null, candidates: ["1997221", "126122", "2684712", "1825843", "2907087"], days: [["1997221", "126122", "2684712", "1825843"], [], ["2907087"]] };
  const store = async (value) => evaluate(`localStorage.setItem('pinday:trip', ${JSON.stringify(JSON.stringify(value))})`);
  const navigate = async (path) => { await send("Page.navigate", { url: `${base}${path}` }); await waitFor("document.readyState === 'complete' && !!document.querySelector('main h1')"); };
  const textHas = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const click = (text, selector = "button") => evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.getClientRects().length && el.textContent.trim() === ${JSON.stringify(text)})?.click()`);
  const assertLayout = async () => {
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "화면 가로 넘침");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('main button, main a, main summary')].filter(el => { if (el.closest('[role=region]')) return false; const r=el.getBoundingClientRect(); return r.width && r.height && (r.height < 44 || r.width < 44); }).map(el => el.textContent.trim())"), [], "44px 미만 자체 버튼");
  };
  mkdirSync(out, { recursive: true });
  const screenshot = async (name, width) => {
    await evaluate("document.activeElement?.blur()");
    await evaluate("(() => { document.getElementById('qa-note')?.remove(); const note=document.createElement('div'); note.id='qa-note'; note.textContent='QA 시험 응답 · 실제 경로 정보 아님'; note.style.cssText='position:fixed;bottom:0;left:0;z-index:9999;background:white;color:black;padding:4px;font-size:12px';document.body.append(note); })()");
    const height = await evaluate("Math.min(document.documentElement.scrollHeight, 3000)");
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(join(out, `${name}.png`), Buffer.from(shot.data, "base64"));
  };
  for (const width of [390, 1050, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await store(trip);
    await navigate("/route?day=1");
    await waitFor(textHas("시험 버스 61"));
    if (width === 390) {
      assert.equal(await evaluate("document.querySelector('details').open"), false, "휴대폰 승하차 기본 접힘");
      await evaluate("document.querySelector('summary').click()");
      await waitFor(textHas("시험 승차 A에서 타고 4정류장 → 시험 하차 B에서 내려요"));
      assert(await evaluate(textHas("시험 환승 C에서 타고 2정류장 → 시험 하차 D에서 내려요")), "환승별 안내");
      await evaluate("document.querySelector('summary').click()");
    } else {
      assert(await evaluate("document.getElementById('route-leg-detail').innerText.includes('시험 환승 C에서 타고')"), "PC 환승별 안내");
      assert.equal(await evaluate("[...document.querySelectorAll('section[aria-label=\"장소와 이동 구간\"]')].filter(el => el.getClientRects().length).length"), 0, "PC 세로 목록 숨김");
      await evaluate("document.getElementById('route-leg-tab-0').focus()");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" });
      await waitFor("document.getElementById('route-leg-tab-1').getAttribute('aria-selected') === 'true'");
      assert(await evaluate("document.getElementById('route-leg-detail').innerText.includes('선택한 구간 2 / 3')"));
      await click("← 이전 구간");
    }
    await assertLayout();
    await waitFor("!document.body.innerText.includes('지도를 불러오고 있어요')");
    console.log(JSON.stringify({ width, mapSdkLoaded: await evaluate("!!window.kakao?.maps?.Map"), mapFailureMessage: await evaluate(textHas("지도를 불러오지 못했어요")) }));
    await screenshot(`qa-a-transit-${width}`, width);
    await click("도보");
    await waitFor(textHas("2,400m"));
    assert.equal(await evaluate("localStorage.getItem('pinday:trip')"), JSON.stringify(trip), "수단 선택으로 여행 저장값이 바뀌면 안 됨");
    assert.equal(await evaluate("[...document.querySelectorAll('a[href*=\"map.kakao.com/link/by\"]')].find(el => el.getClientRects().length).href.includes('/walk/')"), true);
    if (width > 390) {
      await click("다음 구간 →");
      assert.equal(await evaluate("document.querySelector('#route-leg-detail button').getAttribute('aria-pressed')"), "true", "다른 구간 수단 유지");
      await waitFor("document.querySelectorAll('[data-route-stop][data-selected=true]').length === 2");
      assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-route-stop][data-selected=true]')].map(el=>el.dataset.routeStop)"), ["2", "3"], "선택한 구간 지도 번호 강조");
      await click("← 이전 구간");
      assert.equal(await evaluate("document.getElementById('route-leg-detail').innerText.includes('2,400m')"), true, "앞 구간 도보 선택 유지");
    }
    await assertLayout();
    if (width === 390) {
      await evaluate("document.querySelector('button[aria-label*=\"누르면 지도\"]').click()");
      assert.equal(await evaluate("document.querySelector('button[aria-label*=\"누르면 지도\"]').getAttribute('aria-pressed')"), "true", "휴대폰 구간 강조 선택");
      assert(await evaluate("document.querySelector('section[aria-label=\"장소와 이동 구간\"]').getBoundingClientRect().top < document.querySelector('section[aria-label*=\"경로 지도\"]').getBoundingClientRect().top"), "휴대폰은 목록 먼저");
    }
    await screenshot(`qa-a-mixed-${width}`, width);
    await evaluate("document.querySelector('[role=tablist][aria-label=날짜] [aria-selected=true]').focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" });
    await waitFor(textHas("이동할 구간이 없어요"));
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-selected')"), "true");
    await navigate("/route?day=3");
    await waitFor(textHas("지도 위치를 확인할 수 없어"));
    await assertLayout();
  }
  await store({ ...trip, days: [[], ["1997221", "126122"], []] });
  failNext = true;
  await navigate("/route?day=2");
  await waitFor(textHas("시험 경로 오류"));
  await click("다시 시도");
  await waitFor(textHas("시험 버스 61"));
  const places = JSON.parse(readFileSync("data/places/places.json", "utf8"));
  const manyIds = places.filter((place) => place.lat >= 34 && place.lat <= 36 && place.lng >= 128 && place.lng <= 130).slice(0, 12).map((place) => place.id);
  await store({ ...trip, candidates: manyIds, days: [manyIds, [], []] });
  await navigate("/route?day=1");
  await waitFor(textHas("시험 버스 61"));
  await evaluate("document.getElementById('route-leg-tab-0').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "End", code: "End" });
  await waitFor("document.getElementById('route-leg-tab-10').getAttribute('aria-selected') === 'true'");
  await waitFor("(() => {const el=document.getElementById('route-leg-tab-10');const parent=el.closest('[role=tablist]');const a=el.getBoundingClientRect(),b=parent.getBoundingClientRect();return a.left>=b.left && a.right<=b.right;})()");
  await assertLayout();
  await screenshot("qa-a-12places-1440", 1440);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await assertLayout();
  await send("Emulation.setDeviceMetricsOverride", { width: 1050, height: 900, deviceScaleFactor: 1, mobile: false });
  await waitFor("(() => {const el=document.getElementById('route-leg-tab-10');const parent=el.closest('[role=tablist]');const a=el.getBoundingClientRect(),b=parent.getBoundingClientRect();return a.left>=b.left && a.right<=b.right;})()");
  assert.equal(await evaluate("document.querySelector('[role=region]').getBoundingClientRect().width > 300"), true, "지도 크기 변경 반영");
  await assertLayout();
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await store(trip);
  await evaluate("window.dispatchEvent(new StorageEvent('storage',{key:'pinday:trip'}))");
  await waitFor("document.getElementById('route-leg-tab-0').getAttribute('aria-selected') === 'true'");
  assert(await evaluate("document.getElementById('route-leg-detail').innerText.includes('선택한 구간 1 / 3')"), "일정 변경으로 사라진 구간의 선택 복구");
  await store({ ...trip, days: [[], [], ["2907087"]] });
  await navigate("/route?day=1");
  await waitFor(textHas("이동할 구간이 없어요"));
  assert.equal(await evaluate("!!document.getElementById('route-leg-detail')"), false, "구간이 사라지면 선택 설명 제거");
  const longTrip = { ...trip, endDate: "2026-11-08", days: Array.from({ length: 14 }, (_, i) => i === 13 ? trip.days[0] : []) };
  await store(longTrip);
  await navigate("/route?day=14");
  await waitFor(textHas("시험 버스 61"));
  await assertLayout();
  await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["*dapi.kakao.com/v2/maps/sdk.js*"] });
  await store(trip);
  await navigate("/route?day=1");
  await waitFor(textHas("지도를 불러오지 못했어요"));
  await click("다음 구간 →");
  assert(await evaluate("document.getElementById('route-leg-detail').innerText.includes('선택한 구간 2 / 3')"), "지도 실패에도 구간 선택 가능");
  await screenshot("qa-a-map-failure-1440", 1440);
  await evaluate("localStorage.removeItem('pinday:trip')");
  await navigate("/route");
  await waitFor(textHas("자동으로 정했어요"));
  console.log(JSON.stringify({ passed: true, widths: [390, 1050, 1440], checks: ["PC A안 구간 선택·지도 번호 강조", "키보드 구간·날짜 이동", "12곳 가로 이동", "휴대폰 목록 유지", "환승별 승하차", "구간별 수단 독립", "도보 외부 링크", "빈 날", "좌표 오류", "오류 재시도", "지도 실패", "14일 일정", "자동 여행", "가로 넘침 없음", "주요 버튼 44px"], interceptedRouteRequests: requests.length, liveKakaoRouteRequests: 0 }));
} finally {
  ws?.close();
  chrome.kill();
}
