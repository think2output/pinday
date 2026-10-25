"use client";

import { useEffect, useRef, useState } from "react";
import { tripActions, useTrip } from "@/lib/trip/store";
import { dateOfDay } from "../../../lib/trip/dates";
import { newCourseIds, type CourseStop } from "./tasteModel";

export function TasteCoursePicker({ course, onClose, onNotice }: { course: CourseStop[]; onClose: () => void; onNotice: (message: string) => void }) {
  const { trip } = useTrip();
  const [picked, setPicked] = useState(1);
  const day = Math.min(picked, trip.days.length);
  const dialog = useRef<HTMLDialogElement>(null);
  const fresh = newCourseIds(course, trip.days);
  const freshPlaces = course.filter((place) => fresh.includes(place.id));
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const add = () => {
    if (!fresh.length || day < 1) return;
    for (const id of fresh) tripActions.addToDay(id, day);
    onNotice(`${day}일차 맨 뒤에 ${fresh.length}곳을 추천 순서로 담았어요. 기존 일정은 그대로 두었어요.`);
    onClose();
  };
  return <dialog ref={dialog} aria-labelledby="taste-picker-title" onCancel={onClose}
    className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto bg-bg p-5 text-ink backdrop:bg-room/50 lg:inset-0 lg:m-auto lg:max-w-lg lg:p-7">
    <div className="flex items-center justify-between gap-3"><h2 id="taste-picker-title" className="font-display text-xl font-extrabold">어느 날에 담을까요?</h2><button type="button" onClick={onClose} aria-label="일차 선택 닫기" className="min-h-tap min-w-tap text-xl">×</button></div>
    <p className="mt-2 text-sm leading-relaxed text-ink-muted">새 장소는 고른 날의 맨 뒤에 붙여요. 이미 어느 날에든 담긴 장소는 옮기거나 중복으로 넣지 않아요.</p>
    <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="코스를 넣을 일차">
      {trip.days.map((ids, index) => <button key={index} type="button" aria-pressed={day === index + 1} onClick={() => setPicked(index + 1)}
        className={`min-h-16 px-3 py-2 text-left text-sm ${day === index + 1 ? "bg-room text-on-room" : "ring-1 ring-line ring-inset"}`}>
        <strong className="block">{index + 1}일차 · 현재 {ids.length}곳</strong><span className={`text-xs ${day === index + 1 ? "text-on-room-muted" : "text-ink-muted"}`}>{dateOfDay(trip.startDate, index + 1).slice(5).replace("-", ".")}</span>
      </button>)}
    </div>
    <p className="mt-4 text-sm font-semibold">{fresh.length ? `새로 담을 ${fresh.length}곳` : "이 코스는 이미 일정에 모두 담겨 있어요"}</p>
    {freshPlaces.length > 0 && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{freshPlaces.map((place) => place.name).join(" → ")}</p>}
    {course.length > fresh.length && <p role="status" className="mt-2 text-xs leading-relaxed text-ink-muted">이미 담긴 {course.length - fresh.length}곳은 현재 날짜와 순서를 유지해요.</p>}
    <button type="button" onClick={add} disabled={!fresh.length} className="mt-5 min-h-14 w-full bg-room px-4 text-sm font-semibold text-on-room disabled:opacity-40">{fresh.length ? `${day}일차에 ${fresh.length}곳 담기` : "새로 담을 장소가 없어요"}</button>
  </dialog>;
}
