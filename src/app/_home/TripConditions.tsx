"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { dayCount, type PeriodError } from "@/lib/trip/dates";
import { tripActions } from "@/lib/trip/store";
import type { Trip } from "@/lib/trip/types";
import { regionName } from "./regions";

const PERIOD_ERROR: Record<PeriodError, string> = {
  invalid: "날짜를 다시 확인해 주세요",
  past: "지난 날짜는 고를 수 없어요",
  "end-before-start": "오는 날이 가는 날보다 빨라요",
  "too-long": "여행은 최대 14일까지 정할 수 있어요",
};

const shortDate = (date: string) => date.slice(5).replace("-", ".");
const nightsLabel = (days: number) => (days === 1 ? "당일" : `${days - 1}박 ${days}일`);

// 날짜는 기기 시간 기준이라 서버 렌더와 다를 수 있어, 브라우저에서 그려진 뒤에만 보여준다(lib/trip README)
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

type Props = { trip: Trip; saved: boolean; onRemoveRegion: (region: string) => void; onReset: () => void };

// 홈 여행 조건: 어디·언제 + 시작 버튼 (기획서 6-1). 기간은 화면을 떠나지 않고 그 자리의 작은 창에서 바꾼다(4장 이동 규칙 4).
export function TripConditions({ trip, saved, onRemoveRegion, onReset }: Props) {
  const mounted = useMounted();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [message, setMessage] = useState<string | null>(null);
  const days = dayCount(trip.startDate, trip.endDate);

  const openEditor = () => {
    setDraft({ start: trip.startDate, end: trip.endDate });
    setMessage(null);
    setEditing(true);
  };
  const apply = () => {
    const { error, notice } = tripActions.setPeriod(draft.start, draft.end);
    if (error) return setMessage(PERIOD_ERROR[error]);
    setEditing(false);
    setMessage(notice);
  };

  const label = "w-7.5 shrink-0 text-[13px] text-on-room-subtle lg:w-9 lg:text-sm";
  const value = "font-display text-base font-bold tracking-[-0.03em] text-on-room lg:text-lg";

  return (
    <div className="flex flex-col">
      <div className="flex min-h-tap items-center gap-4 lg:min-h-12 lg:gap-5">
        <span className={label}>어디</span>
        <div className="flex flex-1 flex-wrap items-center gap-x-3.5">
          {trip.regions.length === 0 ? (
            <span className={value}>부산 전체</span>
          ) : (
            trip.regions.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => onRemoveRegion(region)}
                aria-label={`${regionName(region)} 선택 해제`}
                className={`flex min-h-tap min-w-tap items-center gap-1.25 ${value}`}
              >
                {regionName(region)}
                <span aria-hidden="true" className="font-sans text-[11px] font-medium text-on-room-subtle">✕</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-tap items-center gap-4 lg:min-h-12 lg:gap-5">
        <span className={label}>언제</span>
        <button
          type="button"
          onClick={editing ? () => setEditing(false) : openEditor}
          aria-expanded={editing}
          aria-label={mounted ? `여행 기간 바꾸기, 지금 ${trip.startDate}부터 ${trip.endDate}까지 ${nightsLabel(days)}` : "여행 기간 바꾸기"}
          className="flex min-h-tap flex-wrap items-center gap-x-2.5 text-left"
        >
          <span className={value}>{mounted ? `${shortDate(trip.startDate)} — ${shortDate(trip.endDate)}` : " "}</span>
          {mounted && (
            <span className="text-[13px] text-on-room-muted lg:text-sm">
              {nightsLabel(days)}
              {!saved && " · 자동으로 정했어요"} <span aria-hidden="true">›</span>
            </span>
          )}
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex flex-col gap-3 bg-room-cell p-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-xs text-on-room-muted">
              가는 날
              <input
                type="date"
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="min-h-tap rounded-control border border-on-room-subtle bg-transparent px-3 text-base text-on-room [color-scheme:dark]"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-xs text-on-room-muted">
              오는 날
              <input
                type="date"
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="min-h-tap rounded-control border border-on-room-subtle bg-transparent px-3 text-base text-on-room [color-scheme:dark]"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-4">
            <button type="button" onClick={() => setEditing(false)} className="min-h-tap min-w-tap px-1 text-sm text-on-room-muted">
              닫기
            </button>
            <button type="button" onClick={apply} className="min-h-tap rounded-control bg-on-room px-5 text-sm font-bold text-ink">
              이 기간으로
            </button>
          </div>
          {saved && (
            <button type="button" onClick={onReset} className="min-h-tap self-start text-sm text-on-room-muted">
              새 여행 시작하기
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-2 text-[13px] text-light">
          {message}
        </p>
      )}

      <Link
        href="/explore"
        className="mt-5 flex h-14 w-full items-center justify-between rounded-control bg-bg px-5 font-display text-[17px] font-bold tracking-[-0.02em] text-ink shadow-glow-soft lg:mt-7 lg:h-15 lg:max-w-110 lg:px-6 lg:text-lg"
      >
        {trip.regions.length > 0 ? `선택한 ${trip.regions.length}곳으로 시작하기` : "부산 전체로 시작하기"}
        <span aria-hidden="true" className="text-xl lg:text-[22px]">→</span>
      </Link>
    </div>
  );
}
