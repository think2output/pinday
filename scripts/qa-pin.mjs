// 별도 Chrome에서 홈 핀 뽑기 검증. 경로/날씨 외부 호출 없음.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const base = "http://localhost:3000", out = "docs/design/random-pin";
const approved = new Set(readdirSync("data/docent/drafts").map((file) => JSON.parse(readFileSync(`data/docent/drafts/${file}`, "utf8"))).filter((draft) => draft.publishable && draft.humanReview?.status === "approved" && !draft.checks?.issues?.length).map((draft) => draft.placeId));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9338", `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-pin-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws, blocked = 0;
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) { await sleep(200); try { target = (await (await fetch("http://127.0.0.1:9338/json")).json()).find((tab) => tab.type === "page"); } catch {} }
  assert(target);
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve) => ws.addEventListener("open", resolve));
  let sequence = 0; const pending = new Map(), loaded = new Set();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener("message", async (event) => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); } if (message.method === "Runtime.exceptionThrown") console.log(message.params.exceptionDetails.exception?.description?.split("\n")[0]); if (message.method === "Page.lifecycleEvent" && message.params.name === "load") loaded.add(message.params.loaderId); if (message.method === "Fetch.requestPaused") { blocked++; await send("Fetch.failRequest", { requestId: message.params.requestId, errorReason: "BlockedByClient" }); } });
  const evaluate = async (expression) => { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); assert(!result.exceptionDetails, `화면 실행 오류: ${expression}`); return result.result.value; };
  const waitFor = async (expression) => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`화면 대기 실패: ${expression}`); };
  const textHas = (text) => `document.querySelector('#pin-draw-panel')?.innerText.includes(${JSON.stringify(text)})`;
  const store = (trip) => evaluate(`localStorage.setItem('pinday:trip',${JSON.stringify(JSON.stringify(trip))})`);
  const saved = () => evaluate("JSON.parse(localStorage.getItem('pinday:trip'))");
  const navigate = async () => {
    const navigation = await send("Page.navigate", { url: base });
    for (let i = 0; i < 150 && !loaded.has(navigation.loaderId); i++) await sleep(100);
    assert(loaded.has(navigation.loaderId), "새 홈 문서 로드 대기 실패");
    await waitFor("!!document.querySelector('button[aria-controls=pin-draw-panel]:not([disabled])')");
  };
  const pick = () => evaluate("document.querySelector('button[aria-controls=pin-draw-panel]').click()");
  const resultId = () => evaluate("document.querySelector('#pin-draw-panel a[href^=\"/docent/\"]')?.getAttribute('href').split('/').at(-1)");
  const result = async () => { await waitFor("!!document.querySelector('#pin-draw-panel h3')"); const id = await resultId(); assert(approved.has(id), "승인된 해설만 뽑기"); return id; };
  const layout = async () => {
    assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#pin-draw-panel button,#pin-draw-panel a')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.width<44||r.height<44)}).map(el=>el.textContent.trim())"), []);
  };
  const shot = async (name, width) => {
    await evaluate("document.fonts.ready.then(()=>true)");
    const box = await evaluate("(() => {const r=document.getElementById('pin-draw-panel').getBoundingClientRect();return {y:Math.max(0,r.top+scrollY-16),h:Math.ceil(r.height)+32}})()");
    const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: box.y, width, height: box.h, scale: 1 } });
    writeFileSync(join(out, `${name}.png`), Buffer.from(image.data, "base64"));
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Page.setLifecycleEventsEnabled", { enabled: true }); await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*", requestStage: "Request" }, { urlPattern: "*/api/weather?*", requestStage: "Request" }] });
  mkdirSync(out, { recursive: true });
  const trip = { version: 1, regions: [], startDate: "2026-10-26", endDate: "2026-10-27", periodSource: "user", taste: "history", candidates: ["126078"], days: [["126078"], []] };
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await navigate(); await store(trip); await navigate(); await pick();
    await waitFor(textHas("어떤 이야기가 당신을 기다릴까요?"));
    assert.equal(await evaluate("document.querySelector('button[aria-controls=pin-draw-panel]').disabled"), true);
    if (width === 1440) await shot("rolling-1440", width);
    const first = await result();
    assert.deepEqual(await saved(), trip, "뽑기만으로 저장 변경 없음");
    await layout(); await shot(`result-${width}`, width);
    assert.equal(await evaluate("document.querySelector('#pin-draw-panel img') ? getComputedStyle(document.querySelector('#pin-draw-panel img')).objectFit : 'contain'"), "contain", "사진 자르기 금지");
    await evaluate("[...document.querySelectorAll('#pin-draw-panel button')].find(el=>el.textContent.includes('후보함 담기')).click()");
    const after = await saved();
    assert.deepEqual(after.candidates, [...trip.candidates, first]); assert.deepEqual(after.days, trip.days); assert.equal(after.taste, trip.taste);
    assert(await evaluate(textHas("후보함에 담긴 장소")));
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await pick(); const second = await result(); assert.notEqual(second, first, "같은 장소 연속 금지");
    assert.equal(await evaluate("document.querySelector('#pin-draw-panel h2').textContent.includes('기다릴까요')"), false, "움직임 줄이기는 즉시 결과");
    await pick(); const third = await result(); assert.notEqual(third, second);
    assert(await evaluate(textHas("남은 기회 0번"))); assert.equal(await evaluate("document.querySelector('button[aria-controls=pin-draw-panel]').disabled"), true);
    await layout(); await shot(`exhausted-${width}`, width);
    await navigate(); assert.equal(await evaluate("document.querySelector('button[aria-controls=pin-draw-panel]').textContent.includes('남은 기회 3번')"), true);
    await store({ ...trip, regions: ["부산광역시 강서구"] }); await navigate(); await pick();
    await waitFor(textHas("아직 공개된 도슨트가 없어요")); assert(await evaluate(textHas("남은 기회 3번"))); await shot(`empty-${width}`, width);
    await store({ ...trip, regions: ["부산광역시 동구"] }); await navigate(); await pick();
    const only = await result(); assert.equal(only, "1942337"); await pick();
    assert.equal(await resultId(), only); assert(await evaluate(textHas("남은 기회 2번"))); assert(await evaluate(textHas("이 지역의 공개 이야기는 이 장소 하나뿐")));
    await layout(); await shot(`single-${width}`, width);
    await store({ ...trip, regions: ["부산광역시 사하구"] }); await evaluate("dispatchEvent(new StorageEvent('storage',{key:'pinday:trip'}))");
    await waitFor(textHas("지역이 바뀌었어요")); await pick(); assert.equal(await result(), "1997221"); assert(await evaluate(textHas("남은 기회 1번")), "지역 바꿔도 기회 유지");
    await navigate(); await store(trip); await navigate();
    await evaluate("for(let i=0;i<6;i++)document.querySelector('button[aria-controls=pin-draw-panel]').click()");
    await result(); assert(await evaluate(textHas("남은 기회 0번")), "연속 클릭도 최대 3회");
  }
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await store({ ...trip, regions: ["부산광역시 동구"] }); await navigate(); await pick();
  await waitFor(textHas("어떤 이야기가 당신을 기다릴까요?"));
  await store({ ...trip, regions: ["부산광역시 강서구"] }); await evaluate("dispatchEvent(new StorageEvent('storage',{key:'pinday:trip'}))");
  await waitFor("!document.querySelector('button[aria-controls=pin-draw-panel]').disabled");
  assert(await evaluate(textHas("지역이 바뀌었어요")), "연출 중 지역 변경 시 이전 지역 결과 숨김");
  assert.equal(await evaluate("!!document.querySelector('#pin-draw-panel h3')"), false);
  assert(await evaluate(textHas("남은 기회 2번")));
  await store({ ...trip, regions: ["부산광역시 동구"] }); await evaluate("dispatchEvent(new StorageEvent('storage',{key:'pinday:trip'}))");
  await pick(); assert.equal(await result(), "1942337", "숨겨진 중단 결과는 직전 결과로 기록하지 않음");
  assert.equal(blocked, 0);
  console.log(JSON.stringify({ passed: true, widths: [390, 1440], checks: ["승인 해설", "1.5초 연출", "움직임 줄이기 즉시", "연속 중복 금지", "3회 제한·새로고침", "후보만 명시 저장", "일정·취향 유지", "0/1곳 안내", "지역 변경도 횟수 유지", "연속 클릭 제한", "사진 비율·44px·가로 넘침"], routeAndWeatherRequests: blocked }));
} finally { ws?.close(); chrome.kill(); }
