"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { regionName } from "../../_home/regions";
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import type { SchedulePlace } from "./scheduleModel";

type Props = {
  day: number;
  ids: string[];
  places: Record<string, SchedulePlace>;
  openMenuId: string | null;
  onMenu: (id: string, trigger: HTMLButtonElement) => void;
  onReorder: (id: string, toIndex: number) => void;
  renderMenu: (id: string, index: number) => ReactNode;
};

type Drag = { id: string; from: number; to: number; startY: number; offset: number; rows: { top: number; height: number }[]; gap: number };

export function DayList({ day, ids, places, openMenuId, onMenu, onReorder, renderMenu }: Props) {
  const rows = useRef(new Map<string, HTMLLIElement>());
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [drag, setDrag] = useState<Drag | null>(null);

  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const focusHandle = (id: string) => requestAnimationFrame(() => handles.current.get(id)?.focus());

  const move = (id: string, from: number, to: number) => {
    if (to < 0 || to >= ids.length || to === from) return;
    onReorder(id, to);
    focusHandle(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string, index: number) => {
    const target = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: ids.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    move(id, index, target);
  };

  const targetIndex = (state: Drag, offset: number) => {
    const row = state.rows[state.from];
    const middle = row.top + row.height / 2 + offset;
    let to = 0;
    state.rows.forEach((other, index) => {
      if (index !== state.from && other.top + other.height / 2 < middle) to += 1;
    });
    return to;
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (event.button !== 0 || ids.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const measured = ids.map((rowId) => {
      const rect = rows.current.get(rowId)?.getBoundingClientRect();
      return { top: (rect?.top ?? 0) + window.scrollY, height: rect?.height ?? 0 };
    });
    const gap = measured.length > 1 ? measured[1].top - measured[0].top - measured[0].height : 0;
    setDrag({ id, from: index, to: index, startY: event.pageY, offset: 0, rows: measured, gap });
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    if (event.clientY < 72) window.scrollBy(0, -12);
    else if (event.clientY > window.innerHeight - 72) window.scrollBy(0, 12);
    const offset = event.pageY - drag.startY;
    setDrag({ ...drag, offset, to: targetIndex(drag, offset) });
  };

  const finish = (commit: boolean) => {
    if (!drag) return;
    if (commit && drag.to !== drag.from) move(drag.id, drag.from, drag.to);
    setDrag(null);
  };

  const shiftFor = (index: number) => {
    if (!drag || index === drag.from) return 0;
    const size = drag.rows[drag.from].height + drag.gap;
    if (drag.from < index && index <= drag.to) return -size;
    if (drag.to <= index && index < drag.from) return size;
    return 0;
  };

  return (
    <ol aria-label={`${day}일차 장소 순서`} className="flex flex-col gap-2">
      {ids.map((id, index) => {
        const place = places[id];
        const dragging = drag?.id === id;
        return (
          <li key={id} ref={(node) => { if (node) rows.current.set(id, node); else rows.current.delete(id); }}
            style={{ transform: `translateY(${dragging ? drag.offset : shiftFor(index)}px)` }}
            className={`relative bg-bg ${dragging ? "z-10 shadow-paper" : drag ? "transition-transform duration-150 motion-reduce:transition-none" : ""}`}>
            <div className="flex items-center gap-2 py-2 pr-1">
              <button type="button" ref={(node) => { if (node) handles.current.set(id, node); else handles.current.delete(id); }}
                aria-label={`${nameOf(id)}, ${index + 1}번째. 순서 바꾸기: 위·아래 화살표 키`}
                aria-describedby="reorder-help"
                onKeyDown={(event) => onKeyDown(event, id, index)}
                onPointerDown={(event) => onPointerDown(event, id, index)}
                onPointerMove={onPointerMove}
                onPointerUp={() => finish(true)}
                onPointerCancel={() => finish(false)}
                onLostPointerCapture={() => finish(false)}
                className={`flex min-h-tap min-w-tap shrink-0 touch-none items-center justify-center text-lg text-ink-subtle ${ids.length > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}>
                <span aria-hidden="true">⋮⋮</span>
              </button>
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-room font-display text-sm font-bold text-on-room">{index + 1}</span>
              <div className="min-w-0 flex-1 pl-1">
                <strong className="block font-display text-base font-bold break-words lg:text-lg">{nameOf(id)}</strong>
                {place && <span className="block text-xs text-ink-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}{!canMapPlace(place) && " · 지도 위치 확인 필요"}</span>}
              </div>
              <button type="button" aria-label={`${nameOf(id)} 더보기`} aria-expanded={openMenuId === id} aria-haspopup="true"
                onClick={(event) => onMenu(id, event.currentTarget)}
                className="flex min-h-tap min-w-tap shrink-0 items-center justify-center text-2xl">
                <span aria-hidden="true">⋯</span>
              </button>
            </div>
            {renderMenu(id, index)}
          </li>
        );
      })}
    </ol>
  );
}
