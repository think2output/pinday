"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { tripActions, useTrip } from "@/lib/trip/store";
import { regionName } from "./regions";
import { dealPins, pinPool, PIN_TRIES, type PinPlace } from "./pinModel";
import "./pinDraw.css";

type Draw = { scope: string | null; phase: "choosing" | "rolling" | "result"; hand: PinPlace[]; picked: number | null; place: PinPlace | null };
const subscribeMounted = () => () => {};
const licenseName = (license: string) => license === "Type3" ? "공공누리 제3유형 · 변경금지" : license === "Type1" ? "공공누리 제1유형" : "이용 유형 확인 필요";

function PinIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 80 100" fill="none" aria-hidden="true" className={className}><path d="M40 93S9 61 9 37a31 31 0 0 1 62 0c0 24-31 56-31 56Z" stroke="currentColor" strokeWidth="2" /><circle cx="40" cy="37" r="13" fill="currentColor" /><path d="M20 96h40" stroke="currentColor" strokeWidth="2" opacity=".3" /></svg>;
}

export function PinDraw({ places }: { places: PinPlace[] }) {
  const { trip } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [tries, setTries] = useState(0);
  const used = useRef(0);
  const [draw, setDraw] = useState<Draw | null>(null);
  const last = useRef<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);
  const handReady = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scope = [...trip.regions].sort().join("|");
  const activeScope = useRef(scope);
  useEffect(() => { activeScope.current = scope; }, [scope]);
  const current = draw?.scope === scope ? draw : null;
  const available = pinPool(places, trip.regions, null);
  const eligible = pinPool(places, trip.regions, lastId);
  const rolling = draw?.phase === "rolling";
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, [open]);
  const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };
  const prepare = () => {
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    handReady.current = true;
    setNotice(null);
    setDraw({ scope, phase: "choosing", hand: used.current < PIN_TRIES ? dealPins(pinPool(places, trip.regions, last.current)) : [], picked: null, place: null });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };
  const pick = (index: number) => {
    if (busy.current || !handReady.current || used.current >= PIN_TRIES || current?.phase !== "choosing") return;
    const place = current.hand[index];
    if (!place) return;
    handReady.current = false;
    busy.current = true;
    used.current += 1; setTries(used.current); setNotice(null);
    const finish = () => {
      busy.current = false;
      if (activeScope.current !== scope) { setDraw({ scope: null, phase: "choosing", hand: [], picked: null, place: null }); return; }
      last.current = place.id;
      setLastId(place.id);
      setDraw({ scope, phase: "result", hand: [], picked: index, place });
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else { setDraw({ ...current, phase: "rolling", picked: index, place }); timer.current = setTimeout(finish, 1450); }
  };
  const place = current?.phase === "result" ? current.place : null;
  const added = place ? trip.candidates.includes(place.id) : false;
  return <>
    <button ref={trigger} type="button" disabled={!mounted} onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); if (!draw || draw.scope !== scope) prepare(); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open} aria-controls="pin-draw-panel"
      className="group relative flex min-h-42 flex-col justify-end gap-1.5 overflow-hidden bg-room p-4 text-left text-on-room lg:min-h-55 lg:p-8">
      <span aria-hidden="true" className="absolute top-4.5 left-12.5 h-13 w-10 -rotate-8 bg-on-room-subtle transition-transform group-hover:-translate-y-1 motion-reduce:transform-none lg:top-8.5 lg:right-30 lg:left-auto lg:h-19.5 lg:w-15" />
      <span aria-hidden="true" className="absolute top-6 left-19 h-13 w-10 rotate-9 bg-light shadow-glow transition-transform group-hover:rotate-12 motion-reduce:transform-none lg:top-11 lg:right-19.5 lg:left-auto lg:h-19.5 lg:w-15" />
      <span className="relative text-xs text-on-room-muted lg:text-[13px]">{tries >= PIN_TRIES ? "뽑은 핀 다시 보기" : `이야기 카드 한 장 · 남은 기회 ${PIN_TRIES - tries}번`}</span>
      <span className="relative font-display text-[19px] leading-tight font-extrabold tracking-tight lg:text-[28px]">오늘의<br className="lg:hidden" /> 핀 뽑기</span>
    </button>
    {open && <dialog ref={dialog} id="pin-draw-panel" aria-labelledby="pin-draw-title" onCancel={close}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]")].filter((element) => element.getClientRects().length);
        const first = controls[0], end = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); end?.focus(); }
        else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first?.focus(); }
      }}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-y-auto bg-room p-5 text-on-room shadow-paper backdrop:bg-room/70 backdrop:backdrop-blur-sm lg:h-fit lg:max-h-[90dvh] lg:w-[calc(100%-4rem)] lg:max-w-[860px] lg:p-8">
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-on-room-muted">오늘의 핀 뽑기 · {trip.regions.length ? trip.regions.map(regionName).join(" · ") : "부산 전체"}</p><button type="button" onClick={close} aria-label="핀 뽑기 닫기" className="min-h-tap min-w-tap text-xl">×</button></div>
      <h2 id="pin-draw-title" ref={heading} tabIndex={-1} className="mt-3 font-display text-2xl leading-snug font-extrabold tracking-tight outline-none lg:text-4xl">{place ? "당신에게 도착한 오늘의 핀" : rolling ? "어떤 이야기가 펼쳐질까요?" : "마음이 가는 한 장을 골라보세요"}</h2>
      {current && (current.phase === "choosing" || current.phase === "rolling") && current.hand.length > 0 ? <>
        <p className="mt-3 text-sm leading-relaxed text-on-room-muted">공개된 도슨트 {available.length}곳의 이야기를 섞었어요.{current.hand.length === 1 ? " 이 지역에는 한 곳의 이야기가 기다리고 있어요." : " 지금 눈에 들어온 카드를 뒤집어보세요."}</p>
        <div className="mt-7 flex min-h-60 items-center justify-center gap-3 py-4 lg:mt-9 lg:gap-6 lg:py-6" aria-label="뒤집을 이야기 카드">
          {current.hand.map((card, index) => <button key={card.id} type="button" onClick={() => pick(index)} disabled={rolling} data-pin-card={index} data-picked={rolling && current.picked === index} data-away={rolling && current.picked !== index}
            aria-label={`${index + 1}번째 이야기 카드 뒤집기`} className="pin-story-card h-44 min-w-tap max-w-48 flex-1 lg:h-64">
            <span className="pin-story-card-inner"><span className="pin-story-card-front bg-room-dim px-2 ring-1 ring-on-room-subtle/40 ring-inset"><span className="text-[10px] tracking-widest text-on-room-subtle">부산의 이야기</span><PinIcon className="my-4 h-20 w-16 text-light lg:my-6 lg:h-24" /><span className="text-xs text-on-room-muted">{index + 1}번째 초대</span></span>
              <span aria-hidden="true" className="pin-story-card-back bg-light px-2 text-ink lg:px-4"><PinIcon className="mb-3 h-12 w-10" /><span className="font-display text-sm leading-snug font-bold lg:text-lg">{current.picked === index ? card.name : ""}</span></span></span>
          </button>)}
        </div>
        <p role="status" className="mt-3 min-h-6 text-center text-sm text-on-room-muted">{rolling ? "고른 카드에 조명이 켜지고 있어요…" : "카드를 고를 때만 기회를 한 번 사용해요."}</p>
      </> : place ? <div className="mt-5 grid items-start gap-5 lg:grid-cols-2 lg:gap-7">
        <figure><div className="flex h-48 items-center justify-center bg-room-cell lg:h-60">{place.image ? <Image src={place.image.url} alt={`${place.name} 사진`} width={640} height={420} unoptimized className="h-full w-auto max-w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-on-room-muted"><PinIcon className="h-24 w-20 text-light" /><span className="text-xs">사진 대신, 이야기로 만나보세요</span></div>}</div>{place.image && <figcaption className="mt-2 text-[11px] leading-relaxed text-on-room-subtle">사진 한국관광공사 TourAPI · {licenseName(place.image.license)}</figcaption>}</figure>
        <div className="min-w-0"><span className="pin-draw-stamp mb-3 inline-block bg-light px-2 py-1 text-xs font-bold text-ink">오늘 내 여행에 꽂힐 핀</span><p className="text-xs text-on-room-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}</p><h3 className="mt-2 font-display text-2xl font-extrabold">{place.name}</h3><p className="mt-3 text-sm leading-7 text-on-room-muted">{place.summary}</p>
          <Link href={`/docent/${place.id}`} className="mt-4 flex min-h-12 items-center justify-between gap-3 bg-bg px-4 text-sm font-semibold text-ink">이야기 읽고 듣기 <span aria-hidden="true">→</span></Link>
          <button type="button" disabled={added} onClick={() => { tripActions.addCandidate(place.id); setNotice(`${place.name}을 후보함에 담았어요`); }} className="mt-2 min-h-tap w-full text-left text-sm font-semibold disabled:text-on-room-muted">{added ? "✓ 후보함에 담긴 장소" : "♡ 후보함 담기"}</button><p role="status" className={notice ? "mt-1 text-xs text-on-room-muted" : "sr-only"}>{notice}</p>
        </div>
      </div> : <div className="py-10 text-sm leading-7 text-on-room-muted"><PinIcon className="mx-auto mb-5 h-24 w-20 text-light" /><p>{tries >= PIN_TRIES ? "오늘 준비한 세 장의 초대장을 모두 열었어요." : !current ? "지역이 바뀌었어요. 새 지역의 이야기를 다시 섞어볼까요?" : available.length === 0 ? "선택한 지역에는 아직 공개된 도슨트가 없어요. 다른 지역의 이야기도 둘러보세요." : "이 지역의 공개 이야기는 방금 만난 장소 하나뿐이에요."}</p>{!current && tries < PIN_TRIES && <button type="button" onClick={prepare} disabled={rolling} className="mt-3 min-h-tap font-semibold">선택한 지역의 카드 받기 →</button>}<Link href="/docent" className="mt-2 flex min-h-tap items-center font-semibold">공개된 이야기 둘러보기 →</Link></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-on-room-muted"><span aria-label={`남은 기회 ${PIN_TRIES - tries}번`}>{Array.from({ length: PIN_TRIES }, (_, index) => index < PIN_TRIES - tries ? "●" : "○").join(" ")} · 남은 기회 {PIN_TRIES - tries}번</span>
        {place && <button type="button" disabled={tries >= PIN_TRIES || eligible.length === 0} onClick={prepare} className="min-h-tap text-sm font-semibold underline underline-offset-4 disabled:opacity-40">다른 카드 뽑기</button>}
      </div>
      {place && eligible.length === 0 && tries < PIN_TRIES && <p className="mt-2 text-xs leading-relaxed text-on-room-muted">이 지역의 공개 이야기는 이 장소 하나뿐이에요. 다른 지역도 골라보세요.</p>}
      {tries >= PIN_TRIES && <p className="mt-3 text-sm text-on-room-muted">뽑기 끝! 마음에 드는 핀은 후보함에 담아두세요.</p>}
    </dialog>}
  </>;
}
