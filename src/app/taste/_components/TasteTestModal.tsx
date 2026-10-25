"use client";

import { useEffect, useRef, useState } from "react";
import { useTrip } from "@/lib/trip/store";
import type { TasteId } from "../../../lib/trip/types";
import { QUESTIONS, TASTE_IDS, scoreTaste } from "./tasteModel";
import { TasteArt } from "./TasteArt";

export function TasteTestModal({ onClose, onComplete, onSaved }: { onClose: () => void; onComplete: (taste: TasteId) => void; onSaved: (taste: TasteId) => void }) {
  const { trip } = useTrip();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TasteId[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const question = QUESTIONS[step];
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); content.current?.scrollTo({ top: 0 }); }, [step]);
  const choose = (taste: TasteId) => {
    const next = [...answers.slice(0, step), taste];
    setAnswers(next);
    if (next.length === QUESTIONS.length) {
      const type = scoreTaste(next);
      if (type) onComplete(type);
    } else setStep(step + 1);
  };
  return <dialog ref={dialog} aria-labelledby="taste-question-title" aria-describedby="taste-modal-scene" onCancel={onClose}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")].filter((button) => button.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-bg p-0 text-ink shadow-paper backdrop:bg-room/70 backdrop:backdrop-blur-sm lg:h-fit lg:max-h-[90dvh] lg:w-[calc(100%-4rem)] lg:max-w-[1060px]">
    <div ref={content} className="max-h-dvh overflow-y-auto px-4 pt-4 pb-5 break-keep lg:max-h-[90dvh] lg:px-8 lg:pt-5 lg:pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-ink-muted"><span aria-hidden="true" className="size-2 rounded-full bg-light" />나의 부산 이야기 · 다섯 장면</p>
        <button type="button" onClick={onClose} aria-label="취향 테스트 닫기" className="min-h-tap min-w-tap text-xl">×</button>
      </div>
      <div className="mt-1 flex items-center gap-3 lg:mt-2">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-tap min-w-tap text-sm text-ink-muted disabled:opacity-30">← 이전</button>
        <ol aria-label="부산에서의 하루" className="grid min-w-0 flex-1 grid-cols-5 gap-2">
          {QUESTIONS.map((item, index) => <li key={item.chapter} aria-current={index === step ? "step" : undefined} className={`text-center text-[11px] lg:text-xs ${index === step ? "font-semibold text-ink" : "text-ink-subtle"}`}>
            <span aria-hidden="true" className={`mb-2 block h-0.5 ${index <= step ? "bg-ink" : "bg-line"}`} />{item.chapter}
          </li>)}
        </ol>
        <p className="shrink-0 text-xs text-ink-muted">{step + 1} / {QUESTIONS.length}</p>
      </div>
      <div className="mt-5 grid gap-5 lg:mt-7 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.5fr)] lg:gap-9">
        <div className="lg:pt-5"><p id="taste-modal-scene" className="max-w-sm text-sm leading-6 text-ink-muted">{question.scene}</p>
          <h2 id="taste-question-title" ref={heading} tabIndex={-1} className="mt-3 whitespace-pre-line font-display text-[29px] leading-snug font-extrabold tracking-tight outline-none lg:mt-5 lg:text-[36px]">{question.title}</h2>
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle lg:mt-5">도슨트에게 들려주고 싶은 답을 골라주세요.</p>
        </div>
        <div role="group" aria-label={`${step + 1}번째 장면의 선택지`} className="grid grid-cols-2 gap-3">
          {TASTE_IDS.map((id, index) => <button key={id} type="button" data-taste-choice={id} onClick={() => choose(id)}
            className="group min-h-44 bg-line/30 p-3 text-left transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none lg:min-h-51 lg:p-4">
            <TasteArt kind={id} className="mx-auto w-full max-w-44 text-ink transition-transform group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none" />
            <span className="mt-1 block font-display text-sm leading-snug font-bold lg:text-base">{question.choices[index][0]}</span>
            <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">{question.choices[index][1]}</span>
          </button>)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5">
        <button type="button" onClick={onClose} className="min-h-tap text-xs text-ink-muted underline underline-offset-4">지금은 건너뛰기</button>
        {trip.taste && <button type="button" onClick={() => { if (trip.taste) onSaved(trip.taste); }} className="min-h-tap text-xs text-ink-muted underline underline-offset-4">저장된 내 이야기 보기</button>}
      </div>
    </div>
  </dialog>;
}
