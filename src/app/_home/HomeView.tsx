"use client";

import { SiteHeader } from "@/components/SiteHeader";
import type { StoryCard } from "@/lib/server/home";
import { tripActions, useTrip } from "@/lib/trip/store";
import { BusanMap } from "./BusanMap";
import { StoryShelf } from "./StoryShelf";
import { TripConditions } from "./TripConditions";
import { regionName } from "./regions";
import { TasteLauncher } from "../taste/_components/TasteLauncher";
import { PinDraw } from "./PinDraw";
import type { PinPlace } from "./pinModel";

type Props = {
  regionCounts: Record<string, number>;
  weekly: StoryCard[];
  storiesByRegion: Record<string, StoryCard[]>;
  pinPlaces: PinPlace[];
};

// 홈 (기획서 6-1, 시안 C "어두운 전시실"): 메뉴 → 첫 문구 → 여행 조건(지도·어디·언제·시작) → 이야기 → 취향 테스트·랜덤 뽑기 → 출처
export function HomeView({ regionCounts, weekly, storiesByRegion, pinPlaces }: Props) {
  const { trip, saved } = useTrip();
  const selected = trip.regions;

  const toggleRegion = (region: string) =>
    tripActions.setRegions(selected.includes(region) ? selected.filter((r) => r !== region) : [...selected, region]);
  const removeRegion = (region: string) => tripActions.setRegions(selected.filter((r) => r !== region));

  const storyHeading =
    selected.length === 0 ? "이번 주 부산 이야기" : selected.length === 1 ? `${regionName(selected[0])}의 이야기` : "조명 켜진 곳의 이야기";
  const stories =
    selected.length === 0
      ? weekly
      : selected.length === 1
        ? (storiesByRegion[selected[0]] ?? [])
        : selected.flatMap((r) => (storiesByRegion[r] ?? []).slice(0, 1));

  return (
    <main className="flex flex-1 flex-col">
      <div className={`overflow-x-clip transition-colors duration-500 ${selected.length > 0 ? "bg-room-dim" : "bg-room"}`}>
        <div className="mx-auto max-w-page px-gutter pb-6 lg:box-content lg:px-gutter-wide lg:pb-10">
          <SiteHeader tone="room" />
          {/* 휴대폰: 첫 문구 → 지도 → 어디·언제 / 데스크톱: 왼쪽 첫 문구·어디·언제, 오른쪽 지도 */}
          <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-16 lg:pt-10">
            <div className="pt-8 lg:col-start-1 lg:row-start-1 lg:pt-0">
              <h1 className="font-display text-[38px] leading-[1.16] font-extrabold tracking-[-0.05em] whitespace-pre-line text-on-room lg:text-[68px] lg:leading-[1.1] lg:tracking-[-0.055em]">
                {"부산을\nPIN 해볼까요?"}
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-on-room-muted lg:mt-5 lg:text-lg">
                풍성한 여행이 될 수 있도록 도와드려요
              </p>
            </div>
            <div className="pt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-0">
              <BusanMap selected={selected} counts={regionCounts} onToggle={toggleRegion} onClear={() => tripActions.setRegions([])} />
            </div>
            <div className="pt-1 lg:col-start-1 lg:row-start-2 lg:pt-10">
              <TripConditions trip={trip} saved={saved} onRemoveRegion={removeRegion} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-page lg:box-content lg:px-gutter-wide">
        <div className="pt-10 lg:pt-16">
          <StoryShelf heading={storyHeading} stories={stories} />
        </div>

        <section aria-label="여행 시작 도우미" className="grid grid-cols-2 gap-2 px-gutter pt-14 lg:grid-cols-2 lg:gap-4 lg:px-0 lg:pt-26">
          <TasteLauncher
            className="relative flex min-h-42 flex-col justify-end gap-1.5 overflow-hidden rounded-card bg-room p-4 text-left text-on-room lg:min-h-55 lg:p-8"
          >
            <span
              aria-hidden="true"
              className="absolute -top-7.5 left-1/2 size-37.5 -translate-x-1/2 rounded-full lg:-top-15 lg:left-auto lg:right-10 lg:size-65 lg:translate-x-0"
              style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--color-light) 55%, transparent), transparent)" }}
            />
            <span className="relative text-xs text-on-room-muted lg:text-[13px]">다섯 장면 · 나의 이야기 취향</span>
            <span className="relative font-display text-[19px] leading-tight font-extrabold tracking-[-0.045em] lg:text-[28px]">
              어디로 가야 할지
              <br /> 모르겠다면?
            </span>
          </TasteLauncher>
          <PinDraw places={pinPlaces} />
        </section>

        <footer className="px-gutter pt-16 pb-8 lg:px-0 lg:pt-24 lg:pb-10">
          <p className="text-[11px] leading-relaxed text-ink-subtle lg:text-xs">
            장소 정보 한국관광공사 TourAPI · AI 도슨트 근거는 상세 화면에 표시 · 지도 카카오 · 지역 지도{" "}
            <a href="https://github.com/swcho/korea-maps" target="_blank" rel="noreferrer" className="inline-flex min-h-tap items-center">SGIS(2020) · StatGarten</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
