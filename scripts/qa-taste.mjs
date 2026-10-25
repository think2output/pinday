// 별도 Chrome 프로필에서 취향 테스트·저장 흐름 검증. 경로/날씨 호출은 차단한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const base = process.env.TASTE_QA_URL ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/design/taste-story";
const approved = new Set(readdirSync("data/docent/drafts").map((file) => JSON.parse(readFileSync(`data/docent/drafts/${file}`, "utf8"))).filter((draft) => draft.publishable && draft.humanReview?.status === "approved" && !draft.checks?.issues?.length).map((draft) => draft.placeId));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9337", `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-taste-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws, blocked = 0;
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) { await sleep(200); try { target = (await (await fetch("http://127.0.0.1:9337/json")).json()).find((tab) => tab.type === "page"); } catch {} }
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
    if (message.method === "Fetch.requestPaused") { blocked++; await send("Fetch.failRequest", { requestId: message.params.requestId, errorReason: "BlockedByClient" }); }
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, `화면 실행 실패: ${expression}`);
    return result.result.value;
  };
  const waitFor = async (expression) => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`화면 대기 실패: ${expression}`); };
  const click = (text) => evaluate(`[...document.querySelectorAll('button')].find(el=>el.getClientRects().length && el.textContent.trim().startsWith(${JSON.stringify(text)}))?.click()`);
  const textHas = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const store = async (trip) => evaluate(`localStorage.setItem('pinday:trip',${JSON.stringify(JSON.stringify(trip))})`);
  const saved = () => evaluate("JSON.parse(localStorage.getItem('pinday:trip'))");
  const navigate = async () => { await send("Page.navigate", { url: `${base}/taste` }); await waitFor("document.readyState==='complete' && !!document.querySelector('main h1')"); };
  const layout = async () => {
    assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false, "가로 넘침");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('main button,main a,dialog button')].filter(el=>{const r=el.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44)}).map(el=>el.textContent.trim())"), [], "44px 미만 조작");
  };
  const shot = async (name, width) => {
    await evaluate("document.activeElement?.blur();document.fonts.ready.then(()=>true)");
    const height = await evaluate("Math.min(document.documentElement.scrollHeight,2400)");
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(join(out, `${name}.png`), Buffer.from(result.data, "base64"));
  };
  await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*", requestStage: "Request" }, { urlPattern: "*/api/weather?*", requestStage: "Request" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const listeners=new Set(); window.__qaSpoken=0; window.__qaVoiceReady=false; window.SpeechSynthesisUtterance=class { constructor(text){this.text=text} }; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:window.__qaVoiceReady?'ko-KR':'en-US'}],addEventListener:(type,fn)=>listeners.add(fn),removeEventListener:(type,fn)=>listeners.delete(fn),cancel:()=>{},speak:()=>window.__qaSpoken++}});window.__qaReadyVoice=()=>{window.__qaVoiceReady=true;listeners.forEach(fn=>fn())};})()` });
  mkdirSync(out, { recursive: true });
  const trip = { version: 1, regions: ["부산광역시 수영구"], startDate: "2026-10-26", endDate: "2026-10-27", periodSource: "user", taste: "sunset", candidates: ["126078", "1997221"], days: [["126078"], ["1997221"]] };
  const names = { alley: "이바구길 골목 산책자", sunset: "광안리 노을 감상가", history: "동래성 시간 여행자", wave: "태종대 파도 탐험가" };
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate(); await store(trip); await navigate();
    await layout(); await shot(`intro-${width}`, width);
    await click("내 이야기의 첫 장 열기");
    await waitFor(textHas("장면 1 / 5"));
    await layout(); await shot(`question-${width}`, width);
    await evaluate("document.querySelector('[data-taste-choice=alley]').focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await waitFor(textHas("장면 2 / 5"));
    await click("← 이전");
    await waitFor(textHas("장면 1 / 5"));
    assert.deepEqual(await saved(), trip, "도중에는 저장값 유지");
    for (let i = 1; i <= 5; i++) {
      await evaluate("document.querySelector('[data-taste-choice=alley]').click()");
      await waitFor(i === 5 ? textHas(names.alley) : textHas(`장면 ${i + 1} / 5`));
    }
    assert.deepEqual(await saved(), { ...trip, taste: "alley" }, "결과에서는 취향만 저장");
    assert.equal(await evaluate("document.querySelector('ol[aria-label=\"추천 코스 순서\"]').children.length"), 3);
    assert(await evaluate(textHas("지금 고른 지역 밖의 장소도 포함돼요")));
    await waitFor(textHas("이 기기에서는 한국어 듣기를 지원하지 않아요"));
    assert.equal(await evaluate("window.__qaSpoken"), 0, "자동 음성 재생 없음");
    const storyLinks = await evaluate("[...document.querySelectorAll('main a[href^=\"/docent/\"]')].map(el=>el.getAttribute('href').split('/').at(-1))");
    assert(storyLinks.every((id) => approved.has(id)), "공개 승인된 해설만 연결");
    await layout(); await shot(`result-alley-${width}`, width);
    await click("이 코스를 내 일정에 담기");
    await waitFor("!!document.querySelector('dialog[open]')");
    assert(await evaluate(textHas("이미 담긴 1곳은 현재 날짜와 순서를 유지해요")));
    await layout(); await shot(`picker-${width}`, width);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await waitFor("!document.querySelector('dialog[open]')");
    assert.deepEqual((await saved()).days, trip.days, "닫기로 일정 변경 없음");
    await click("이 코스를 내 일정에 담기");
    await click("1일차에 2곳 담기");
    const after = await saved();
    assert.deepEqual(after.days, [["126078", "1942337", "2684712"], ["1997221"]], "새 장소 순서대로 뒤에 추가·기존 유지");
    assert.deepEqual(after.regions, trip.regions);
    assert.deepEqual(after.candidates, ["126078", "1997221", "1942337", "2684712"]);
    await click("이 코스를 내 일정에 담기");
    assert(await evaluate("document.querySelector('dialog button:disabled')?.textContent.includes('새로 담을 장소가 없어요')"));
    await click("×");
    await evaluate("window.__qaReadyVoice()");
    await waitFor(textHas("▶ 이야기 듣기"));
    await click("▶ 이야기 듣기");
    assert.equal(await evaluate("window.__qaSpoken"), 1, "명시적 재생 시에만 음성 호출");
    await click("듣기 멈춤");
    await navigate();
    await click("저장된 내 이야기 다시 보기");
    await waitFor(textHas(names.alley));
    for (const taste of ["sunset", "history", "wave"]) {
      await click("다른 장면으로 다시 해보기");
      for (let i = 1; i <= 5; i++) {
        await evaluate(`document.querySelector('[data-taste-choice=${taste}]').click()`);
        await waitFor(i === 5 ? textHas(names[taste]) : textHas(`장면 ${i + 1} / 5`));
      }
      assert.equal((await saved()).taste, taste);
      await layout();
      if (width === 1440) await shot(`result-${taste}-${width}`, width);
      if (taste === "sunset") assert(await evaluate(textHas("코스 밖에서 이어 들을 이야기")), "승인 해설 없는 코스에 가짜 해설 금지");
    }
  }
  await send("Page.navigate", { url: `${base}/explore` });
  await waitFor("document.querySelector('select[aria-label=\"장소 정렬\"]')?.value==='taste'");
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"장소 정렬\"]').value"), "taste", "완료 후 탐색은 취향순");
  await evaluate("localStorage.removeItem('pinday:trip')"); await navigate();
  await click("내 이야기의 첫 장 열기");
  assert.equal(await evaluate("[...document.querySelectorAll('a[href=\"/explore\"]')].some(el=>el.textContent.includes('건너뛰기'))"), true);
  assert.equal(await saved(), null, "건너뛰기 전까지 여행 생성 없음");
  await evaluate("[...document.querySelectorAll('main a[href=\"/explore\"]')].find(el=>el.textContent.includes('건너뛰기')).click()");
  await waitFor("location.pathname==='/explore' && !!document.querySelector('select[aria-label=\"장소 정렬\"]')");
  assert.equal((await saved())?.taste ?? null, null, "건너뛰기로 취향을 저장하지 않음");
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"장소 정렬\"]').value"), "name", "미완료 탐색은 이름순");
  assert.equal(blocked, 0, "취향 흐름에서 경로/날씨 API 요청 없음");
  console.log(JSON.stringify({ passed: true, widths: [390, 1440], results: 4, checks: ["다섯 질문", "이전·키보드 선택", "완료 전 저장 없음", "4유형 취향 저장", "대표 장소 3곳", "승인 해설만 연결", "듣기 미지원·명시적 재생", "지역 밖 안내", "일정 취소·중복 방지·기존 순서 보존", "저장 결과 다시 보기", "가로 넘침 없음", "44px 버튼"], routeAndWeatherRequests: blocked }));
} finally { ws?.close(); chrome.kill(); }
