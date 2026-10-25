"use client";

// 시안 전용 화면: A(경로 API로 시간·환승 표시) / B(카카오맵 링크만) 비교. ?v=a 또는 ?v=b
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTrip } from "@/lib/trip/store";
import { dayCount } from "@/lib/trip/dates";
import { regionName } from "../../_home/regions";
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import { distanceKm, distanceLabel, mapStops, shortDate, tripDates, type SchedulePlace } from "../../schedule/_components/scheduleModel";
import { ScheduleMap } from "../../schedule/_components/ScheduleMap";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

type Mode = "traffic" | "walk";
const MODE_LABEL: Record<Mode, string> = { traffic: "대중교통", walk: "걸어서" };

/** 카카오맵 길찾기 URL (https://apis.map.kakao.com/web/guide/#routeurl) */
function kakaoRoute(mode: Mode, from: SchedulePlace, to: SchedulePlace) {
  const point = (place: SchedulePlace) => `${encodeURIComponent(place.name.replaceAll(",", " "))},${place.lat},${place.lng}`;
  return `https://map.kakao.com/link/by/${mode}/${point(from)}/${point(to)}`;
}

/** 시안 A에서만 쓰는 지어낸 값. 실제로는 카카오맵 경로 API 응답이 들어간다 */
function fakeLeg(km: number) {
  if (km < 1) return { mode: "walk" as Mode, minutes: Math.max(3, Math.round(km * 15)), transfers: 0 };
  return { mode: "traffic" as Mode, minutes: Math.round(10 + km * 4), transfers: km > 6 ? 1 : 0 };
}

function minutesLabel(total: number) {
  const hours = Math.floor(total / 60);
  return hours ? `${hours}시간 ${total % 60}분` : `${total}분`;
}

export function RouteMockView({ places }: { places: Record<string, SchedulePlace> }) {
  const { trip } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const variant = useSearchParams().get("v") === "a" ? "a" : "b";
  const [pickedDay, setPickedDay] = useState(1);
  const [mode, setMode] = useState<Mode>("traffic");

  const total = trip.days.length;
  const dates = tripDates(trip.startDate, total);
  const day = Math.min(pickedDay, total);
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const stops = useMemo(() => mapStops(ids, places), [ids, places]);
  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);

  const legs = ids.slice(1).map((toId, index) => {
    const from = places[ids[index]], to = places[toId];
    const ok = !!from && !!to && canMapPlace(from) && canMapPlace(to);
    const km = ok ? distanceKm(from, to) : null;
    return { no: index + 1, from, to, fromId: ids[index], toId, km, fake: km === null ? null : fakeLeg(km) };
  });
  const fakeTotal = legs.reduce((sum, leg) => sum + (leg.fake?.minutes ?? 0), 0);
  const fakeTransit = legs.filter((leg) => leg.fake?.mode === "traffic").length;

  const title = ids.length < 2
    ? "이동할 구간이 없어요"
    : variant === "a"
      ? `${day}일차 이동 약 ${minutesLabel(fakeTotal)}`
      : `${day}일차 · ${ids.length}곳, 이동 ${legs.length}번`;
  const body = ids.length < 2
    ? "그날 장소가 두 곳 이상이면 구간이 생겨요."
    : variant === "a"
      ? `대중교통 ${fakeTransit}번 · 걸어서 ${legs.length - fakeTransit}번`
      : `구간을 누르면 카카오맵에서 그 길을 ${MODE_LABEL[mode]} 기준으로 바로 열어요.`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-gutter lg:max-w-[calc(var(--container-page)+2*var(--spacing-gutter-wide))] lg:px-gutter-wide">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <p className="mt-3 bg-room px-3 py-2 text-xs text-on-room">
          {variant === "a"
            ? "시안 A · 경로 API를 켰을 때. 시간·환승 숫자는 지어낸 예시 값이에요."
            : "시안 B · 카카오맵 링크만. 시간·환승은 카카오맵에서 확인해요."}
          {" "}
          <Link href={`/route?v=${variant === "a" ? "b" : "a"}`} className="font-semibold underline underline-offset-4">시안 {variant === "a" ? "B" : "A"} 보기</Link>
        </p>
        <div className="flex items-center justify-between gap-3 pt-3 lg:pt-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-4xl">어떻게 갈까?</h1>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
        </div>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-y-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-x-12">
            <section aria-live="polite" className="min-w-0 lg:col-start-1">
              <p className="flex items-start gap-3 font-display text-xl leading-snug font-extrabold tracking-tight lg:text-[28px]">
                {ids.length > 1 && <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-light shadow-glow lg:mt-3.5" />}
                {title}
              </p>
              <p className={`mt-1.5 text-sm text-ink-muted ${ids.length > 1 ? "pl-5.5" : ""}`}>{body}</p>

              <div role="tablist" aria-label="날짜" className="no-scrollbar -mx-gutter mt-6 flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:flex-wrap lg:px-0">
                {dates.map((date, index) => {
                  const n = index + 1;
                  const on = n === day;
                  return (
                    <button key={n} type="button" role="tab" aria-selected={on} onClick={() => setPickedDay(n)}
                      className={`flex min-h-16 min-w-27 flex-1 shrink-0 flex-col items-start justify-center px-3 py-2 text-left lg:max-w-48 ${on ? "bg-room text-on-room" : "bg-bg text-ink ring-1 ring-line ring-inset"}`}>
                      <span className="font-display text-base font-bold">{n}일차</span>
                      <span className={`text-xs ${on ? "text-on-room-muted" : "text-ink-muted"}`}>{shortDate(date)} · {trip.days[index].length}곳</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label={`${day}일차 지도`} className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
              <div className="relative h-56 overflow-hidden bg-line lg:h-120">
                <ScheduleMap stops={stops} nearby={[]} label={`${day}일차 지도. 순서 번호와 선으로 방문 순서를 보여줘요`} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                {variant === "a"
                  ? "시안이라 지금은 점선이에요. 실제로는 버스·지하철·걷는 길을 따라 선이 그려져요."
                  : "점선은 방문 순서를 이은 선이에요. 실제 길은 카카오맵에서 보여줘요."}
              </p>
            </section>

            <section aria-labelledby="legs-title" className="min-w-0 lg:col-start-1">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="legs-title" className="font-display text-base font-bold">구간 {legs.length}개</h2>
                {variant === "b" && legs.length > 0 && (
                  <div role="radiogroup" aria-label="카카오맵에서 열 이동 방법" className="flex">
                    {(Object.keys(MODE_LABEL) as Mode[]).map((value) => (
                      <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
                        className={`min-h-tap px-4 text-sm font-semibold ${mode === value ? "bg-room text-on-room" : "ring-1 ring-line ring-inset"}`}>
                        {MODE_LABEL[value]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {legs.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">
                  이동할 구간이 없어요 · <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 장소 넣기</Link>
                </p>
              ) : (
                <ol className="mt-2">
                  {legs.map((leg) => {
                    const legMode = variant === "a" ? leg.fake?.mode ?? "traffic" : mode;
                    return (
                      <li key={leg.no} className="flex min-h-16 items-center gap-3 py-2">
                        <span aria-hidden="true" className="flex shrink-0 items-center gap-1 font-display text-sm font-bold">
                          <span className="grid size-7 place-items-center bg-room text-on-room">{leg.no}</span>
                          <span className="text-ink-subtle">→</span>
                          <span className="grid size-7 place-items-center ring-1 ring-line ring-inset">{leg.no + 1}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{nameOf(leg.toId)}</span>
                          <span className="block truncate text-xs text-ink-muted">
                            {leg.km === null
                              ? "지도 위치를 확인할 수 없어요"
                              : variant === "a" && leg.fake
                                ? `${MODE_LABEL[leg.fake.mode]} 약 ${leg.fake.minutes}분${leg.fake.mode === "traffic" ? ` · 환승 ${leg.fake.transfers}번` : ""} · ${nameOf(leg.fromId)}에서`
                                : `${nameOf(leg.fromId)}에서 직선 ${distanceLabel(leg.km)}`}
                          </span>
                        </span>
                        {leg.from && leg.to && leg.km !== null && (
                          <a href={kakaoRoute(legMode, leg.from, leg.to)} target="_blank" rel="noreferrer"
                            aria-label={`${nameOf(leg.fromId)}에서 ${nameOf(leg.toId)}까지 ${MODE_LABEL[legMode]} 길찾기, 카카오맵 새 창`}
                            className="flex min-h-tap shrink-0 items-center px-3 text-sm font-semibold ring-1 ring-ink ring-inset">
                            카카오맵 ↗
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
                {variant === "a"
                  ? "출처 카카오맵 경로 API · 조회 시각 기준. 실제 시간은 교통 상황에 따라 달라요."
                  : "직선거리라 실제 이동 거리는 달라요. 걸리는 시간과 환승은 카카오맵에서 확인해요."}
              </p>
            </section>
          </div>
        )}
        <footer className="pt-10 pb-6 text-xs text-ink-subtle">장소 정보 한국관광공사 TourAPI · 길찾기 카카오맵</footer>
      </main>
    </div>
  );
}
