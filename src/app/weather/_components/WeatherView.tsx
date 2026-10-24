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
import { activeSwaps, dayCard, indoorAlternatives, rainTimeline, tripSummary, type Alternative, type RainTimeline, type Swap, type WeatherPlace } from "./weatherModel";
import { forgetSwap, keepPlace, rememberSwap, unkeepPlace, useKept, useSwaps } from "./swapMemo";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

/** 받침에 따라 을/를 */
function withObject(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${name}을(를)`;
  return `${name}${code % 28 ? "을" : "를"}`;
}

/** 시간별 비 예보 막대. 비 오는 시각은 먹색, 비 없음은 옅은 칸, 자료 없음은 빈 테두리 */
function RainBar({ timeline }: { timeline: RainTimeline }) {
  return (
    <div>
      <div className="flex gap-px" aria-hidden="true">
        {timeline.cells.map((cell) => (
          <span key={cell.hour} className="flex min-w-0 flex-1 flex-col items-start">
            <span className={`block h-6 w-full ${cell.rain === true ? "bg-room" : cell.rain === false ? "bg-line" : "ring-1 ring-line ring-inset"}`} />
            <span className="mt-1 h-4 text-[11px] leading-4 whitespace-nowrap text-ink-subtle">{cell.hour % 6 === 0 ? `${cell.hour}시` : ""}</span>
          </span>
        ))}
      </div>
      <p className="mt-1 text-sm text-ink">{timeline.summary}</p>
    </div>
  );
}

export function WeatherView({ places, stories }: { places: Record<string, WeatherPlace>; stories: string[] }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const requestedDay = Number(useSearchParams().get("day"));
  const [pickedDay, setPickedDay] = useState<number | null>(Number.isInteger(requestedDay) && requestedDay > 0 ? requestedDay : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState<string | null>(null);
  const tabs = useRef(new Map<number, HTMLButtonElement>());
  const dayHeading = useRef<HTMLHeadingElement>(null);
  const storySet = useMemo(() => new Set(stories), [stories]);

  const today = mounted ? todayLocal() : trip.startDate;
  const total = trip.days.length;
  const dates = tripDates(trip.startDate, total);
  const weather = useScheduleWeather(trip.startDate, trip.endDate, today, mounted);
  const cards = dates.map((date) => dayCard(date, today, weather.state));
  const firstRain = cards.findIndex((entry) => entry.rain);
  const day = Math.min(pickedDay ?? (firstRain === -1 ? 1 : firstRain + 1), total);
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const card = cards[day - 1];
  const timeline = rainTimeline(dates[day - 1], weather.state);
  const scheduledCount = trip.days.reduce((n, list) => n + list.length, 0);
  const summary = tripSummary(dates, cards, trip.days, places, weather.state, shortDate);
  const swaps = activeSwaps(useSwaps(), trip.days);
  const kept = useKept();
  const scheduled = useMemo(() => new Set(trip.days.flat()), [trip.days]);
  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") + (trip.regions.length > 2 ? ` 외 ${trip.regions.length - 2}곳` : "") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);

  const isOutdoor = (id: string) => !!places[id] && !places[id].indoor;
  const swapOf = (id: string) => swaps.find((entry) => entry.day === day && entry.toId === id);
  const isKept = (id: string) => kept.some((entry) => entry.day === day && entry.placeId === id);
  const toDecide = card.rain ? ids.filter((id) => isOutdoor(id) && !swapOf(id)) : [];
  const undecided = toDecide.filter((id) => !isKept(id));

  const pickDay = (n: number) => { setPickedDay(n); setNotice(null); setMoreOpen(null); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 1, End: total }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = Math.min(total, Math.max(1, next));
    pickDay(target);
    tabs.current.get(target)?.focus();
  };
  const focusHeading = () => requestAnimationFrame(() => dayHeading.current?.focus());

  const swap = (fromId: string, toId: string) => {
    const index = ids.indexOf(fromId);
    const addedCandidate = !trip.candidates.includes(toId);
    tripActions.replaceInDay(day, fromId, toId);
    rememberSwap({ day, fromId, toId, addedCandidate });
    setMoreOpen(null);
    setNotice(`${nameOf(fromId)} 대신 ${withObject(nameOf(toId))} ${day}일차 ${index + 1}번째에 넣었어요. 날짜와 순서는 그대로예요`);
    focusHeading();
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
    focusHeading();
  };
  const keep = (id: string) => {
    keepPlace({ day, placeId: id });
    setMoreOpen(null);
    setNotice(`${withObject(nameOf(id))} 그대로 두기로 했어요`);
  };

  const weatherCaption = () => {
    const state = weather.state;
    if (state.kind === "error") return (
      <p role="alert" className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
        날씨를 불러오지 못했어요.
        <button type="button" onClick={weather.retry} className="min-h-tap font-semibold text-ink">날씨 다시 시도</button>
      </p>
    );
    if (state.kind !== "ready") return null;
    return (
      <p className="text-xs leading-relaxed text-ink-subtle">
        기상청 단기예보 · 부산 대표 지점(격자 {state.data.location.nx},{state.data.location.ny}) 기준 · {issuedLabel(state.data.issuedAt)}. 장소마다 날씨가 다를 수 있어요.
      </p>
    );
  };

  const altMeta = (alt: Alternative) => `직선 ${distanceLabel(alt.km)} · ${alt.place.category.split(" > ").at(-1)}${alt.story ? " · 이야기 있음" : ""}`;

  const decision = (id: string) => {
    const alternatives = indoorAlternatives(places[id], places, scheduled, storySet);
    if (alternatives === null) return <p className="mt-2 text-xs text-ink-muted">지도 위치를 확인할 수 없는 장소라 가까운 실내 장소를 찾지 못했어요.</p>;
    if (alternatives.length === 0) return <p className="mt-2 text-xs text-ink-muted">바꿀 수 있는 실내 장소가 없어요. 실내 장소가 모두 일정에 들어 있어요.</p>;
    const [best, ...rest] = alternatives;
    const open = moreOpen === id;
    return (
      <div role="group" aria-label={`${nameOf(id)} 대신 갈 실내 장소`} className="mt-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />대신 여기 어때요?
        </p>
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <span className="min-w-0 flex-1 basis-56">
            <span className="block font-display text-lg font-bold break-words">{best.place.name}</span>
            <span className="block text-xs text-ink-muted">{nameOf(id)}에서 {altMeta(best)}</span>
          </span>
          {best.story && <Link href={`/docent/${best.place.id}`} className="inline-flex min-h-tap items-center text-sm font-semibold">▶ 이야기</Link>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => swap(id, best.place.id)} aria-label={`${nameOf(id)} 대신 ${best.place.name}(으)로 바꾸기`}
            className="min-h-12 bg-room px-4 text-sm font-semibold text-on-room">이 장소로 바꾸기</button>
          <button type="button" onClick={() => keep(id)} aria-label={`${nameOf(id)} 그대로 가기`}
            className="min-h-12 px-4 text-sm font-semibold ring-1 ring-line ring-inset">그대로 갈게요</button>
        </div>
        {rest.length > 0 && (
          <>
            <button type="button" aria-expanded={open} onClick={() => setMoreOpen(open ? null : id)}
              className="mt-1 inline-flex min-h-tap items-center text-sm text-ink-muted">
              다른 실내 장소 {rest.length}곳 {open ? "접기 ▴" : "보기 ▾"}
            </button>
            {open && (
              <ul>
                {rest.map((alt) => (
                  <li key={alt.place.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block text-sm font-semibold break-words">{alt.place.name}</span>
                      <span className="block text-xs text-ink-muted">{altMeta(alt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {alt.story && <Link href={`/docent/${alt.place.id}`} className="inline-flex min-h-tap items-center px-2 text-sm font-semibold">▶ 이야기</Link>}
                      <button type="button" onClick={() => swap(id, alt.place.id)} aria-label={`${nameOf(id)} 대신 ${alt.place.name}(으)로 바꾸기`}
                        className="min-h-tap px-3 text-sm font-semibold ring-1 ring-line ring-inset">바꾸기</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    );
  };

  const row = (id: string, index: number) => {
    const place = places[id];
    const swapped = swapOf(id);
    const outdoor = isOutdoor(id);
    const deciding = card.rain && outdoor && !swapped && !isKept(id);
    const status = swapped ? `실내 · 바꾼 장소 · 원래 ${nameOf(swapped.fromId)}`
      : !place ? "실내·야외 확인 불가"
      : card.rain && outdoor ? (isKept(id) ? "야외 · 그대로 가기로 했어요" : "야외 · 비 예보")
      : card.rain ? "실내 · 비 와도 괜찮아요"
      : `${outdoor ? "야외" : "실내"} · ${regionName(place.region)} · ${place.category.split(" > ").at(-1)}`;
    return (
      <li key={id} className={deciding ? "py-4" : "py-2"}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center font-display text-sm font-bold ${deciding ? "bg-room text-on-room" : "text-ink-muted ring-1 ring-line ring-inset"}`}>{index + 1}</span>
          <div className="min-w-0 flex-1">
            <strong className={`block font-display break-words ${deciding ? "text-lg font-bold" : "text-base font-semibold"}`}>{nameOf(id)}</strong>
            <span className={`block text-xs ${deciding || swapped ? "font-semibold text-ink" : "text-ink-muted"}`}>{status}</span>
          </div>
          {swapped && (
            <button type="button" onClick={() => undo(swapped)} aria-label={`${nameOf(id)}을(를) ${nameOf(swapped.fromId)}(으)로 되돌리기`}
              className="min-h-tap shrink-0 px-3 text-sm font-semibold ring-1 ring-line ring-inset">되돌리기</button>
          )}
          {card.rain && isKept(id) && (
            <button type="button" onClick={() => unkeepPlace({ day, placeId: id })} className="min-h-tap shrink-0 px-2 text-sm text-ink-muted">대안 다시 보기</button>
          )}
        </div>
        {deciding && <div className="pl-11">{decision(id)}</div>}
      </li>
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
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong title={trip.regions.map(regionName).join(" · ")}>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
          {mounted && !saved && <span className="text-xs text-ink-subtle">자동으로 정했어요</span>}
        </div>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : (
          <>
            <section aria-live="polite" className="mt-6 lg:mt-8">
              <p className="flex items-start gap-3 font-display text-xl leading-snug font-extrabold tracking-tight lg:text-[28px]">
                {summary.rain && <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-light shadow-glow lg:mt-3.5" />}
                {summary.title}
              </p>
              {summary.body && <p className={`mt-1.5 text-sm text-ink-muted ${summary.rain ? "pl-5.5" : ""}`}>{summary.body}</p>}
            </section>
            <p role="status" className={notice ? "mt-4 text-sm font-semibold text-ink" : "sr-only"}>{notice}</p>

            <div role="tablist" aria-label="날짜별 날씨" className="no-scrollbar -mx-gutter mt-6 flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:flex-wrap lg:px-0">
              {dates.map((date, index) => {
                const n = index + 1;
                const on = n === day;
                const entry = cards[index];
                return (
                  <button key={n} type="button" role="tab" id={`weather-tab-${n}`} aria-selected={on} aria-controls="weather-panel" tabIndex={on ? 0 : -1}
                    ref={(node) => { if (node) tabs.current.set(n, node); else tabs.current.delete(n); }}
                    onClick={() => pickDay(n)} onKeyDown={onTabKey}
                    aria-label={`${n}일차, ${shortDate(date)}, ${entry.label}${entry.detail ? `, ${entry.detail}` : ""}, 장소 ${trip.days[index].length}곳`}
                    className={`flex min-h-16 min-w-27 flex-1 shrink-0 flex-col items-start justify-center px-3 py-2 text-left lg:max-w-48 ${on ? "bg-room text-on-room" : "bg-bg text-ink ring-1 ring-line ring-inset"}`}>
                    <span className="font-display text-base font-bold">{n}일차</span>
                    <span className={`text-xs ${on ? "text-on-room-muted" : "text-ink-muted"}`}>{shortDate(date)}</span>
                    <span className={`mt-0.5 flex items-center gap-1 text-sm ${entry.rain ? "font-bold" : ""}`}>
                      <span aria-hidden="true" className={entry.rain && on ? "text-light" : ""}>{entry.icon}</span>{entry.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2">{weatherCaption()}</div>

            {scheduledCount === 0 ? (
              <section aria-labelledby="empty-title" className="flex flex-col items-start py-10 lg:py-14">
                <h2 id="empty-title" className="font-display text-xl font-extrabold">일정을 넣으면 대안을 알려드려요</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">날짜별로 갈 곳을 정하면, 비 오는 날 야외 장소마다<br />가까운 실내 장소를 찾아드릴게요.</p>
                <Link href={trip.candidates.length ? "/schedule" : "/explore"} className="mt-5 inline-flex min-h-13 items-center bg-room px-6 font-display font-bold text-on-room">
                  {trip.candidates.length ? "언제 갈까?에서 일정 만들기 →" : "어디 갈까?에서 장소 모으기 →"}
                </Link>
              </section>
            ) : (
              <section id="weather-panel" role="tabpanel" aria-labelledby={`weather-tab-${day}`} className="mt-8">
                <h2 ref={dayHeading} tabIndex={-1} className="font-display text-xl font-extrabold tracking-tight outline-offset-4 lg:text-2xl">
                  {day}일차 · {shortDate(dates[day - 1])}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {card.icon} {card.label}{card.detail ? ` · ${card.detail}` : ""}
                </p>
                {timeline ? (
                  <div className="mt-4 lg:max-w-160"><RainBar timeline={timeline} /></div>
                ) : (
                  <p className="mt-3 text-sm text-ink">{card.note}</p>
                )}

                {ids.length === 0 ? (
                  <p className="mt-6 text-sm text-ink-muted">
                    이 날은 아직 일정이 없어요 · <Link href={`/schedule`} className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 넣기</Link>
                  </p>
                ) : (
                  <>
                    <h3 className="mt-8 flex flex-wrap items-baseline gap-x-2 font-display text-base font-bold">
                      그날 일정 {ids.length}곳
                      {toDecide.length > 0 && (
                        <span className="text-sm font-semibold text-ink-muted">
                          {undecided.length === 0 ? "· 모두 정했어요" : `· 정할 곳 ${undecided.length}곳`}
                        </span>
                      )}
                    </h3>
                    <ol aria-label={`${day}일차 장소`} className="mt-2 lg:max-w-160">{ids.map(row)}</ol>
                  </>
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
