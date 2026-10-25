// 카드 선택형 핀 뽑기 모달 QA. 실제 경로/날씨 요청은 차단한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const base="http://localhost:3000", out="docs/design/random-pin";
const approved=new Set(readdirSync("data/docent/drafts").map(file=>JSON.parse(readFileSync(`data/docent/drafts/${file}`,"utf8"))).filter(d=>d.publishable&&d.humanReview?.status==="approved"&&!d.checks?.issues?.length).map(d=>d.placeId));
const chrome=spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",["--headless=new","--remote-debugging-port=9338",`--user-data-dir=${mkdtempSync(join(tmpdir(),"pinday-pin-cards-"))}`,"--no-first-run","about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,blocked=0;
try {
  let target;
  for(let i=0;i<40&&!target;i++){await sleep(200);try{target=(await(await fetch("http://127.0.0.1:9338/json")).json()).find(tab=>tab.type==="page")}catch{}}
  assert(target); ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener("open",resolve));
  let sequence=0;const pending=new Map(),loaded=new Set();
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);pending.set(id,message=>{clearTimeout(timer);if(message.error)reject(new Error(message.error.message));else resolve(message.result)});ws.send(JSON.stringify({id,method,params}))});
  ws.addEventListener("message",async event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}if(m.method==="Page.lifecycleEvent"&&m.params.name==="load")loaded.add(m.params.loaderId);if(m.method==="Fetch.requestPaused"){blocked++;await send("Fetch.failRequest",{requestId:m.params.requestId,errorReason:"BlockedByClient"})}});
  const evaluate=async expression=>{const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,`화면 실행 오류: ${expression}`);return r.result.value};
  const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await sleep(100)}throw new Error(`화면 대기 실패: ${expression}`)};
  const textHas=text=>`document.querySelector('#pin-draw-panel')?.innerText.includes(${JSON.stringify(text)})`;
  const store=trip=>evaluate(`localStorage.setItem('pinday:trip',${JSON.stringify(JSON.stringify(trip))})`);
  const saved=()=>evaluate("JSON.parse(localStorage.getItem('pinday:trip'))");
  const navigate=async()=>{const n=await send("Page.navigate",{url:base});for(let i=0;i<150&&!loaded.has(n.loaderId);i++)await sleep(100);assert(loaded.has(n.loaderId));await waitFor("!!document.querySelector('button[aria-controls=pin-draw-panel]:not([disabled])')")};
  const open=async()=>{await evaluate("(() => {const b=document.querySelector('button[aria-controls=pin-draw-panel]');b.scrollIntoView({block:'center'});b.click()})()");await waitFor("!!document.querySelector('dialog[open]')")};
  const escape=async()=>{await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await waitFor("!document.querySelector('dialog[open]')")};
  const choose=async(index=0)=>{await waitFor("!!document.querySelector('[data-pin-card]:not([disabled])')");await evaluate(`document.querySelector('[data-pin-card="${index}"]').click()`) };
  const again=async()=>{await evaluate("[...document.querySelectorAll('#pin-draw-panel button')].find(b=>b.textContent.trim()==='다른 카드 뽑기').click()");await waitFor("!!document.querySelector('[data-pin-card]:not([disabled])')")};
  const resultId=()=>evaluate("document.querySelector('#pin-draw-panel a[href^=\"/docent/\"]')?.getAttribute('href').split('/').at(-1)");
  const result=async()=>{await waitFor("!!document.querySelector('#pin-draw-panel h3')");const id=await resultId();assert(approved.has(id));return id};
  const layout=async()=>{assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);assert.deepEqual(await evaluate("[...document.querySelectorAll('#pin-draw-panel button,#pin-draw-panel a')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.width<44||r.height<44)}).map(el=>el.textContent.trim())"),[])};
  const shot=async(name)=>{await evaluate("document.fonts.ready.then(()=>true)");const r=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(join(out,`${name}.png`),Buffer.from(r.data,"base64"))};
  await send("Page.enable");await send("Page.setLifecycleEventsEnabled",{enabled:true});await send("Fetch.enable",{patterns:[{urlPattern:"*/api/route?*",requestStage:"Request"},{urlPattern:"*/api/weather?*",requestStage:"Request"}]});mkdirSync(out,{recursive:true});
  const trip={version:1,regions:[],startDate:"2026-10-26",endDate:"2026-10-27",periodSource:"user",taste:"history",candidates:["126078"],days:[["126078"],[]]};
  for(const width of [390,1440]){
    await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width===390});await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"no-preference"}]});
    await navigate();await store(trip);await navigate();
    const height=await evaluate("document.documentElement.scrollHeight");await open();await waitFor("document.querySelectorAll('[data-pin-card]').length===3");
    assert(await evaluate(textHas("남은 기회 3번")),"열기만 해서는 차감 없음");assert.equal(await evaluate("document.documentElement.scrollHeight"),height,"홈이 아래로 늘어나지 않음");
    const scroll=await evaluate("scrollY");await layout();await shot(`cards-choose-${width}`);await escape();await waitFor("document.activeElement.getAttribute('aria-controls')==='pin-draw-panel'");
    assert(await evaluate(`Math.abs(scrollY-${scroll})<3`));assert.equal(await evaluate("document.body.style.overflow"),"");await open();assert(await evaluate(textHas("남은 기회 3번")));
    await choose(1);await waitFor("document.querySelectorAll('[data-picked=true]').length===1");assert.equal(await evaluate("document.querySelectorAll('[data-away=true]').length"),2);if(width===1440)await shot("cards-turn-1440");
    const first=await result();assert.deepEqual(await saved(),trip,"선택만으로 여행 정보 변경 없음");await layout();await shot(`cards-result-${width}`);
    assert.equal(await evaluate("document.querySelector('#pin-draw-panel img')?getComputedStyle(document.querySelector('#pin-draw-panel img')).objectFit:'contain'"),"contain");
    await evaluate("[...document.querySelectorAll('#pin-draw-panel button')].find(b=>b.textContent.includes('후보함 담기')).click()");const after=await saved();assert.deepEqual(after.candidates,[...trip.candidates,first]);assert.deepEqual(after.days,trip.days);
    await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await again();await choose();const second=await result();assert.notEqual(second,first);assert.equal(await evaluate("!!document.querySelector('[data-picked=true]')"),false,"움직임 줄이기 즉시 공개");
    await again();await choose();const third=await result();assert.notEqual(third,second);assert(await evaluate(textHas("남은 기회 0번")));await shot(`cards-exhausted-${width}`);await escape();await open();assert.equal(await resultId(),third,"기회 소진 후에도 마지막 핀 다시 보기");await escape();
    await store({...trip,regions:["부산광역시 강서구"]});await navigate();await open();await waitFor(textHas("아직 공개된 도슨트가 없어요"));assert(await evaluate(textHas("남은 기회 3번")));await shot(`cards-empty-${width}`);await escape();
    await store({...trip,regions:["부산광역시 동구"]});await navigate();await open();assert.equal(await evaluate("document.querySelectorAll('[data-pin-card]').length"),1);await choose();assert.equal(await result(),"1942337");assert(await evaluate(textHas("남은 기회 2번")));assert(await evaluate(textHas("이 지역의 공개 이야기는 이 장소 하나뿐")));await shot(`cards-single-${width}`);await escape();
    await store(trip);await navigate();await open();await evaluate("for(let i=0;i<6;i++)document.querySelector('[data-pin-card]').click()");await result();assert(await evaluate(textHas("남은 기회 2번")),"같은 카드 연타는 1회만 사용");await escape();
    await store(trip);await navigate();await open();assert(await evaluate(textHas("남은 기회 3번")),"새로고침 초기화");await escape();
  }
  assert.equal(blocked,0);console.log(JSON.stringify({passed:true,widths:[390,1440],checks:["3장 중 한 장 선택","뒤집기·나머지 물러남","홈 높이 유지","닫기·포커스·스크롤 복구","열기는 차감 없음","같은 카드 연타 1회","3회 후 결과 재열기","직전 중복 제외","0/1곳 안내","움직임 줄이기","후보만 저장·일정 유지","사진 비율·44px·넘침"],routeAndWeatherRequests:blocked}));
} finally {ws?.close();chrome.kill()}
