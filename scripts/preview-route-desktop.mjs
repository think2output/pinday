// 로컬 구조 시안: node scripts/preview-route-desktop.mjs [--capture]
// 카카오·내 여행·외부 API를 호출하지 않는다. 미리보기 자료·글꼴만 제공한다.
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, relative, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const root = process.cwd();
const out = "docs/design/route-desktop-ux";
const source = await readFile("src/styles/tokens.css", "utf8");
const tokens = `:root{${[...source.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => `${match[1]}:${match[2]};`).join("")}}`;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost:3102");
  if (url.pathname === "/tokens.css") { response.writeHead(200, { "Content-Type": "text/css" }); response.end(tokens); return; }
  const path = resolve(root, `.${decodeURIComponent(url.pathname === "/" ? `/${out}/preview.html` : url.pathname)}`);
  const local = relative(root, path).replaceAll("\\", "/");
  if (local.startsWith("..") || !["docs/design/", "src/app/fonts/"].some((prefix) => local.startsWith(prefix))) { response.writeHead(404); response.end(); return; }
  try {
    const data = await readFile(path);
    response.writeHead(200, { "Content-Type": ({ ".html": "text/html; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream" });
    response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((resolve) => server.listen(3102, "127.0.0.1", resolve));
console.log("구조 시안: http://127.0.0.1:3102/?v=a 또는 ?v=b");
if (process.argv.includes("--capture")) {
  let chrome, ws;
  try {
    const profile = await mkdtemp(join(tmpdir(), "pinday-desktop-review-"));
    chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let target;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(200);
      try { target = (await (await fetch("http://127.0.0.1:9335/json")).json()).find((tab) => tab.type === "page"); } catch {}
    }
    assert(target, "Chrome 연결 실패");
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener("open", resolve));
    let sequence = 0;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
      pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); } });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      assert(!result.exceptionDetails, "시안 스크립트 오류");
      return result.result.value;
    };
    const shot = async (name, width, height) => {
      const capture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
      await writeFile(`${out}/${name}.png`, Buffer.from(capture.data, "base64"));
    };
    await send("Page.enable");
    for (const variant of ["a", "b"]) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: `http://127.0.0.1:3102/?v=${variant}` });
      await sleep(500);
      await evaluate("document.fonts.ready.then(()=>true)");
      await shot(`${variant}-1440`, 1440, 1000);
      await evaluate("document.getElementById('next').click()");
      assert.equal(await evaluate("document.getElementById('segment-count').textContent"), "선택한 구간 2 / 3");
      assert(await evaluate("document.getElementById('ride-details').innerText.includes('지하철 1호선')"));
      await shot(`${variant}-transfer-1440`, 1440, 1000);
      await evaluate("document.querySelector('[data-mode=walk]').click()");
      assert.equal(await evaluate("document.getElementById('time').textContent"), "42분");
      await evaluate("document.getElementById('failure').click()");
      assert(await evaluate("document.getElementById('ride-details').innerText.includes('불러오지 못했어요')"));
      await evaluate("document.getElementById('many').click()");
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
      await evaluate("document.getElementById('picker').value='9';document.getElementById('picker').dispatchEvent(new Event('change'))");
      assert.equal(await evaluate("document.getElementById('segment-count').textContent"), "선택한 구간 10 / 11");
      await shot(`${variant}-12places-1440`, 1440, 1000);
      await send("Emulation.setDeviceMetricsOverride", { width: 1050, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    }
    console.log("A/B 각 구간 선택·환승·수단 변경·조회 실패·12곳·1050/1440 넘침 검사 통과. 외부 API 호출 없음.");
  } finally { ws?.close(); chrome?.kill(); server.close(); }
}
