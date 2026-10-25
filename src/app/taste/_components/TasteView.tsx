"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { tripActions, useTrip } from "@/lib/trip/store";
import type { TasteId } from "../../../lib/trip/types";
import { QUESTIONS, TASTE_IDS, scoreTaste, type TastePlace } from "./tasteModel";
import { TasteArt } from "./TasteArt";
import { TasteResult, type RelatedStory } from "./TasteResult";

const labels = ["골목에 남은 온기", "바다가 건네는 여백", "장소가 기억한 시간", "다음 풍경의 발견"];

export function TasteView({ places, stories }: { places: Record<string, TastePlace>; stories: RelatedStory[] }) {
  const { trip } = useTrip();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TasteId[]>([]);
  const [result, setResult] = useState<TasteId | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, [started, step, result]);

  const choose = (taste: TasteId) => {
    const next = [...answers.slice(0, step), taste];
    setAnswers(next);
    if (next.length === QUESTIONS.length) {
      const type = scoreTaste(next);
      if (type) { tripActions.setTaste(type); setResult(type); }
    } else setStep(step + 1);
  };
  const restart = () => { setAnswers([]); setResult(null); setStep(0); setStarted(true); };
  if (result) return <TasteResult taste={result} places={places} stories={stories} onRestart={restart} />;
  const question = QUESTIONS[step];

  return <div className="min-h-dvh bg-room text-on-room">
    <div className="mx-auto w-full max-w-page px-gutter pb-10 lg:box-content lg:px-gutter-wide lg:pb-16">
      <SiteHeader tone="room" />
      <main className="pt-7 break-keep lg:pt-12">
        {!started ? <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20 lg:pt-8">
          <div>
            <p className="flex items-center gap-2 text-sm text-on-room-muted"><span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />당신의 부산, 첫 번째 이야기</p>
            <h1 ref={heading} tabIndex={-1} className="mt-5 font-display text-[42px] leading-[1.17] font-extrabold tracking-tight outline-none lg:text-[68px]">당신에게 켜지는<br />부산의 이야기</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-on-room-muted">부산은 한 가지 이야기로 읽히지 않으니까.<br />도슨트가 건네는 다섯 장면에서<br />마음이 향하는 쪽을 골라주세요.</p>
            <p className="mt-4 text-sm text-on-room-subtle">마지막에는 당신과 어울리는<br className="lg:hidden" /> 부산 대표 장소 3곳을 이어드릴게요.</p>
            <button type="button" onClick={() => setStarted(true)} className="mt-8 inline-flex min-h-14 w-full max-w-80 items-center justify-between bg-bg px-5 font-semibold text-ink shadow-glow-soft">내 이야기의 첫 장 열기 <span aria-hidden="true">→</span></button>
            <p className="mt-3 text-xs text-on-room-subtle">다섯 장면 · 약 1분 · 정답은 없어요</p>
            {trip.taste && <button type="button" onClick={() => setResult(trip.taste)} className="mt-2 min-h-tap text-sm text-on-room-muted underline underline-offset-4">저장된 내 이야기 다시 보기</button>}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 lg:gap-x-8 lg:gap-y-10" aria-label="부산을 만나는 네 가지 이야기">
            {TASTE_IDS.map((id, index) => <div key={id} className="relative">
              <TasteArt kind={id} className="w-full text-on-room-muted" />
              <p className="text-center text-xs text-on-room-muted lg:text-sm">{labels[index]}</p>
            </div>)}
          </div>
        </div> : <>
          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={() => step === 0 ? setStarted(false) : setStep(step - 1)} className="min-h-tap min-w-tap text-sm text-on-room-muted">← 이전</button>
            <p className="text-xs text-on-room-muted">장면 {step + 1} / {QUESTIONS.length}</p>
            <Link href="/explore" className="inline-flex min-h-tap items-center text-sm text-on-room-muted">건너뛰기 →</Link>
          </div>
          <ol aria-label="부산에서의 하루" className="mt-4 grid grid-cols-5 gap-2 lg:mt-5 lg:max-w-xl">
            {QUESTIONS.map((item, index) => <li key={item.chapter} aria-current={index === step ? "step" : undefined} className={`text-center text-xs ${index === step ? "font-semibold text-on-room" : "text-on-room-subtle"}`}>
              <span aria-hidden="true" className={`mb-2 block h-0.5 ${index <= step ? "bg-light" : "bg-room-cell"}`} />{item.chapter}
            </li>)}
          </ol>
          <div className="mt-7 grid gap-7 lg:mt-12 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] lg:gap-20">
            <div className="lg:pt-8">
              <p className="max-w-sm text-sm leading-6 text-on-room-muted">{question.scene}</p>
              <h1 ref={heading} tabIndex={-1} className="mt-3 whitespace-pre-line font-display text-[30px] leading-snug font-extrabold tracking-tight outline-none lg:mt-6 lg:text-[48px]">{question.title}</h1>
              <p className="mt-4 text-xs text-on-room-subtle lg:mt-7 lg:text-sm">지금 마음이 향하는 장면을 눌러주세요.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:gap-4" role="group" aria-label={`${step + 1}번째 장면의 선택지`}>
              {TASTE_IDS.map((id, index) => <button key={id} type="button" data-taste-choice={id} onClick={() => choose(id)}
                className="group relative min-h-48 overflow-hidden bg-room-cell p-3 text-left transition-colors hover:bg-room-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-light motion-reduce:transition-none lg:min-h-61 lg:p-5">
                <TasteArt kind={id} className="mx-auto w-full max-w-60 text-on-room-muted transition-transform group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none" />
                <span className="mt-2 block font-display text-sm leading-snug font-bold text-on-room lg:text-lg">{question.choices[index][0]}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-on-room-muted lg:text-sm">{question.choices[index][1]}</span>
              </button>)}
            </div>
          </div>
        </>}
      </main>
    </div>
  </div>;
}
