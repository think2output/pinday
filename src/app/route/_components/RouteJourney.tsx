"use client";

import { Fragment, useEffect, useRef, type KeyboardEvent } from "react";
import { minutesLabel } from "./routeModel";
import type { LegState } from "./useRouteLegs";

export function RouteJourney({ names, states, selected, onSelect }: {
  names: string[]; states: LegState[]; selected: number; onSelect: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const signature = names.join("|");
  useEffect(() => {
    const button = buttons.current.get(selected), container = scroller.current;
    if (button && container) container.scrollTo({ left: button.offsetLeft - (container.clientWidth - button.clientWidth) / 2 });
  }, [selected, signature]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: states.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(states.length - 1, next));
    onSelect(index);
    buttons.current.get(index)?.focus();
  };

  return <div className="mb-7 hidden min-w-0 items-center gap-2 lg:flex">
    <button type="button" disabled={selected === 0} onClick={() => onSelect(selected - 1)} aria-label="이전 이동 구간"
      className="min-h-tap min-w-tap shrink-0 text-xl disabled:opacity-30">‹</button>
    <div ref={scroller} role="tablist" aria-label="하루 동선의 이동 구간" className="relative flex min-w-0 flex-1 items-center overflow-x-auto py-2">
      {names.map((name, index) => <Fragment key={`${index}-${name}`}>
        <span className="flex w-40 shrink-0 items-center gap-2 pr-2" title={name}>
          <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center bg-room text-xs font-bold text-on-room">{index + 1}</span>
          <span className="line-clamp-2 text-sm font-semibold">{name}</span>
        </span>
        {index < states.length && <span className="relative flex w-28 shrink-0 items-center justify-center px-2">
          <span aria-hidden="true" className="absolute inset-x-0 h-px bg-line" />
          <button type="button" role="tab" id={`route-leg-tab-${index}`} aria-selected={index === selected} aria-controls="route-leg-detail"
            aria-label={`${index + 1}번 ${name}에서 ${index + 2}번 ${names[index + 1]}까지, ${states[index].kind === "ready" ? minutesLabel(states[index].leg.minutes) : states[index].kind === "loading" ? "찾는 중" : "확인 필요"}`}
            tabIndex={index === selected ? 0 : -1} onKeyDown={onKey} onClick={() => onSelect(index)}
            ref={(node) => { if (node) buttons.current.set(index, node); else buttons.current.delete(index); }}
            className={`relative min-h-tap min-w-tap px-3 py-2 text-sm font-bold ${index === selected ? "bg-room text-on-room shadow-[0_3px_0_var(--color-light)]" : "bg-bg text-ink"}`}>
            {states[index].kind === "ready" ? minutesLabel(states[index].leg.minutes) : states[index].kind === "loading" ? "찾는 중" : "확인 필요"} →
          </button>
        </span>}
      </Fragment>)}
    </div>
    <button type="button" disabled={selected === states.length - 1} onClick={() => onSelect(selected + 1)} aria-label="다음 이동 구간"
      className="min-h-tap min-w-tap shrink-0 text-xl disabled:opacity-30">›</button>
  </div>;
}
