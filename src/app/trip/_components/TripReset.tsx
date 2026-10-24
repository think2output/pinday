"use client";

import { useEffect, useRef, useState } from "react";
import { summary } from "@/lib/trip/rules";
import { tripActions } from "@/lib/trip/store";
import type { Trip } from "@/lib/trip/types";

// 내 여행 페이지의 초기화 UI. 저장소의 reset/undoReset으로 여행 정보 전체를 처리한다.
export function TripReset({ trip, saved, open, onClose }: {
  trip: Trip; saved: boolean; open: boolean; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const counts = summary(trip);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    // 다른 탭에서 바뀐 여행 위에 이 탭의 이전 여행을 되돌리지 않는다.
    const invalidateUndo = (event: StorageEvent) => {
      if (event.key !== "pinday:trip" && event.key !== null) return;
      setUndoAvailable(false);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener("storage", invalidateUndo);
    return () => {
      window.removeEventListener("storage", invalidateUndo);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const reset = () => {
    tripActions.reset();
    onClose();
    setUndoAvailable(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndoAvailable(false), 10_000);
    requestAnimationFrame(() => undoRef.current?.focus());
  };

  return (
    <>
      <dialog ref={dialogRef} aria-labelledby="reset-trip-title" aria-describedby="reset-trip-description"
        onCancel={onClose} onClose={onClose}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-md overflow-y-auto bg-bg p-6 text-ink shadow-paper backdrop:bg-room/80">
        <h2 id="reset-trip-title" className="font-display text-2xl font-extrabold">새 여행을 시작할까요?</h2>
        <p id="reset-trip-description" className="mt-4 text-sm leading-relaxed text-ink-muted">
          후보 {counts.candidates}곳과 일정 {counts.scheduled}곳, 선택한 지역과 기간, 취향 유형을 모두 지워요.
          초기화 뒤 10초 동안 되돌릴 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" autoFocus onClick={onClose} className="min-h-tap min-w-tap px-3 text-sm">취소</button>
          <button type="button" onClick={reset} className="min-h-tap bg-room px-4 text-sm font-bold text-on-room">여행 초기화</button>
        </div>
      </dialog>
      {undoAvailable && !saved && (
        <div className="fixed right-gutter bottom-4 left-gutter z-50 mx-auto flex max-w-lg items-center justify-between gap-3 bg-room px-4 py-2 text-on-room shadow-paper">
          <p role="status" className="text-sm">여행을 초기화했어요</p>
          <button ref={undoRef} type="button" onClick={() => {
            tripActions.undoReset();
            setUndoAvailable(false);
            if (timer.current) clearTimeout(timer.current);
            requestAnimationFrame(() => document.getElementById("trip-continue")?.focus());
          }} className="min-h-tap shrink-0 px-2 text-sm font-bold text-light">되돌리기</button>
        </div>
      )}
    </>
  );
}
