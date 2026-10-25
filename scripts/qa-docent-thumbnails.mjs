// AI 도슨트 '목록 메뉴'의 6개 썸네일을 별도 프로필에서 확인한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const out = "docs/design/docent-list";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9344", `--user-data-dir=${mkdtempSync(join(tmpdir(), "pinday-docent-list-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let ws;
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await pause(200);
    try { target = (await (await fetch("http://127.0.0.1:9344/json")).json()).find(t => t.type === "page"); } catch {}
  }
  assert(target);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener("open", resolve));
  let sequence = 0, blocked = 0;
  const pending = new Map(), errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, message => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener("message", async event => {
    const m = JSON.parse(event.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    if (m.method === "Fetch.requestPaused") { blocked++; await send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "BlockedByClient" }); }
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!r.exceptionDetails, `화면 실행 오류: ${expression}`);
    return r.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(`대기 실패: ${expression}`);
  };
  const shot = async name => {
    await evaluate("document.fonts.ready.then(()=>true)");
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(out, name + ".png"), Buffer.from(result.data, "base64"));
  };
  mkdirSync(out, { recursive: true });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/route?*" }, { urlPattern: "*/api/weather?*" }] });
  const report = [];
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await waitFor("!!document.querySelector('header nav a[href=\"/docent\"]')");
    await evaluate("document.querySelector('header nav a[href=\"/docent\"]').click()");
    await waitFor("location.pathname==='/docent' && document.querySelectorAll('[data-docent-card]').length===6 && document.querySelector('[data-docent-thumbnail]').getBoundingClientRect().height>200");
    // 화면 아래 사진은 스크롤할 때 로딩되므로 실제 사용자처럼 카드마다 내려가 확인한다.
    for (let index = 0; index < 6; index++) {
      await evaluate(`document.querySelectorAll('[data-docent-card]')[${index}].scrollIntoView({block:'center'})`);
      await waitFor(`(()=>{const i=document.querySelectorAll('[data-docent-card]')[${index}].querySelector('img');return !i||(i.complete&&i.naturalWidth>0)})()`);
    }
    await evaluate("scrollTo(0,0)");
    const cards = await evaluate(`Array.from(document.querySelectorAll('[data-docent-card]')).map(a=>{
      const f=a.querySelector('[data-docent-thumbnail]'), r=f.getBoundingClientRect(), img=f.querySelector('img'), ir=img?.getBoundingClientRect(), d=a.querySelector('[data-docent-description]');
      return {id:a.dataset.docentCard,href:a.getAttribute('href'),width:r.width,height:r.height,imgWidth:ir?.width,imgHeight:ir?.height,fit:img?getComputedStyle(img).objectFit:null,descriptionHeight:d.getBoundingClientRect().height,clamp:getComputedStyle(d).webkitLineClamp,placeholder:!img&&f.textContent.includes('등록된 사진이 없어요')};
    })`);
    assert.equal(cards.length, 6);
    assert.equal(cards.filter(c => c.fit).length, 5);
    assert.equal(cards.filter(c => c.placeholder).length, 1);
    for (const card of cards) {
      assert(Math.abs(card.width / card.height - 1.5) < .01, "썸네일 3:2");
      assert(Math.abs(card.width - cards[0].width) < 1 && Math.abs(card.height - cards[0].height) < 1, "6개 썸네일 크기 동일");
      assert.equal(card.descriptionHeight, 48); assert.equal(card.clamp, "2");
      assert.equal(card.href, `/docent/${card.id}`);
      if (card.fit) { assert.equal(card.fit, "contain"); assert(Math.abs(card.imgWidth - card.width) < 1 && Math.abs(card.imgHeight - card.height) < 1, "사진 요소가 동일한 영역을 채움"); }
    }
    assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false);
    assert.equal(await evaluate("localStorage.getItem('pinday:trip')"), null, "여행 정보 변경 없음");
    await shot(`list-${width}`);
    await evaluate("document.querySelector('[data-docent-card]').focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await waitFor(`location.pathname===${JSON.stringify(cards[0].href)} && !!document.querySelector('[data-docent-photo]')`);
    report.push({ width, count: cards.length, thumbnail: { width: Math.round(cards[0].width * 10) / 10, height: Math.round(cards[0].height * 10) / 10 }, loadedPhotos: 5, placeholder: 1, descriptionLines: 2, detailLink: true });
  }
  assert.deepEqual(errors, []); assert.equal(blocked, 0);
  console.log(JSON.stringify({ passed: true, report, routeAndWeatherRequests: blocked }));
} finally { ws?.close(); chrome.kill(); }
