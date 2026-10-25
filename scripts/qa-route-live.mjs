// 명시적으로 --run을 붙일 때만 실제 로컬 API를 수단별 한 번씩 조회한다.
// 서버 캐시 포함 외부 경로 API 최대 2건. 키·.env는 이 스크립트에서 읽지 않는다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

if (!process.argv.includes("--run")) {
  console.log("미리보기: 감천문화마을→송도해수욕장 대중교통/도보 각 1회. 실제 실행은 --run 필요. 외부 경로 최대 2건.");
  process.exit(0);
}
const base = process.env.ROUTE_QA_URL ?? "http://localhost:3000";
assert.equal(new URL(base).hostname, "localhost", "등록된 localhost 서버에서만 실행하세요");
const out = "docs/design/route-ux";
const from = "1997221", to = "126122";
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9336", `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-route-live-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const passedRequests = new Set(), records = new Map(), responses = new Map();
let ws, failure;
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch("http://127.0.0.1:9336/json")).json()).find((tab) => tab.type === "page"); } catch {}
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
  ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    try {
      if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const url = new URL(request.url), mode = url.searchParams.get("mode");
        if (url.searchParams.get("from") === from && url.searchParams.get("to") === to && ["transit", "walk"].includes(mode) && !passedRequests.has(mode)) {
          passedRequests.add(mode);
          await send("Fetch.continueRequest", { requestId });
        } else {
          failure = new Error("수단별 1회 검증 범위를 벗어난 요청을 차단했습니다");
          await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
        }
      }
      if (message.method === "Network.responseReceived") {
        const { requestId, response } = message.params;
        const url = new URL(response.url);
        if (url.origin === base && url.pathname === "/api/route") responses.set(requestId, { mode: url.searchParams.get("mode"), status: response.status });
      }
      if (message.method === "Network.loadingFinished" && responses.has(message.params.requestId)) {
        const requestId = message.params.requestId;
        const body = await send("Network.getResponseBody", { requestId });
        records.set(responses.get(requestId).mode, { ...responses.get(requestId), body: JSON.parse(body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body) });
      }
    } catch { failure = new Error("실제 응답을 읽는 중 오류가 발생했습니다"); }
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, "화면 확인 스크립트 오류");
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 240; i++) { if (failure) throw failure; if (await evaluate(expression)) return; await sleep(100); }
    throw new Error("실제 화면 응답 대기 시간 초과");
  };
  const waitForResponse = async (mode) => {
    for (let i = 0; i < 240 && !records.has(mode); i++) { if (failure) throw failure; await sleep(100); }
    const record = records.get(mode);
    assert(record, `${mode} 응답 대기 시간 초과`);
    assert.equal(record.status, 200, `${mode} 실패: ${record.body?.error?.code ?? record.status}`);
    assert.equal(record.body.leg?.kind, mode === "transit" ? "transit" : "walk");
    const { leg } = record.body;
    assert(leg.minutes > 0 && leg.lines.some((line) => line.points.length > 1), "시간 또는 지도 선 누락");
    if (mode === "transit") assert(leg.steps.some((step) => step.type !== "WALKING" && step.board && step.alight && step.names.length), "승하차 또는 노선 정보 누락");
    else assert(leg.meters > 0, "도보 거리 누락");
    await waitFor(`document.querySelector('#route-leg-detail strong')?.innerText.includes('${leg.minutes >= 60 ? Math.floor(leg.minutes / 60) + "시간" : leg.minutes + "분"}')`);
    return leg;
  };
  const shot = async (name, width) => {
    await evaluate("document.activeElement?.blur(); document.fonts.ready.then(()=>true)");
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "화면 가로 넘침");
    const height = await evaluate("Math.min(document.documentElement.scrollHeight,2400)");
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(join(out, `${name}.png`), Buffer.from(result.data, "base64"));
  };
  mkdirSync(out, { recursive: true });
  await send("Page.enable");
  await send("Network.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*", requestStage: "Request" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/route` });
  await waitFor("document.readyState==='complete' && !!document.querySelector('main h1')");
  assert.equal(passedRequests.size, 0, "새 프로필의 자동 여행은 경로를 조회하지 않아야 함");
  const trip = { version: 1, regions: [], startDate: "2026-10-26", endDate: "2026-10-26", periodSource: "user", taste: null, candidates: [from, to], days: [[from, to]] };
  await evaluate(`localStorage.setItem('pinday:trip',${JSON.stringify(JSON.stringify(trip))})`);
  await send("Page.navigate", { url: `${base}/route?day=1` });
  const transit = await waitForResponse("transit");
  await waitFor("!!window.kakao?.maps.Map && document.querySelectorAll('[data-route-stop][data-selected=true]').length===2");
  const transitLink = await evaluate("document.querySelector('#route-leg-detail a').href");
  assert(transitLink.includes("/link/by/traffic/"));
  assert.equal(new URL(transitLink).hostname, "map.kakao.com");
  await shot("live-transit-1440", 1440);
  await evaluate("[...document.querySelectorAll('#route-leg-detail button')].find(el=>el.textContent.trim()==='도보').click()");
  const walk = await waitForResponse("walk");
  const walkLink = await evaluate("document.querySelector('#route-leg-detail a').href");
  assert(walkLink.includes("/link/by/walk/"));
  await shot("live-walk-1440", 1440);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await waitFor("document.querySelector('section[aria-label=\"장소와 이동 구간\"]').getBoundingClientRect().width>0");
  await shot("live-walk-390", 390);
  await evaluate("[...document.querySelectorAll('section[aria-label=\"장소와 이동 구간\"] button')].find(el=>el.textContent.trim()==='대중교통').click()");
  await waitFor("document.body.innerText.includes('승하차')");
  await evaluate("document.querySelector('summary').click()");
  await waitFor(`document.body.innerText.includes(${JSON.stringify(transit.steps.find((step) => step.board)?.board)})`);
  await shot("live-transit-390", 390);
  assert.equal(passedRequests.size, 2, "수단별 최초 조회 2건만 허용");
  if (failure) throw failure;
  console.log(JSON.stringify({ passed: true, checkedAtKst: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }), route: "부산 감천문화마을 → 부산 송도해수욕장", localApiRequests: passedRequests.size, maxExternalRouteRequests: 2, transit: { minutes: transit.minutes, transfers: transit.transfers, steps: transit.steps, linePoints: transit.lines.reduce((sum, line) => sum + line.points.length, 0) }, walk: { minutes: walk.minutes, meters: walk.meters, linePoints: walk.lines.reduce((sum, line) => sum + line.points.length, 0) }, externalLinks: "traffic/walk 주소 형식 확인(외부 길안내 페이지는 열지 않음)", userTripModified: false }));
} finally { ws?.close(); chrome.kill(); }
