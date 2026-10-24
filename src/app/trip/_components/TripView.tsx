"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTrip } from "@/lib/trip/store";
import { TripSummary } from "./TripSummary";
import { TripReset } from "./TripReset";

export function TripView() {
  const { trip, saved } = useTrip();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-page px-gutter pb-16 lg:box-content lg:px-gutter-wide">
      <SiteHeader />
      <main className="mx-auto max-w-5xl pt-12 lg:pt-20">
        <h1 className="font-display text-4xl font-extrabold tracking-tight lg:text-5xl">내 여행</h1>
        <p className="mt-3 text-sm text-ink-muted">이 브라우저에 저장한 여행을 확인하고 이어서 계획해요.</p>
        {saved ? (
          <>
            <TripSummary trip={trip} onReset={() => setResetOpen(true)} />
            <Link href="/#trip-conditions" className="mt-6 inline-flex min-h-tap items-center text-sm font-semibold">지역·기간 바꾸기 →</Link>
          </>
        ) : (
          <div className="pt-12">
            <h2 className="font-display text-xl font-bold">아직 저장한 여행이 없어요</h2>
            <p className="mt-3 text-sm text-ink-muted">홈에서 가고 싶은 지역과 기간을 정해보세요.</p>
            <Link href="/" className="mt-6 inline-flex min-h-tap items-center bg-room px-5 font-semibold text-on-room">여행 시작하기 →</Link>
          </div>
        )}
        <TripReset trip={trip} saved={saved} open={resetOpen} onClose={() => setResetOpen(false)} />
      </main>
    </div>
  );
}
