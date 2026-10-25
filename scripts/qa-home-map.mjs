// 홈 일러스트 지도: 별도 Chrome 프로필로 확인하며 사용자 여행 정보는 건드리지 않는다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const out = "docs/design/home-map";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--remote-debugging-port=9341",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-home-map-"))}`,
  "--no-first-run", "about:blank",
], { stdio: "ignore" });
let ws;
try {
  let target;
  for (let n = 0; n < 40 && !target; n++) {
    await pause(200);
    try { target = (await (await fetch("http://127.0.0.1:9341/json")).json()).find(t => t.type === "page"); } catch {}
  }
  assert(target, "Chrome 연결");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener("open", resolve));
  let sequence = 0;
  const pending = new Map(), errors = [];
  let externalRequests = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, m => {
      clearTimeout(timer);
      if (m.error) reject(new Error(m.error.message));
      else resolve(m.result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener("message", async event => {
    const m = JSON.parse(event.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    if (m.method === "Fetch.requestPaused") {
      externalRequests++;
      await send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "BlockedByClient" });
    }
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!r.exceptionDetails, `실행 오류: ${expression}`);
    return r.result.value;
  };
  const waitFor = async expression => {
    for (let n = 0; n < 150; n++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(`대기 실패: ${expression}`);
  };
  const map = "document.querySelector('[aria-label=\"부산 구·군 지도. 여러 곳을 고를 수 있어요\"]')";
  const paths = `${map}.querySelectorAll('[data-map-region]')`;
  const selectedCount = `Array.from(${paths}).filter(p=>p.dataset.selected==='true').length`;
  const chooser = `${map}.querySelector('select')`;
  const screenshot = async (name, mapOnly = false) => {
    await evaluate("document.fonts.ready.then(()=>true)");
    const clip = mapOnly ? await evaluate(`(()=>{const r=${map}.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`) : undefined;
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? {clip} : {}) });
    writeFileSync(join(out, name + ".png"), Buffer.from(shot.data, "base64"));
  };
  const key = async (key, code, vk) => {
    for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", {
      type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
      ...(type === "keyDown" && (key === "Enter" || key === " ") ? { text: key === "Enter" ? "\r" : key } : {}),
    });
  };
  mkdirSync(out, { recursive: true });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*" }, { urlPattern: "*/api/weather?*" }] });
  const report = [];
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await waitFor(`!!${map} && ${paths}.length === 16`);
    await evaluate("localStorage.clear(); location.reload()");
    await waitFor(`!!${map} && ${paths}.length === 16 && !document.querySelector('a[href=\"/explore\"]')?.hasAttribute('aria-disabled')`);
    await pause(800);
    assert.equal(await evaluate(selectedCount), 0);
    assert.deepEqual(await evaluate(`Array.from(${map}.querySelectorAll('button,select,a')).filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.getAttribute('aria-label'))`), [], "이름 선택·확대 등 대체 조작 44px 이상");
    assert.equal(await evaluate(`${map}.querySelectorAll('.pd-map-art').length`), 16, "명소 그림 16개");
    assert.equal(await evaluate(`${chooser}.options.length`), 17, "16개 구·군 이름으로 선택 가능");
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await screenshot(`map-default-${width}`);
    await screenshot(`map-detail-${width}`, true);
    const centers = await evaluate(`Array.from(${map}.querySelectorAll('.pd-map-label')).map((g,i)=>{const m=g.getScreenCTM();return {x:m.e,y:m.f,name:${paths}[i].dataset.mapRegion}})`);
    // 실제 좌표로 누르므로 16개 경계의 직접 선택을 확인한다. 작은 구에는 이름 선택도 제공한다.
    for (const c of centers) {
      await evaluate(`scrollTo(0, ${Math.max(0, c.y - 300)})`);
      const scroll = await evaluate("scrollY");
      const y = c.y - scroll;
      const hit = await evaluate(`document.elementFromPoint(${c.x},${y})?.closest('[data-map-region]')?.dataset.mapRegion`);
      assert.equal(hit, c.name, `지도 조각 누름 위치: ${c.name}`);
      if (width === 390) {
        await send("Emulation.setTouchEmulationEnabled", { enabled: true });
        await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y }] });
        await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await send("Emulation.setTouchEmulationEnabled", { enabled: false });
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y, button: "left", clickCount: 1 });
      }
      await waitFor(`Array.from(${paths}).find(p=>p.dataset.mapRegion===${JSON.stringify(c.name)})?.dataset.selected==='true'`);
    }
    await waitFor(`${selectedCount}===16`);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('pinday:trip')).regions.length"), 16);
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await evaluate("scrollTo(0,0)"); await pause(650);
    await screenshot(`map-all-${width}`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='전체 해제').click()`);
    await waitFor(`${selectedCount}===0`);
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await evaluate(`${chooser}.focus()`);
    assert(await evaluate(`document.activeElement===${chooser}`), "지역 이름 선택 키보드 포커스");
    await key("ArrowDown", "ArrowDown", 40);
    await waitFor(`${selectedCount}===1`);
    await key("ArrowDown", "ArrowDown", 40);
    await waitFor(`${selectedCount}===0`);
    await key("Tab", "Tab", 9);
    assert(await evaluate(`document.activeElement.getAttribute('aria-label')==='지도 확대'`), "이름 선택 뒤 확대 버튼으로 이동");
    await screenshot(`map-focus-${width}`);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await evaluate(`${paths}[1].dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await waitFor(`${selectedCount}===1`);
    assert.equal(await evaluate(`getComputedStyle(${paths}[1]).animationName`), "none");
    await evaluate(`${paths}[3].dispatchEvent(new MouseEvent('click',{bubbles:true})); scrollTo(0,0)`); await waitFor(`${selectedCount}===2`);
    await screenshot(`map-selected-${width}`);
    await evaluate(`${map}.querySelector('[aria-label="지도 확대"]').click()`);
    await waitFor(`Math.abs(${map}.querySelector('.pd-map-svg').getBoundingClientRect().width / ${map}.querySelector('.pd-map').clientWidth - 2)<.02`);
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await screenshot(`map-zoom-${width}`);
    await send("Page.reload");
    await waitFor(`!!${map} && ${selectedCount}===2`);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    report.push({ width, regions: 16, icons: 16, selection: "pointer/native select keyboard", zoom: true, persistence: true, overflow: false });
  }
  assert.deepEqual(errors, []);
  assert.equal(externalRequests, 0);
  console.log(JSON.stringify({ passed: true, report, routeAndWeatherRequests: externalRequests }));
} finally { ws?.close(); chrome.kill(); }
