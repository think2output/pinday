"use client";

import Link from "next/link";
import { dayCount } from "@/lib/trip/dates";
import { summary } from "@/lib/trip/rules";
import type { Trip } from "@/lib/trip/types";
import { regionName } from "../../_home/regions";

export function TripSummary({ trip, onReset }: { trip: Trip; onReset: () => void }) {
  const counts = summary(trip);
  const days = dayCount(trip.startDate, trip.endDate);
  const largestDay = Math.max(1, ...trip.days.map((ids) => ids.length));
  const dots = Math.max(14, Math.min(counts.candidates, 28));

  return (
    <section aria-labelledby="my-trip-title" className="mt-10 text-ink lg:grid lg:grid-cols-2 lg:gap-x-16">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="my-trip-title" className="font-display text-xl font-extrabold">여행 요약</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {trip.regions.length ? trip.regions.map(regionName).join(" · ") : "부산 전체"}
            </p>
          </div>
          <details className="relative shrink-0">
            <summary aria-label="내 여행 메뉴" className="flex min-h-tap min-w-tap cursor-pointer list-none items-center justify-center text-2xl [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true">⋯</span>
            </summary>
            <div className="absolute top-full right-0 z-10 w-48 bg-room p-2 text-on-room shadow-paper">
              <button type="button" onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onReset();
              }} className="min-h-tap w-full px-3 text-left text-sm">
                새 여행 시작하기
              </button>
            </div>
          </details>
        </div>

        <div role="img" aria-label={`모은 핀 ${counts.candidates}개`} className="mt-5 flex max-w-56 flex-wrap gap-2.5">
          {Array.from({ length: dots }, (_, index) => (
            <span key={index} className={`size-3.5 rounded-full ${index < counts.candidates ? "bg-light" : "bg-line"}`} />
          ))}
          {counts.candidates > dots && <span aria-hidden="true" className="text-xs text-ink-muted">+{counts.candidates - dots}</span>}
        </div>
        <p className="mt-5 font-display text-4xl font-extrabold tracking-tight lg:text-5xl">
          {days === 1 ? "당일" : `${days - 1}박 ${days}일`}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          <time dateTime={trip.startDate}>{trip.startDate.replaceAll("-", ".")}</time>
          {" — "}
          <time dateTime={trip.endDate}>{trip.endDate.replaceAll("-", ".")}</time>
        </p>
        <p className="mt-2 text-sm">후보 {counts.candidates}곳 · 일정 {counts.scheduled}곳</p>
      </div>

      <div className="mt-6 flex flex-col justify-end lg:mt-0">
        <ul aria-label="날짜별 일정" className="grid gap-2">
          {trip.days.map((ids, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 text-ink-muted">{index + 1}일차</span>
              <span aria-hidden="true" className="h-2 flex-1 bg-line">
                <span className="block h-full bg-ink" style={{ width: `${(ids.length / largestDay) * 100}%` }} />
              </span>
              <span className="min-w-8 text-right">{ids.length}곳</span>
            </li>
          ))}
        </ul>
        <Link id="trip-continue" href={counts.candidates ? "/schedule" : "/explore"}
          className="mt-6 flex min-h-14 items-center justify-between bg-room px-5 font-display font-bold text-on-room">
          이어서 계획하기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
