"use client";

import { useEffect, useRef, useState } from "react";
import { tripActions } from "@/lib/trip/store";
import { todayLocal, validatePeriod, type PeriodError } from "@/lib/trip/dates";
import type { Trip } from "@/lib/trip/types";
import { MAP_REGIONS } from "../../_home/regions";

const ERRORS: Record<PeriodError, string> = {
  invalid: "날짜를 다시 확인해 주세요", past: "지난 날짜는 고를 수 없어요",
  "end-before-start": "오는 날이 가는 날보다 빨라요", "too-long": "여행은 최대 14일까지 정할 수 있어요",
};

export function ConditionsEditor({ trip, onClose, onNotice }: { trip: Trip; onClose: () => void; onNotice: (notice: string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [regions, setRegions] = useState(trip.regions);
  const [start, setStart] = useState(trip.startDate);
  const [end, setEnd] = useState(trip.endDate);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="conditions-heading"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-xl overflow-y-auto bg-bg p-5 text-ink shadow-paper backdrop:bg-room/80 lg:p-8">
      <form onSubmit={(event) => {
        event.preventDefault();
        const invalid = validatePeriod(start, end, todayLocal());
        if (invalid) { setError(ERRORS[invalid]); return; }
        const result = tripActions.setPeriod(start, end);
        if (result.error) { setError(ERRORS[result.error]); return; }
        tripActions.setRegions(regions);
        onNotice(result.notice);
        onClose();
      }}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="conditions-heading" className="font-display text-2xl font-extrabold">어디로, 언제 갈까요?</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="여행 조건 닫기" className="min-h-tap min-w-tap">✕</button>
        </div>
        <p className="mt-5 text-sm text-ink-muted">지역을 고르지 않으면 부산 전체를 보여드려요.</p>
        <fieldset className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-4">
          <legend className="sr-only">여행 지역</legend>
          {MAP_REGIONS.map((region) => (
            <label key={region.region} className="flex min-h-tap cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={regions.includes(region.region)} onChange={() => setRegions((current) => current.includes(region.region) ? current.filter((value) => value !== region.region) : [...current, region.region])} className="size-4 accent-ink" />
              {region.name}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={() => setRegions([])} className="mt-2 min-h-tap text-sm font-semibold">전체 해제</button>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-2 text-sm">가는 날
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="min-h-tap min-w-0 border border-line px-3" />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm">오는 날
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="min-h-tap min-w-0 border border-line px-3" />
          </label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-tap px-3 text-sm">취소</button>
          <button type="submit" className="min-h-tap bg-room px-5 text-sm font-bold text-on-room">이 조건으로 보기</button>
        </div>
      </form>
    </dialog>
  );
}
