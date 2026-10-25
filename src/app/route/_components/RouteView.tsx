"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTrip } from "@/lib/trip/store";
import { dayCount } from "@/lib/trip/dates";
import type { RouteStep } from "../../../lib/server/route-model";
import { regionName } from "../../_home/regions";
import { ConditionsEditor } from "../../explore/_components/ConditionsEditor";
import { mapStops, shortDate, tripDates, type SchedulePlace } from "../../schedule/_components/scheduleModel";
import { RouteMap, type MapLeg } from "./RouteMap";
import { daySummary, kakaoRouteUrl, minutesLabel } from "./routeModel";
import { useRouteLegs } from "./useRouteLegs";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

/** 타는 것 한 덩어리: [버스 61 외 2] [지하철 1호선] [걷기 3분] */
function Ride({ step }: { step: RouteStep }) {
  if (step.type === "WALKING") return <span className="px-2 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line ring-inset">걷기 {step.minutes}분</span>;
  const [first = "", ...rest] = step.names;
  return (
    <span className="bg-room px-2 py-1 text-sm font-bold text-on-room">
      {step.type === "SUBWAY" ? first || "지하철" : `버스 ${first}`}
      {rest.length > 0 && <span className="ml-1 text-xs font-semibold text-on-room-muted" title={`같은 길로 가는 버스: ${rest.join(", ")}`}>외 {rest.length}</span>}
    </span>
  );
}

export function RouteView({ places }: { places: Record<string, SchedulePlace> }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const requestedDay = Number(useSearchParams().get("day"));
  const [pickedDay, setPickedDay] = useState(Number.isInteger(requestedDay) && requestedDay > 0 ? requestedDay : 1);
  const [focus, setFocus] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const tabs = useRef(new Map<number, HTMLButtonElement>());

  const total = trip.days.length;
  const dates = tripDates(trip.startDate, total);
  const day = Math.min(pickedDay, total);
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const stops = useMemo(() => mapStops(ids, places), [ids, places]);
  const pairs = useMemo(() => ids.slice(1).map((toId, index) => [ids[index], toId] as [string, string]), [ids]);
  const { stateOf, retry } = useRouteLegs(mounted ? pairs : []);
  const states = pairs.map(([from, to]) => stateOf(from, to));
  const summary = daySummary(states);
  const mapLegs: (MapLeg | null)[] = pairs.map(([from, to], index) => {
    const state = states[index];
    return state.kind === "ready" && places[from] && places[to] ? { lines: state.leg.lines, from: places[from], to: places[to] } : null;
  });

  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") + (trip.regions.length > 2 ? ` 외 ${trip.regions.length - 2}곳` : "") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);

  const pickDay = (n: number) => { setPickedDay(n); setFocus(null); setNotice(null); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 1, End: total }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = Math.min(total, Math.max(1, next));
    pickDay(target);
    tabs.current.get(target)?.focus();
  };

  /** 구간 한 칸: 왼쪽 큰 시간, 오른쪽 타는 것과 타고 내리는 곳, 아래 카카오맵 */
  const legRow = (index: number) => {
    const [fromId, toId] = pairs[index];
    const from = places[fromId], to = places[toId];
    const state = states[index];
    const on = focus === index;
    const leg = state.kind === "ready" ? state.leg : null;
    const rides = leg?.steps.filter((step) => step.type !== "WALKING") ?? [];
    const board = rides[0]?.board, alight = rides.at(-1)?.alight;
    const stopCount = rides.reduce((sum, step) => sum + step.stopCount, 0);
    const time = leg ? minutesLabel(leg.minutes) : state.kind === "loading" ? "…" : "?";
    return (
      <li className="flex gap-3">
        <span aria-hidden="true" className="flex w-8 shrink-0 justify-center"><span className={`w-0.5 ${on ? "bg-light" : "bg-line"}`} /></span>
        <div className={`my-1.5 min-w-0 flex-1 ${on ? "ring-2 ring-room" : "ring-1 ring-line"} ring-inset`}>
          <button type="button" aria-pressed={on} disabled={!leg} onClick={() => setFocus(on ? null : index)}
            aria-label={`${nameOf(fromId)}에서 ${nameOf(toId)}까지${leg ? ` ${minutesLabel(leg.minutes)}` : ""}. 누르면 지도에서 이 구간을 노랗게 보여줘요`}
            className="flex w-full items-start gap-3 px-3 pt-3 text-left">
            <span className={`min-w-14 shrink-0 font-display text-xl leading-7 font-extrabold tracking-tight whitespace-nowrap ${leg ? "" : "text-ink-subtle"}`}>{time}</span>
            <span className="min-w-0 flex-1">
              {state.kind === "loading" ? (
                <span role="status" className="block py-1 text-sm text-ink-muted">경로를 찾고 있어요</span>
              ) : state.kind === "error" ? (
                <span className="block py-1 text-sm text-ink-muted">{state.message}</span>
              ) : state.leg.kind === "walk" ? (
                <>
                  <span className="flex"><span className="px-2 py-1 text-sm font-bold ring-1 ring-ink ring-inset">걸어서</span></span>
                  <span className="mt-1.5 block text-xs text-ink-muted">{state.leg.meters.toLocaleString()}m · 대중교통 경로가 없어 걷는 길로 찾았어요</span>
                </>
              ) : (
                <>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {state.leg.steps.map((step, stepIndex) => (
                      <Fragment key={stepIndex}>
                        {stepIndex > 0 && <span aria-hidden="true" className="text-xs text-ink-subtle">›</span>}
                        <Ride step={step} />
                      </Fragment>
                    ))}
                    {state.leg.transfers > 0 && <span className="text-xs text-ink-muted">환승 {state.leg.transfers}번</span>}
                  </span>
                  {board && alight && (
                    <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
                      <strong className="font-semibold text-ink">{board}</strong>에서 타고 {stopCount}정류장 → <strong className="font-semibold text-ink">{alight}</strong>에서 내려요
                    </span>
                  )}
                </>
              )}
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-x-4 pr-3 pl-20">
            {from && to && (
              <a href={kakaoRouteUrl(leg?.kind === "walk" ? "walk" : "traffic", from, to)} target="_blank" rel="noreferrer"
                aria-label={`${nameOf(fromId)}에서 ${nameOf(toId)}까지 카카오맵에서 길 보기, 새 창`}
                className="inline-flex min-h-tap items-center gap-1 text-sm font-semibold underline underline-offset-4">
                카카오맵에서 길 보기 <span aria-hidden="true">↗</span>
              </a>
            )}
            {state.kind === "error" && state.retry && (
              <button type="button" onClick={() => retry(fromId, toId)} className="min-h-tap text-sm font-semibold text-ink-muted">다시 시도</button>
            )}
          </div>
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
        <div className="flex items-center justify-between gap-3 pt-3 lg:pt-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-4xl">어떻게 갈까?</h1>
          <button type="button" onClick={() => setEditing(true)} className="min-h-tap shrink-0 text-sm font-semibold">조건 바꾸기</button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong title={trip.regions.map(regionName).join(" · ")}>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
          {mounted && !saved && <span className="text-xs text-ink-subtle">자동으로 정했어요</span>}
        </div>
        <p role="status" className={notice ? "mt-3 text-sm text-ink" : "sr-only"}>{notice}</p>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-y-5 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,560px)] lg:gap-x-12">
            <div className="min-w-0 lg:col-start-1">
              <div role="tablist" aria-label="날짜" className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:flex-wrap lg:px-0">
                {dates.map((date, index) => {
                  const n = index + 1;
                  const on = n === day;
                  return (
                    <button key={n} type="button" role="tab" id={`route-tab-${n}`} aria-selected={on} aria-controls="route-panel" tabIndex={on ? 0 : -1}
                      ref={(node) => { if (node) tabs.current.set(n, node); else tabs.current.delete(n); }}
                      onClick={() => pickDay(n)} onKeyDown={onTabKey}
                      aria-label={`${n}일차, ${shortDate(date)}, 장소 ${trip.days[index].length}곳`}
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
                      {ids.length === 0 ? "이 날은 아직 일정이 없어요" : "그날 장소가 두 곳 이상이면 구간이 생겨요"} · <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 넣기</Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex flex-wrap items-baseline gap-x-2 font-display tracking-tight">
                      <span className="text-base font-bold text-ink-muted">이동</span>
                      <span className="text-3xl font-extrabold lg:text-4xl">{summary.title}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{ids.length}곳 · 구간 {pairs.length}개{summary.detail ? ` · ${summary.detail}` : ""}</p>
                  </>
                )}
              </section>
            </div>

            {ids.length > 0 && (
              <section aria-label={`${day}일차 경로 지도`} className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
                <div className="relative h-60 overflow-hidden bg-line lg:h-140">
                  <RouteMap stops={stops} legs={mapLegs} focus={focus} label={`${day}일차 경로 지도. 같은 내용을 구간 목록에서도 볼 수 있어요`} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                  굵은 선은 버스·지하철, 점선은 걷는 길이나 정류장까지 이은 선이에요. 구간을 누르면 지도에서 노랗게 보여요.
                  {stops.length < ids.length && ` ${ids.flatMap((id, index) => (stops.some((stop) => stop.place.id === id) ? [] : [index + 1])).join(", ")}번 장소는 지도 위치를 확인할 수 없어 지도에서 뺐어요.`}
                </p>
              </section>
            )}

            {ids.length > 1 && (
              <section id="route-panel" role="tabpanel" aria-labelledby={`route-tab-${day}`} className="min-w-0 lg:col-start-1">
                <ol aria-label={`${day}일차 장소와 이동 구간`}>
                  {ids.map((id, index) => (
                    <Fragment key={id}>
                      {placeRow(id, index)}
                      {index < pairs.length && legRow(index)}
                    </Fragment>
                  ))}
                </ol>
                <p className="mt-4 text-xs leading-relaxed text-ink-subtle">카카오맵이 맨 앞에 추천한 경로예요. 다른 경로와 실제 시간은 배차·교통 상황에 따라 다르니 카카오맵에서 확인해주세요.</p>
              </section>
            )}
          </div>
        )}
        <footer className="pt-10 pb-6 text-xs text-ink-subtle">장소 정보 한국관광공사 TourAPI · 경로 카카오맵</footer>
      </main>
      {editing && <ConditionsEditor trip={trip} onClose={() => setEditing(false)} onNotice={setNotice} />}
    </div>
  );
}
