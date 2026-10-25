"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { tripActions, useTrip } from "@/lib/trip/store";
import { regionName } from "./regions";
import { choosePin, pinPool, PIN_TRIES, type PinPlace } from "./pinModel";

type Draw = { scope: string | null; phase: "rolling" | "result" | "empty"; place: PinPlace | null; display: string };
const subscribeMounted = () => () => {};
const licenseName = (license: string) => license === "Type3" ? "공공누리 제3유형 · 변경금지" : license === "Type1" ? "공공누리 제1유형" : "이용 유형 확인 필요";

export function PinDraw({ places }: { places: PinPlace[] }) {
  const { trip } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [tries, setTries] = useState(0);
  const used = useRef(0);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const last = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scope = [...trip.regions].sort().join("|");
  const activeScope = useRef(scope);
  useEffect(() => { activeScope.current = scope; }, [scope]);
  const current = draw?.scope === scope ? draw : null;
  const eligible = pinPool(places, trip.regions, lastId);
  const available = pinPool(places, trip.regions, null);
  const rolling = draw?.phase === "rolling";
  const clearTimers = () => { if (timer.current) clearTimeout(timer.current); if (tick.current) clearInterval(tick.current); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (tick.current) clearInterval(tick.current); }, []);
  const reveal = () => requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "nearest" }); });
  const pick = () => {
    if (busy.current || used.current >= PIN_TRIES) return;
    clearTimers();
    setNotice(null);
    const pool = pinPool(places, trip.regions, last.current);
    const place = choosePin(pool, Math.random());
    if (!place) {
      if (current?.phase === "result" && available.length === 1) setNotice("이 지역의 공개 이야기는 이 장소 하나뿐이에요. 다른 지역도 골라보세요.");
      else setDraw({ scope, phase: "empty", place: null, display: "" });
      reveal(); return;
    }
    used.current += 1;
    setTries(used.current);
    const finish = () => {
      clearTimers(); busy.current = false;
      if (activeScope.current !== scope) { setDraw({ scope: null, phase: "empty", place: null, display: "" }); return; }
      last.current = place.id;
      setLastId(place.id);
      setDraw({ scope, phase: "result", place, display: place.name });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else {
      busy.current = true;
      setDraw({ scope, phase: "rolling", place: null, display: eligible[0].name });
      let frame = 0;
      tick.current = setInterval(() => {
        frame += 1;
        setDraw({ scope, phase: "rolling", place: null, display: eligible[frame % eligible.length].name });
      }, 100);
      timer.current = setTimeout(finish, 1500);
    }
    reveal();
  };
  const place = current?.phase === "result" ? current.place : null;
  const added = place ? trip.candidates.includes(place.id) : false;
  const noMore = tries >= PIN_TRIES || (eligible.length === 0 && available.length > 0);
  return <>
    <button type="button" disabled={!mounted || rolling || tries >= PIN_TRIES} onClick={pick} aria-expanded={!!draw} aria-controls="pin-draw-panel"
      className="relative flex min-h-42 flex-col justify-end gap-1.5 overflow-hidden bg-room p-4 text-left text-on-room disabled:opacity-60 lg:min-h-55 lg:p-8">
      <span aria-hidden="true" className="absolute top-4.5 left-12.5 h-13 w-10 -rotate-8 bg-on-room-subtle lg:top-8.5 lg:right-30 lg:left-auto lg:h-19.5 lg:w-15" />
      <span aria-hidden="true" className="absolute top-6 left-19 h-13 w-10 rotate-9 bg-light shadow-glow lg:top-11 lg:right-19.5 lg:left-auto lg:h-19.5 lg:w-15" />
      <span className="relative text-xs text-on-room-muted lg:text-[13px]">{rolling ? "이야기를 고르고 있어요" : `남은 기회 ${PIN_TRIES - tries}번`}</span>
      <span className="relative font-display text-[19px] leading-tight font-extrabold tracking-tight lg:text-[28px]">오늘의<br className="lg:hidden" /> 핀 뽑기</span>
    </button>
    {draw && <section id="pin-draw-panel" aria-labelledby="pin-draw-title" className="col-span-2 mt-5 min-w-0 break-keep lg:mt-8">
      <p className="text-xs text-ink-muted">{trip.regions.length ? trip.regions.map(regionName).join(" · ") : "부산 전체"} · 공개된 도슨트 {available.length}곳 중에서</p>
      <h2 id="pin-draw-title" ref={heading} tabIndex={-1} className="mt-2 font-display text-2xl font-extrabold tracking-tight outline-none lg:text-3xl">{rolling ? "어떤 이야기가 당신을 기다릴까요?" : place ? "오늘, 이 이야기를 만나볼까요?" : "다음 이야기를 찾아볼까요?"}</h2>
      {current?.phase === "rolling" ? <div className="mt-5 flex min-h-60 items-center justify-center bg-room px-5 text-center text-on-room">
        <p role="status" className="sr-only">이야기가 있는 장소를 뽑고 있어요</p><p aria-hidden="true" className="font-display text-2xl font-extrabold lg:text-4xl">{current.display}</p>
      </div> : place ? <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <figure>
          <div className="flex h-52 items-center justify-center bg-line/30 lg:h-72">{place.image ? <Image src={place.image.url} alt={`${place.name} 사진`} width={640} height={420} unoptimized className="h-full w-auto max-w-full object-contain" /> : <span className="text-sm text-ink-muted">사진 없이 이야기를 만나보세요</span>}</div>
          {place.image && <figcaption className="mt-2 text-[11px] leading-relaxed text-ink-subtle">사진 한국관광공사 TourAPI · {licenseName(place.image.license)}</figcaption>}
        </figure>
        <div className="min-w-0"><p className="text-xs text-ink-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold">{place.name}</h3>
          <p className="mt-3 text-sm leading-7 text-ink-muted">{place.summary}</p>
          <Link href={`/docent/${place.id}`} className="mt-4 flex min-h-12 items-center justify-between gap-5 bg-room px-4 text-sm font-semibold text-on-room">이야기 읽고 듣기 <span aria-hidden="true">→</span></Link>
          <div className="mt-2 flex flex-wrap gap-x-6"><button type="button" disabled={added} onClick={() => { tripActions.addCandidate(place.id); setNotice(`${place.name}을 후보함에 담았어요`); }} className="min-h-tap text-sm font-semibold disabled:text-ink-muted">{added ? "✓ 후보함에 담긴 장소" : "♡ 후보함 담기"}</button>
            <button type="button" disabled={noMore} onClick={pick} className="min-h-tap text-sm text-ink-muted underline underline-offset-4 disabled:opacity-40">다시 뽑기</button></div>
          <p role="status" className={notice ? "mt-2 text-sm text-ink-muted" : "sr-only"}>{notice}</p>
        </div>
      </div> : <div className="mt-4 text-sm leading-7 text-ink-muted">
        <p>{!current ? "지역이 바뀌었어요. 새로 고른 지역에서 다시 뽑아보세요." : available.length === 0 ? "선택한 지역에는 아직 공개된 도슨트가 없어요. 지역을 바꾸거나 다른 이야기를 둘러보세요." : "이 지역에서 공개된 이야기는 방금 뽑은 장소 하나뿐이에요. 다른 지역에서도 이야기를 만나보세요."}</p>
        {!current && <button type="button" onClick={pick} disabled={rolling || tries >= PIN_TRIES} className="mt-2 min-h-tap font-semibold text-ink disabled:opacity-40">선택한 지역에서 뽑기 →</button>}
        <Link href="/docent" className="mt-2 inline-flex min-h-tap items-center font-semibold text-ink">공개된 이야기 둘러보기 →</Link>
      </div>}
      {place && eligible.length === 0 && tries < PIN_TRIES && <p className="mt-3 text-xs leading-relaxed text-ink-muted">이 지역의 공개 이야기는 이 장소 하나뿐이에요. 다른 지역도 골라보세요.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-muted"><span aria-label={`남은 기회 ${PIN_TRIES - tries}번`}>{Array.from({ length: PIN_TRIES }, (_, index) => index < PIN_TRIES - tries ? "●" : "○").join(" ")} · 남은 기회 {PIN_TRIES - tries}번</span>
        {tries >= PIN_TRIES ? trip.candidates.length ? <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold">뽑기 끝! 후보함을 확인해보세요 →</Link> : <span>뽑기 끝! 마음에 드는 장소를 후보함에 담아보세요.</span> : <span>새로고침하면 기회가 다시 생겨요.</span>}
      </div>
    </section>}
  </>;
}
