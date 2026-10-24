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

/** 대안 하나를 고르는 목록. tone="room"은 어두운 카드 위 */
function AlternativePicker({ fromName, alternatives, chosen, onChoose, tone }: {
  fromName: string; alternatives: Alternative[]; chosen: string; onChoose: (id: string) => void; tone: "plain" | "room";
}) {
  const room = tone === "room";
  return (
    <ul role="radiogroup" aria-label={`${fromName} 대신 갈 실내 장소`} className="flex flex-col gap-1.5">
      {alternatives.map((alt) => {
        const on = alt.place.id === chosen;
        return (
          <li key={alt.place.id} className="flex items-stretch gap-1">
            <button type="button" role="radio" aria-checked={on} onClick={() => onChoose(alt.place.id)}
              className={`flex min-h-14 flex-1 items-center gap-3 px-3 py-2 text-left ${
                on ? (room ? "bg-on-room text-ink" : "bg-room text-on-room") : room ? "ring-1 ring-on-room-subtle/40 ring-inset" : "ring-1 ring-line ring-inset"}`}>
              <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center text-xs font-bold ${on ? (room ? "bg-room text-on-room" : "bg-on-room text-ink") : "ring-1 ring-current ring-inset opacity-50"}`}>{on ? "✓" : ""}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold break-words">{alt.place.name}</span>
                <span className={`block text-xs ${on ? (room ? "text-ink-muted" : "text-on-room-muted") : room ? "text-on-room-muted" : "text-ink-muted"}`}>
                  직선 {distanceLabel(alt.km)} · {alt.place.category.split(" > ").at(-1)}{alt.story ? " · 이야기 있음" : ""}
                </span>
              </span>
            </button>
            {alt.story && (
              <Link href={`/docent/${alt.place.id}`} aria-label={`${alt.place.name} 이야기 보기`}
                className={`flex min-w-tap items-center justify-center text-sm font-semibold ${room ? "text-on-room" : "text-ink"}`}>▶</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function WeatherView({ places, stories }: { places: Record<string, WeatherPlace>; stories: string[] }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const params = useSearchParams();
  const variant = params.get("v") === "b" ? "b" : "a";
  const requestedDay = Number(params.get("day"));
  const [pickedDay, setPickedDay] = useState<number | null>(Number.isInteger(requestedDay) && requestedDay > 0 ? requestedDay : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const sheetTrigger = useRef<HTMLButtonElement | null>(null);
  const tabs = useRef(new Map<number, HTMLButtonElement>());
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
  const altsOf = (id: string) => indoorAlternatives(places[id], places, scheduled, storySet);
  const choiceOf = (id: string, alternatives: Alternative[]) => alternatives.find((alt) => alt.place.id === choices[id])?.place.id ?? alternatives[0].place.id;
  const current = focusId && undecided.includes(focusId) ? focusId : undecided[0] ?? null;

  const pickDay = (n: number) => { setPickedDay(n); setNotice(null); setFocusId(null); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 1, End: total }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = Math.min(total, Math.max(1, next));
    pickDay(target);
    tabs.current.get(target)?.focus();
  };

  const openSheet = (id: string, trigger: HTMLButtonElement) => {
    sheetTrigger.current = trigger;
    setSheetId(id);
    requestAnimationFrame(() => sheet.current?.showModal());
  };
  const closeSheet = () => {
    if (sheet.current?.open) sheet.current.close();
    setSheetId(null);
    requestAnimationFrame(() => sheetTrigger.current?.focus());
  };

  const swap = (fromId: string, toId: string) => {
    const index = ids.indexOf(fromId);
    const addedCandidate = !trip.candidates.includes(toId);
    tripActions.replaceInDay(day, fromId, toId);
    rememberSwap({ day, fromId, toId, addedCandidate });
    setFocusId(null);
    setNotice(`${nameOf(fromId)} 대신 ${withObject(nameOf(toId))} ${day}일차 ${index + 1}번째에 넣었어요`);
  };
  const keep = (id: string) => {
    keepPlace({ day, placeId: id });
    setFocusId(null);
    setNotice(`${withObject(nameOf(id))} 그대로 두기로 했어요`);
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
  };
  const reopen = (id: string) => {
    unkeepPlace({ day, placeId: id });
    setFocusId(id);
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

  /** 일정 한 줄. 장소가 많아져도 한 줄씩만 차지한다 */
  const row = (id: string, index: number) => {
    const place = places[id];
    const swapped = swapOf(id);
    const outdoor = isOutdoor(id);
    const deciding = card.rain && outdoor && !swapped && !isKept(id);
    const active = variant === "b" && deciding && id === current;
    const tag = swapped ? "실내로 바꿈" : !place ? "확인 불가" : outdoor ? (card.rain ? (isKept(id) ? "야외 · 그대로" : active ? "위에서 정하는 중" : "☂ 야외") : "야외") : "실내";
    const sub = swapped ? `원래 ${nameOf(swapped.fromId)}` : place ? `${regionName(place.region)} · ${place.category.split(" > ").at(-1)}` : "";
    return (
      <li key={id} className="flex min-h-14 items-center gap-3 py-1.5">
        <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center font-display text-sm font-bold ${deciding ? "bg-room text-on-room" : "text-ink-muted ring-1 ring-line ring-inset"}`}>{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{nameOf(id)}</span>
          <span className="block truncate text-xs text-ink-muted">{sub}</span>
        </span>
        <span className={`shrink-0 text-xs ${deciding ? "font-bold text-ink" : swapped ? "font-semibold text-ink" : "text-ink-muted"}`}>{tag}</span>
        {swapped ? (
          <button type="button" onClick={() => undo(swapped)} aria-label={`${nameOf(id)}을(를) ${nameOf(swapped.fromId)}(으)로 되돌리기`}
            className="min-h-tap shrink-0 px-2 text-sm font-semibold underline underline-offset-4">되돌리기</button>
        ) : card.rain && outdoor && isKept(id) ? (
          <button type="button" onClick={() => reopen(id)} className="min-h-tap shrink-0 px-2 text-sm text-ink-muted underline underline-offset-4">다시 정하기</button>
        ) : deciding && variant === "a" ? (
          <button type="button" onClick={(event) => openSheet(id, event.currentTarget)} aria-haspopup="dialog"
            className="min-h-tap shrink-0 px-3 text-sm font-semibold ring-1 ring-ink ring-inset">바꾸기</button>
        ) : deciding && variant === "b" && !active ? (
          <button type="button" onClick={() => setFocusId(id)} className="min-h-tap shrink-0 px-2 text-sm text-ink-muted underline underline-offset-4">정하기</button>
        ) : null}
      </li>
    );
  };

  /** B안: 정할 장소를 하나씩 보여주는 어두운 카드 */
  const stepCard = () => {
    if (!card.rain || toDecide.length === 0) return null;
    if (!current) {
      return (
        <div className="mt-6 flex items-center gap-3 bg-room px-4 py-4 text-on-room lg:max-w-160">
          <span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />
          <p className="text-sm font-semibold">{day}일차 야외 장소를 모두 정했어요</p>
        </div>
      );
    }
    const alternatives = altsOf(current);
    const position = toDecide.indexOf(current) + 1;
    const decidedCount = toDecide.length - undecided.length;
    const next = undecided[(undecided.indexOf(current) + 1) % undecided.length];
    return (
      <section aria-label="비 오는 날 바꿀지 정하기" className="mt-6 bg-room px-4 py-5 text-on-room lg:max-w-160 lg:px-6">
        <div className="flex items-center justify-between gap-3 text-xs text-on-room-muted">
          <span>정할 곳 {decidedCount + 1} / {toDecide.length}</span>
          {undecided.length > 1 && <button type="button" onClick={() => setFocusId(next)} className="min-h-tap px-1 text-sm text-on-room">나중에 · 다음 장소 ›</button>}
        </div>
        <p className="mt-1 font-display text-xl font-extrabold">{nameOf(current)}</p>
        <p className="text-xs text-on-room-muted">{position}번째 장소 · 야외{timeline ? ` · ${timeline.summary.split(".")[0]}` : ""}</p>
        {alternatives === null || alternatives.length === 0 ? (
          <>
            <p className="mt-4 text-sm text-on-room-muted">{alternatives === null ? "지도 위치를 확인할 수 없는 장소라 가까운 실내 장소를 찾지 못했어요." : "바꿀 수 있는 실내 장소가 없어요."}</p>
            <button type="button" onClick={() => keep(current)} className="mt-3 min-h-12 w-full px-4 text-sm font-semibold ring-1 ring-on-room-subtle/60 ring-inset sm:w-auto">그대로 갈게요</button>
          </>
        ) : (
          <>
            <p className="mt-4 mb-2 flex items-center gap-2 text-sm font-semibold"><span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />대신 갈 실내 장소</p>
            <AlternativePicker fromName={nameOf(current)} alternatives={alternatives} chosen={choiceOf(current, alternatives)}
              onChoose={(altId) => setChoices((value) => ({ ...value, [current]: altId }))} tone="room" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => swap(current, choiceOf(current, alternatives))} className="min-h-12 bg-on-room px-4 text-sm font-bold text-ink shadow-glow-soft">이 장소로 바꾸기</button>
              <button type="button" onClick={() => keep(current)} className="min-h-12 px-4 text-sm font-semibold ring-1 ring-on-room-subtle/60 ring-inset">그대로 갈게요</button>
            </div>
          </>
        )}
      </section>
    );
  };

  const sheetAlternatives = sheetId ? altsOf(sheetId) : null;

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
                <h2 className="font-display text-xl font-extrabold tracking-tight lg:text-2xl">{day}일차 · {shortDate(dates[day - 1])}</h2>
                <p className="mt-1 text-sm text-ink-muted">{card.icon} {card.label}{card.detail ? ` · ${card.detail}` : ""}</p>
                {timeline ? <div className="mt-4 lg:max-w-160"><RainBar timeline={timeline} /></div> : <p className="mt-3 text-sm text-ink">{card.note}</p>}

                <p role="status" className={notice ? "mt-4 text-sm font-semibold text-ink" : "sr-only"}>{notice}</p>
                {variant === "b" && stepCard()}

                {ids.length === 0 ? (
                  <p className="mt-6 text-sm text-ink-muted">
                    이 날은 아직 일정이 없어요 · <Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold text-ink">언제 갈까?에서 넣기</Link>
                  </p>
                ) : (
                  <>
                    <h3 className="mt-8 flex flex-wrap items-baseline gap-x-2 font-display text-base font-bold">
                      그날 일정 {ids.length}곳
                      {toDecide.length > 0 && (
                        <span className="text-sm font-semibold text-ink-muted">{undecided.length === 0 ? "· 모두 정했어요" : `· 비 맞는 야외 ${undecided.length}곳`}</span>
                      )}
                    </h3>
                    <ol aria-label={`${day}일차 장소`} className="mt-1 lg:max-w-160">{ids.map(row)}</ol>
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
      <dialog ref={sheet} onClose={() => setSheetId(null)} aria-labelledby="swap-title"
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto bg-bg p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] text-ink backdrop:bg-room/60 lg:inset-0 lg:m-auto lg:h-fit lg:max-w-120 lg:p-6">
        {sheetId && (
          <div className="flex flex-col">
            <p className="text-xs text-ink-muted">{day}일차 {ids.indexOf(sheetId) + 1}번째 · 야외{timeline ? ` · ${timeline.summary.split(".")[0]}` : ""}</p>
            <h2 id="swap-title" className="mt-0.5 font-display text-lg font-bold">{nameOf(sheetId)} 대신 어디 갈까요?</h2>
            {sheetAlternatives === null || sheetAlternatives.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">{sheetAlternatives === null ? "지도 위치를 확인할 수 없는 장소라 가까운 실내 장소를 찾지 못했어요." : "바꿀 수 있는 실내 장소가 없어요."}</p>
            ) : (
              <>
                <div className="mt-4">
                  <AlternativePicker fromName={nameOf(sheetId)} alternatives={sheetAlternatives} chosen={choiceOf(sheetId, sheetAlternatives)}
                    onChoose={(altId) => setChoices((value) => ({ ...value, [sheetId]: altId }))} tone="plain" />
                </div>
                <button type="button" onClick={() => { swap(sheetId, choiceOf(sheetId, sheetAlternatives)); closeSheet(); }}
                  className="mt-4 min-h-12 bg-room px-4 text-sm font-bold text-on-room">이 장소로 바꾸기</button>
              </>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { keep(sheetId); closeSheet(); }} className="min-h-12 text-sm font-semibold ring-1 ring-line ring-inset">그대로 갈게요</button>
              <button type="button" autoFocus onClick={closeSheet} className="min-h-12 text-sm">닫기</button>
            </div>
            <p className="mt-3 text-xs text-ink-subtle">직선거리라 실제 이동 거리는 달라요. 날짜와 순서는 그대로예요.</p>
          </div>
        )}
      </dialog>
    </div>
  );
}
