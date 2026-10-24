"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { tripActions, useTrip } from "@/lib/trip/store";
import { dayOf } from "@/lib/trip/rules";
import { dayCount, todayLocal } from "@/lib/trip/dates";
import { regionName } from "../../_home/regions";
import { ConditionsEditor } from "../../explore/_components/ConditionsEditor";
import { distanceLabel, issuedLabel, shortDate, tripDates } from "../../schedule/_components/scheduleModel";
import { useScheduleWeather } from "../../schedule/_components/useScheduleWeather";
import { activeSwaps, dayCard, indoorAlternatives, type Swap, type WeatherPlace } from "./weatherModel";
import { forgetSwap, rememberSwap, useSwaps } from "./swapMemo";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

/** 받침에 따라 을/를 */
function withObject(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${name}을(를)`;
  return `${name}${code % 28 ? "을" : "를"}`;
}

export function WeatherView({ places, stories }: { places: Record<string, WeatherPlace>; stories: string[] }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const requestedDay = Number(useSearchParams().get("day"));
  const [selectedDay, setSelectedDay] = useState(Number.isInteger(requestedDay) && requestedDay > 0 ? requestedDay : 1);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const tabs = useRef(new Map<number, HTMLButtonElement>());
  const dayHeading = useRef<HTMLHeadingElement>(null);
  const storySet = useMemo(() => new Set(stories), [stories]);

  const today = mounted ? todayLocal() : trip.startDate;
  const total = trip.days.length;
  const day = Math.min(selectedDay, total);
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const dates = tripDates(trip.startDate, total);
  const scheduledCount = trip.days.reduce((n, list) => n + list.length, 0);
  const weather = useScheduleWeather(trip.startDate, trip.endDate, today, mounted);
  const cards = dates.map((date) => dayCard(date, today, weather.state));
  const card = cards[day - 1];
  const swaps = activeSwaps(useSwaps(), trip.days);
  const scheduled = useMemo(() => new Set(trip.days.flat()), [trip.days]);
  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") + (trip.regions.length > 2 ? ` 외 ${trip.regions.length - 2}곳` : "") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);
  const firstRain = cards.findIndex((entry) => entry.rain);
  const outdoorCount = ids.filter((id) => places[id] && !places[id].indoor).length;

  const pickDay = (n: number) => { setSelectedDay(n); setNotice(null); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 1, End: total }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = Math.min(total, Math.max(1, next));
    pickDay(target);
    tabs.current.get(target)?.focus();
  };

  const swap = (fromId: string, toId: string) => {
    const index = ids.indexOf(fromId);
    const addedCandidate = !trip.candidates.includes(toId);
    tripActions.replaceInDay(day, fromId, toId);
    rememberSwap({ day, fromId, toId, addedCandidate });
    setNotice(`${nameOf(fromId)} 대신 ${withObject(nameOf(toId))} ${day}일차 ${index + 1}번째에 넣었어요. 날짜와 순서는 그대로예요`);
    requestAnimationFrame(() => dayHeading.current?.focus());
  };
  const undo = (entry: Swap) => {
    const elsewhere = dayOf(trip, entry.fromId);
    if (elsewhere !== null) {
      setNotice(`${nameOf(entry.fromId)}이(가) 이미 ${elsewhere}일차에 있어 되돌릴 수 없어요. 언제 갈까?에서 직접 옮겨주세요`);
      return;
    }
    tripActions.replaceInDay(entry.day, entry.toId, entry.fromId);
    if (entry.addedCandidate) tripActions.removeCandidate(entry.toId);
    forgetSwap(entry);
    setNotice(`${nameOf(entry.fromId)}(으)로 되돌렸어요`);
    requestAnimationFrame(() => dayHeading.current?.focus());
  };

  const weatherCaption = () => {
    const state = weather.state;
    if (state.kind === "loading") return <p className="text-xs text-ink-subtle">날씨를 확인하고 있어요</p>;
    if (state.kind === "none") return <p className="text-xs text-ink-subtle">지난 여행이라 예보가 없어요</p>;
    if (state.kind === "error") return (
      <p role="alert" className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
        날씨를 불러오지 못했어요. 일정은 그대로예요.
        <button type="button" onClick={weather.retry} className="min-h-tap font-semibold text-ink">날씨 다시 시도</button>
      </p>
    );
    return (
      <p className="text-xs leading-relaxed text-ink-subtle">
        기상청 단기예보 · 부산 대표 지점(격자 {state.data.location.nx},{state.data.location.ny}) 기준 · {issuedLabel(state.data.issuedAt)}. 장소마다 날씨가 다를 수 있어요.
      </p>
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-gutter lg:max-w-[calc(var(--container-page)+2*var(--spacing-gutter-wide))] lg:px-gutter-wide">
      <SiteHeader />
      <main className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-240">
        <div className="flex items-center justify-between gap-3 pt-3 lg:pt-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-4xl">날씨 대안</h1>
          <button type="button" onClick={() => setEditing(true)} className="min-h-tap shrink-0 text-sm font-semibold">조건 바꾸기</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong title={trip.regions.map(regionName).join(" · ")}>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
          {mounted && !saved && <span className="text-xs text-ink-subtle">자동으로 정했어요</span>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">내 일정의 날씨예요. 일정은 직접 ‘바꾸기’를 눌렀을 때만 바뀌어요.</p>
        <p role="status" className={notice ? "mt-3 text-sm text-ink" : "sr-only"}>{notice}</p>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : (
          <>
            <div role="tablist" aria-label="날짜별 날씨" className="no-scrollbar -mx-gutter mt-5 flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:mt-8 lg:flex-wrap lg:px-0">
              {dates.map((date, index) => {
                const n = index + 1;
                const on = n === day;
                const entry = cards[index];
                return (
                  <button key={n} type="button" role="tab" id={`weather-tab-${n}`} aria-selected={on} aria-controls="weather-panel" tabIndex={on ? 0 : -1}
                    ref={(node) => { if (node) tabs.current.set(n, node); else tabs.current.delete(n); }}
                    onClick={() => pickDay(n)} onKeyDown={onTabKey}
                    aria-label={`${n}일차, ${shortDate(date)}, ${entry.label}${entry.detail ? `, ${entry.detail}` : ""}, 장소 ${trip.days[index].length}곳`}
                    className={`flex min-h-28 min-w-28 flex-1 shrink-0 flex-col items-start justify-between px-3 py-3 text-left lg:max-w-56 ${on ? "bg-room text-on-room" : "bg-bg text-ink ring-1 ring-line ring-inset"}`}>
                    <span>
                      <span className="block font-display text-base font-bold">{n}일차</span>
                      <span className={`block text-xs ${on ? "text-on-room-muted" : "text-ink-muted"}`}>{shortDate(date)}</span>
                    </span>
                    <span className="mt-2 flex items-center gap-1.5">
                      <span aria-hidden="true" className={`text-xl leading-none ${entry.rain && on ? "text-light" : ""}`}>{entry.icon}</span>
                      <span className={`text-sm ${entry.rain ? "font-bold" : ""}`}>{entry.label}</span>
                    </span>
                    <span className={`text-xs ${on ? "text-on-room-subtle" : "text-ink-subtle"}`}>{entry.detail ?? " "}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2">{weatherCaption()}</div>

            {scheduledCount === 0 ? (
              <section aria-labelledby="empty-title" className="flex flex-col items-start py-12 lg:py-16">
                <span aria-hidden="true" className="size-3 rounded-full bg-light shadow-glow" />
                <h2 id="empty-title" className="mt-6 font-display text-2xl font-extrabold">일정을 넣으면 대안을 알려드려요</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {firstRain !== -1 && <>{firstRain + 1}일차({shortDate(dates[firstRain])})에 {cards[firstRain].label} 예보가 있어요.<br /></>}
                  날짜별로 갈 곳을 정하면, 비 오는 날 야외 장소마다<br />가까운 실내 장소를 찾아드릴게요.
                </p>
                <Link href={trip.candidates.length ? "/schedule" : "/explore"} className="mt-6 inline-flex min-h-13 items-center bg-room px-6 font-display font-bold text-on-room">
                  {trip.candidates.length ? "언제 갈까?에서 일정 만들기 →" : "어디 갈까?에서 장소 모으기 →"}
                </Link>
              </section>
            ) : (
              <section id="weather-panel" role="tabpanel" aria-labelledby={`weather-tab-${day}`} className="mt-8">
                <h2 ref={dayHeading} tabIndex={-1} className="font-display text-xl font-extrabold tracking-tight outline-offset-4 lg:text-2xl">
                  {day}일차 일정 <span className="text-base font-bold text-ink-muted">{ids.length}곳</span>
                </h2>
                <p className="mt-2 text-sm text-ink">
                  {card.rain && ids.length > 0 && outdoorCount === 0 ? `${card.label} 예보가 있지만 이 날 장소는 모두 실내예요.` : card.note}
                </p>
                {ids.length === 0 ? (
                  <p className="mt-4 border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                    이 날은 아직 일정이 없어요 · <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 넣기</Link>
                  </p>
                ) : (
                  <ol aria-label={`${day}일차 장소`} className="mt-4 flex flex-col gap-6">
                    {ids.map((id, index) => {
                      const place = places[id];
                      const swapped = swaps.find((entry) => entry.day === day && entry.toId === id);
                      const outdoor = place ? !place.indoor : false;
                      const alternatives = card.rain && outdoor && !swapped ? indoorAlternatives(place, places, scheduled, storySet) : null;
                      return (
                        <li key={id}>
                          <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-room font-display text-sm font-bold text-on-room">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <strong className="block font-display text-base font-bold break-words lg:text-lg">{nameOf(id)}</strong>
                              <span className="block text-xs text-ink-muted">
                                <span className={swapped ? "font-bold text-ink" : outdoor ? "font-semibold text-ink" : ""}>{swapped ? "실내 · 바꾼 장소" : !place ? "실내·야외 확인 불가" : outdoor ? "야외" : "실내"}</span>
                                {place && ` · ${regionName(place.region)} · ${place.category.split(" > ").at(-1)}`}
                                {swapped && ` · 원래 ${nameOf(swapped.fromId)}`}
                              </span>
                            </div>
                            {swapped && (
                              <button type="button" onClick={() => undo(swapped)} aria-label={`${nameOf(id)}을(를) ${nameOf(swapped.fromId)}(으)로 되돌리기`}
                                className="min-h-tap shrink-0 px-3 text-sm font-semibold ring-1 ring-line ring-inset">되돌리기</button>
                            )}
                          </div>
                          {card.rain && outdoor && !swapped && (
                            <div role="group" aria-label={`${nameOf(id)} 대신 갈 실내 장소`} className="mt-3 sm:pl-11 lg:max-w-160">
                              {alternatives === null ? (
                                <p className="text-xs text-ink-muted">지도 위치를 확인할 수 없는 장소라 가까운 실내 장소를 찾지 못했어요.</p>
                              ) : alternatives.length === 0 ? (
                                <p className="text-xs text-ink-muted">바꿀 수 있는 실내 장소가 없어요. 실내 장소가 모두 일정에 들어 있어요.</p>
                              ) : (
                                <>
                                  <p className="flex items-center gap-2 text-sm font-bold">
                                    <span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />대신 갈 만한 실내 장소
                                  </p>
                                  <ul className="mt-1">
                                    {alternatives.map(({ place: alt, km, story }) => (
                                      <li key={alt.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                                        <span className="min-w-0 flex-1 basis-48">
                                          <span className="block text-sm font-semibold break-words">{alt.name}</span>
                                          <span className="block text-xs text-ink-muted">직선 {distanceLabel(km)} · {alt.category.split(" > ").at(-1)}{story && " · 이야기 있음"}</span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1">
                                          {story && <Link href={`/docent/${alt.id}`} className="inline-flex min-h-tap items-center px-2 text-sm font-semibold">▶ 이야기</Link>}
                                          <button type="button" onClick={() => swap(id, alt.id)} aria-label={`${nameOf(id)} 대신 ${alt.name}(으)로 바꾸기`}
                                            className="min-h-tap px-3 text-sm font-semibold whitespace-nowrap ring-1 ring-ink ring-inset">이 장소로 바꾸기</button>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="text-xs text-ink-subtle">{nameOf(id)}에서 가까운 순이에요. 직선거리라 실제 이동 거리는 달라요.</p>
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                <p className="mt-6 text-xs text-ink-subtle">바꾼 장소는 날짜와 순서를 그대로 유지해요. ‘바꾼 장소’ 표시와 되돌리기는 이 창을 닫으면 사라지고, 바뀐 일정은 남아요.</p>
              </section>
            )}
          </>
        )}
        <footer className="pt-10 pb-6 text-xs text-ink-subtle">장소 정보 한국관광공사 TourAPI · 날씨 기상청 단기예보</footer>
      </main>
      {editing && <ConditionsEditor trip={trip} onClose={() => setEditing(false)} onNotice={setNotice} />}
    </div>
  );
}
