"use client";

// 시안 전용 화면(A안 다듬기). 구간 정보는 카카오맵 경로 API 실제 응답을 저장한 mockRoutes.json에서 읽는다.
import Link from "next/link";
import { Fragment, useMemo, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTrip } from "@/lib/trip/store";
import { dayCount } from "@/lib/trip/dates";
import { regionName } from "../../_home/regions";
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import { mapStops, shortDate, tripDates, type SchedulePlace } from "../../schedule/_components/scheduleModel";
import { RouteMap, type MapLeg } from "./RouteMap";
import mockRoutes from "./mockRoutes.json";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

type Step = { type: string; minutes: number; names: string[]; board: string | null; alight: string | null; stopCount: number };
type Leg = { kind: "transit" | "walk"; minutes: number; transfers?: number; fare?: number | null; meters?: number; steps: Step[]; lines: MapLeg["lines"] };
const ROUTES = mockRoutes as unknown as Record<string, Leg>;

function minutesLabel(total: number) {
  const hours = Math.floor(total / 60);
  return hours ? `${hours}시간${total % 60 ? ` ${total % 60}분` : ""}` : `${total}분`;
}

/** 카카오맵 길찾기 URL (https://apis.map.kakao.com/web/guide/#routeurl) */
function kakaoRoute(mode: "traffic" | "walk", from: SchedulePlace, to: SchedulePlace) {
  const point = (place: SchedulePlace) => `${encodeURIComponent(place.name.replaceAll(",", " "))},${place.lat},${place.lng}`;
  return `https://map.kakao.com/link/by/${mode}/${point(from)}/${point(to)}`;
}

/** 타는 것 한 덩어리: [버스 61] [지하철 1호선] [걷기 3분] */
function Ride({ step }: { step: Step }) {
  if (step.type === "WALKING") return <span className="px-2 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line ring-inset">걷기 {step.minutes}분</span>;
  const [first, ...rest] = step.names;
  return (
    <span className="bg-room px-2 py-1 text-sm font-bold text-on-room">
      {step.type === "SUBWAY" ? first : `버스 ${first}`}
      {rest.length > 0 && <span className="ml-1 text-xs font-semibold text-on-room-muted">외 {rest.length}</span>}
    </span>
  );
}

export function RouteMockView({ places }: { places: Record<string, SchedulePlace> }) {
  const { trip } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [pickedDay, setPickedDay] = useState(1);
  const [focus, setFocus] = useState<number | null>(null);

  const total = trip.days.length;
  const dates = tripDates(trip.startDate, total);
  const day = Math.min(pickedDay, total);
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const stops = useMemo(() => mapStops(ids, places), [ids, places]);
  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);

  const legs = useMemo(() => ids.slice(1).map((toId, index) => {
    const from = places[ids[index]], to = places[toId];
    const mappable = !!from && !!to && canMapPlace(from) && canMapPlace(to);
    return { from, to, fromId: ids[index], toId, route: mappable ? ROUTES[`${ids[index]}-${toId}`] ?? null : null };
  }), [ids, places]);
  const mapLegs = useMemo(() => legs.map((leg) => (leg.route ? { lines: leg.route.lines, from: leg.from, to: leg.to } : null)), [legs]);
  const known = legs.flatMap((leg) => (leg.route ? [leg.route] : []));
  const moving = known.reduce((sum, route) => sum + route.minutes, 0);
  const rides = known.filter((route) => route.kind === "transit").length;
  const walks = known.length - rides;

  const pickDay = (n: number) => { setPickedDay(n); setFocus(null); };

  /** 구간 한 칸: 왼쪽 큰 시간, 오른쪽 타는 것과 타고 내리는 곳 */
  const legRow = (leg: (typeof legs)[number], index: number) => {
    const route = leg.route;
    const on = focus === index;
    const rideSteps = route?.steps.filter((step) => step.type !== "WALKING") ?? [];
    const board = rideSteps[0]?.board, alight = rideSteps.at(-1)?.alight;
    const stopsCount = rideSteps.reduce((sum, step) => sum + step.stopCount, 0);
    return (
      <li className="flex gap-3">
        <span aria-hidden="true" className="flex w-8 shrink-0 justify-center"><span className={`w-0.5 ${on ? "bg-light" : "bg-line"}`} /></span>
        <div className={`my-1 flex min-w-0 flex-1 items-stretch gap-2 ${on ? "ring-2 ring-room" : "ring-1 ring-line"} ring-inset`}>
          <button type="button" aria-pressed={on} onClick={() => setFocus(on ? null : index)}
            aria-label={`${nameOf(leg.fromId)}에서 ${nameOf(leg.toId)}까지${route ? ` ${route.minutes}분` : ""}, 지도에서 이 구간 강조`}
            className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-3 text-left">
            <span className="w-14 shrink-0 font-display text-xl leading-7 font-extrabold tracking-tight">{route ? `${route.minutes}분` : "–"}</span>
            <span className="min-w-0 flex-1">
              {!route ? (
                <span className="block text-sm text-ink-muted">경로를 불러오지 못했어요</span>
              ) : route.kind === "walk" ? (
                <>
                  <span className="flex flex-wrap items-center gap-1.5"><span className="px-2 py-1 text-sm font-bold ring-1 ring-ink ring-inset">걸어서</span></span>
                  <span className="mt-1.5 block text-xs text-ink-muted">{route.meters}m · 대중교통 경로가 없어 걷는 길로 보여줘요</span>
                </>
              ) : (
                <>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {route.steps.map((step, stepIndex) => (
                      <Fragment key={stepIndex}>
                        {stepIndex > 0 && <span aria-hidden="true" className="text-xs text-ink-subtle">›</span>}
                        <Ride step={step} />
                      </Fragment>
                    ))}
                    {route.transfers ? <span className="text-xs text-ink-muted">환승 {route.transfers}번</span> : null}
                  </span>
                  {board && alight && (
                    <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
                      <strong className="font-semibold text-ink">{board}</strong> 타고 {stopsCount}정류장 → <strong className="font-semibold text-ink">{alight}</strong> 내림
                    </span>
                  )}
                </>
              )}
            </span>
          </button>
          {leg.from && leg.to && (
            <a href={kakaoRoute(route?.kind === "walk" ? "walk" : "traffic", leg.from, leg.to)} target="_blank" rel="noreferrer"
              aria-label={`${nameOf(leg.fromId)}에서 ${nameOf(leg.toId)}까지 카카오맵에서 열기, 새 창`}
              className="flex min-w-tap shrink-0 items-center justify-center px-2 text-xs font-semibold text-ink-muted">
              카카오맵<br />↗
            </a>
          )}
        </div>
      </li>
    );
  };

  const placeRow = (id: string, index: number) => (
    <li className="flex items-center gap-3 py-1">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-room font-display text-sm font-bold text-on-room">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate font-display text-base font-bold">{nameOf(id)}</span>
    </li>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-gutter lg:max-w-[calc(var(--container-page)+2*var(--spacing-gutter-wide))] lg:px-gutter-wide">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <p className="mt-3 bg-room px-3 py-2 text-xs text-on-room">시안 · 시간·버스는 카카오맵 경로 API 실제 응답(10.25 조회)이에요. 화면 배치를 보는 용도예요.</p>
        <h1 className="pt-3 font-display text-2xl font-extrabold tracking-tight lg:pt-7 lg:text-4xl">어떻게 갈까?</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
        </div>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-y-5 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,560px)] lg:gap-x-12">
            <div className="min-w-0 lg:col-start-1">
              <div role="tablist" aria-label="날짜" className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:px-0">
                {dates.map((date, index) => {
                  const n = index + 1;
                  const on = n === day;
                  return (
                    <button key={n} type="button" role="tab" aria-selected={on} onClick={() => pickDay(n)}
                      className={`flex min-h-14 min-w-24 flex-1 shrink-0 flex-col items-start justify-center px-3 py-2 text-left lg:max-w-40 ${on ? "bg-room text-on-room" : "bg-bg text-ink ring-1 ring-line ring-inset"}`}>
                      <span className="font-display text-base font-bold">{n}일차</span>
                      <span className={`text-xs ${on ? "text-on-room-muted" : "text-ink-muted"}`}>{shortDate(date)} · {trip.days[index].length}곳</span>
                    </button>
                  );
                })}
              </div>

              <section aria-live="polite" className="mt-6">
                {ids.length < 2 ? (
                  <>
                    <p className="font-display text-xl font-extrabold tracking-tight lg:text-[28px]">이동할 구간이 없어요</p>
                    <p className="mt-1.5 text-sm text-ink-muted">
                      그날 장소가 두 곳 이상이면 구간이 생겨요 · <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 넣기</Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-baseline gap-2 font-display tracking-tight">
                      <span className="text-base font-bold text-ink-muted">이동</span>
                      <span className="text-3xl font-extrabold lg:text-4xl">{minutesLabel(moving)}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {ids.length}곳 · 구간 {legs.length}개{rides ? ` · 대중교통 ${rides}번` : ""}{walks ? ` · 걸어서 ${walks}번` : ""}
                    </p>
                  </>
                )}
              </section>
            </div>

            {ids.length > 0 && (
              <section aria-label={`${day}일차 경로 지도`} className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
                <div className="relative h-60 overflow-hidden bg-line lg:h-140">
                  <RouteMap stops={stops} legs={mapLegs} focus={focus} label={`${day}일차 경로 지도. 같은 내용을 구간 목록에서도 볼 수 있어요`} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-subtle">굵은 선은 버스·지하철, 점선은 정류장까지 이은 선이에요. 구간을 누르면 지도에서 노랗게 보여요.</p>
              </section>
            )}

            {ids.length > 1 && (
              <section aria-label={`${day}일차 구간`} className="min-w-0 lg:col-start-1">
                <ol>
                  {ids.map((id, index) => (
                    <Fragment key={id}>
                      {placeRow(id, index)}
                      {index < legs.length && legRow(legs[index], index)}
                    </Fragment>
                  ))}
                </ol>
                <p className="mt-4 text-xs leading-relaxed text-ink-subtle">카카오맵 경로 기준 소요 시간이에요. 실제 시간은 배차·교통 상황에 따라 달라요.</p>
              </section>
            )}
          </div>
        )}
        <footer className="pt-10 pb-6 text-xs text-ink-subtle">장소 정보 한국관광공사 TourAPI · 경로 카카오맵</footer>
      </main>
    </div>
  );
}
