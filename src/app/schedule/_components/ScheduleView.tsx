"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { tripActions, useTrip } from "@/lib/trip/store";
import { unscheduled } from "@/lib/trip/rules";
import { dayCount, todayLocal } from "@/lib/trip/dates";
import { regionName } from "../../_home/regions";
import { ConditionsEditor } from "../../explore/_components/ConditionsEditor";
import { DayList } from "./DayList";
import { PlaceActions } from "./PlaceActions";
import { ScheduleMap } from "./ScheduleMap";
import { dayWeather, distanceLabel, issuedLabel, mapStops, nearbySuggestions, NEARBY_KM, shortDate, sortByCloseness, tripDates, unmappedNumbers, type SchedulePlace } from "./scheduleModel";
import { useScheduleWeather } from "./useScheduleWeather";

const subscribeMounted = () => () => {};
const NO_PLACES: string[] = [];

/** 받침에 따라 을/를 */
function withObject(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${name}을(를)`;
  return `${name}${code % 28 ? "을" : "를"}`;
}

export function ScheduleView({ places }: { places: Record<string, SchedulePlace> }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [menu, setMenu] = useState<{ id: string; mode: "inline" | "sheet" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const tabs = useRef(new Map<number, HTMLButtonElement>());
  const addButtons = useRef(new Map<string, HTMLButtonElement>());
  const dayHeading = useRef<HTMLHeadingElement>(null);

  const today = mounted ? todayLocal() : trip.startDate;
  const total = trip.days.length;
  const day = Math.min(selectedDay, total);
  const dayLost = selectedDay > total;
  const ids = trip.days[day - 1] ?? NO_PLACES;
  const left = sortByCloseness(unscheduled(trip), ids, places);
  const dates = tripDates(trip.startDate, total);
  const stops = useMemo(() => mapStops(ids, places), [ids, places]);
  const suggestions = useMemo(() => nearbySuggestions(ids, new Set([...trip.candidates, ...trip.days.flat()]), places), [ids, trip.candidates, trip.days, places]);
  const unmapped = unmappedNumbers(ids, places);
  const weather = useScheduleWeather(trip.startDate, trip.endDate, today, mounted && trip.candidates.length > 0);
  const nameOf = (id: string) => places[id]?.name ?? "목록에 없는 장소";
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") + (trip.regions.length > 2 ? ` 외 ${trip.regions.length - 2}곳` : "") : "부산 전체";
  const nights = dayCount(trip.startDate, trip.endDate);

  const pickDay = (n: number) => { setSelectedDay(n); setMenu(null); };
  const focusDayHeading = () => requestAnimationFrame(() => dayHeading.current?.focus());

  const closeMenu = (refocus = true) => {
    if (sheet.current?.open) sheet.current.close();
    setMenu(null);
    if (refocus) requestAnimationFrame(() => menuTrigger.current?.focus());
  };
  const openMenu = (id: string, trigger: HTMLButtonElement) => {
    if (menu?.id === id) { closeMenu(); return; }
    menuTrigger.current = trigger;
    const mode = window.matchMedia("(min-width: 1024px)").matches ? "inline" : "sheet";
    setMenu({ id, mode });
    if (mode === "sheet") requestAnimationFrame(() => sheet.current?.showModal());
  };

  const addSuggestion = (id: string) => {
    tripActions.addToDay(id, day);
    setNotice(`${withObject(nameOf(id))} 후보함에 담고 ${day}일차 ${ids.length + 1}번째로 넣었어요`);
    focusDayHeading();
  };
  const addToDay = (id: string, index: number) => {
    tripActions.addToDay(id, day);
    setNotice(`${withObject(nameOf(id))} ${day}일차 ${ids.length + 1}번째로 넣었어요`);
    const next = left[index + 1]?.id ?? left[index - 1]?.id;
    requestAnimationFrame(() => (next ? addButtons.current.get(next)?.focus() : dayHeading.current?.focus()));
  };
  const moveDay = (id: string, to: number) => {
    tripActions.moveToDay(id, to);
    setNotice(`${withObject(nameOf(id))} ${to}일차 맨 뒤로 옮겼어요`);
    closeMenu(false);
    focusDayHeading();
  };
  const removeFromSchedule = (id: string) => {
    tripActions.removeFromSchedule(id);
    setNotice(`${withObject(nameOf(id))} 일정에서 뺐어요. 후보함에는 남아 있어 아래 ‘아직 날짜 없는 곳’에서 다시 넣을 수 있어요`);
    closeMenu(false);
    focusDayHeading();
  };
  const reorder = (id: string, toIndex: number) => {
    tripActions.reorderInDay(day, id, toIndex);
    setNotice(`${withObject(nameOf(id))} ${toIndex + 1}번째로 옮겼어요`);
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 1, End: total }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = Math.min(total, Math.max(1, next));
    pickDay(target);
    tabs.current.get(target)?.focus();
  };

  const actionsFor = (id: string, index: number, variant: "inline" | "sheet") => (
    <PlaceActions day={day} dayTotal={total} index={index} count={ids.length} variant={variant}
      onMoveDay={(to) => moveDay(id, to)} onRemove={() => removeFromSchedule(id)}
      onShift={(to) => { reorder(id, to); closeMenu(); }} />
  );
  const menuIndex = menu ? ids.indexOf(menu.id) : -1;

  const weatherCaption = () => {
    const state = weather.state;
    if (state.kind === "loading") return <p className="text-xs text-ink-subtle">날씨를 확인하고 있어요</p>;
    if (state.kind === "none") return <p className="text-xs text-ink-subtle">지난 여행이라 예보가 없어요</p>;
    if (state.kind === "error") return (
      <p role="alert" className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
        날씨를 불러오지 못했어요. 일정은 그대로 바꿀 수 있어요.
        <button type="button" onClick={weather.retry} className="min-h-tap font-semibold text-ink">날씨 다시 시도</button>
      </p>
    );
    return (
      <p className="text-xs leading-relaxed text-ink-subtle">
        강수 표시는 기상청 단기예보 · 부산 대표 지점(격자 {state.data.location.nx},{state.data.location.ny}) 기준 · {issuedLabel(state.data.issuedAt)}. 장소마다 날씨가 다를 수 있고, 예보는 며칠 앞까지만 나와요.
      </p>
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-gutter lg:max-w-[calc(var(--container-page)+2*var(--spacing-gutter-wide))] lg:px-gutter-wide">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 pt-3 lg:pt-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-4xl">언제 갈까?</h1>
          <button type="button" onClick={() => setEditing(true)} className="min-h-tap shrink-0 text-sm font-semibold">조건 바꾸기</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong title={trip.regions.map(regionName).join(" · ")}>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${nights === 1 ? "당일" : `${nights - 1}박 ${nights}일`}` : "여행 기간 확인 중"}</span>
          {mounted && !saved && <span className="text-xs text-ink-subtle">자동으로 정했어요</span>}
        </div>
        <p role="status" className={notice || dayLost ? "mt-3 text-sm text-ink" : "sr-only"}>
          {dayLost ? `보던 ${selectedDay}일차가 여행 기간에서 빠져 ${day}일차를 보여드려요. ` : ""}{notice}
        </p>

        {!mounted ? (
          <p role="status" className="py-16 text-sm text-ink-muted">내 여행을 불러오고 있어요</p>
        ) : trip.candidates.length === 0 ? (
          <section aria-labelledby="empty-title" className="flex flex-col items-start py-16 lg:py-24">
            <span aria-hidden="true" className="size-3 rounded-full bg-light shadow-glow" />
            <h2 id="empty-title" className="mt-6 font-display text-2xl font-extrabold">아직 담은 장소가 없어요</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">먼저 가고 싶은 곳을 후보함에 모으면<br />여기서 날짜별로 나눌 수 있어요.</p>
            <Link href="/explore" className="mt-6 inline-flex min-h-13 items-center bg-room px-6 font-display font-bold text-on-room">어디 갈까?에서 모으기 →</Link>
            <p className="mt-4 text-sm text-ink-subtle">랜덤 뽑기는 준비 중이에요</p>
          </section>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-y-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-x-12">
            <div className="min-w-0 lg:col-start-1">
              <div role="tablist" aria-label="날짜" className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:flex-wrap lg:px-0">
                {dates.map((date, index) => {
                  const n = index + 1;
                  const on = n === day;
                  const mark = dayWeather(date, today, weather.state);
                  return (
                    <button key={n} type="button" role="tab" id={`day-tab-${n}`} aria-selected={on} aria-controls="day-panel" tabIndex={on ? 0 : -1}
                      ref={(node) => { if (node) tabs.current.set(n, node); else tabs.current.delete(n); }}
                      onClick={() => pickDay(n)} onKeyDown={onTabKey}
                      aria-label={`${n}일차, ${shortDate(date)}, ${trip.days[index].length}곳, ${mark.description}`}
                      className={`flex min-h-16 min-w-27 flex-1 shrink-0 flex-col items-start justify-center px-3 py-2 text-left lg:max-w-48 ${on ? "bg-room text-on-room" : "bg-bg text-ink ring-1 ring-line ring-inset"}`}>
                      <span className="font-display text-base font-bold">{n}일차</span>
                      <span className={`text-xs ${on ? "text-on-room-muted" : "text-ink-muted"}`}>{shortDate(date)} · {trip.days[index].length}곳</span>
                      <span className={`mt-0.5 text-xs ${mark.rain ? (on ? "font-bold text-light" : "font-bold text-ink") : on ? "text-on-room-subtle" : "text-ink-subtle"}`}>{mark.text}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">{weatherCaption()}</div>
            </div>

            <section aria-labelledby="map-title" className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
              <h2 id="map-title" className="font-display text-base font-bold">{day}일차 지도</h2>
              <div className="relative mt-2 h-52 overflow-hidden bg-line lg:h-95">
                <ScheduleMap stops={stops} nearby={suggestions} label={`${day}일차 지도. 순서 번호와 점선으로 방문 순서를 보여줘요. 같은 내용을 목록에서도 볼 수 있어요`} />
                {stops.length === 0 && (
                  <p className="pointer-events-none absolute right-3 bottom-3 left-3 z-10 bg-bg p-3 text-xs text-ink-muted shadow-paper">
                    {ids.length ? "이 날 장소는 지도 위치를 확인할 수 없어 목록에만 있어요" : "이 날 장소를 넣으면 순서대로 번호가 표시돼요"}
                  </p>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                점선은 방문 순서를 이은 선이에요. 실제 이동 경로가 아니에요.{suggestions.length > 0 && " 흰 동그라미는 근처 추천 장소예요."}
                {unmapped.length > 0 && ` ${unmapped.join(", ")}번 장소는 지도 위치를 확인할 수 없어 지도에서 뺐어요.`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
                <button type="button" disabled className="min-h-12 bg-room px-3 text-sm font-semibold text-on-room opacity-50">이동 확인 · 준비 중</button>
                <button type="button" disabled className="min-h-12 px-3 text-sm font-semibold text-ink-muted ring-1 ring-line ring-inset">날씨 확인 · 준비 중</button>
              </div>
            </section>

            <section id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${day}`} className="min-w-0 lg:col-start-1">
              <h2 ref={dayHeading} tabIndex={-1} className="font-display text-xl font-extrabold tracking-tight outline-offset-4 lg:text-2xl">
                {day}일차 · {shortDate(dates[day - 1])} <span className="text-base font-bold text-ink-muted">{ids.length}곳</span>
              </h2>
              {ids.length === 0 ? (
                <p className="mt-3 border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">이 날은 아직 비어 있어요 · 아래에서 넣어보세요</p>
              ) : (
                <div className="mt-2">
                  <DayList day={day} ids={ids} places={places} openMenuId={menu?.id ?? null} onMenu={openMenu} onReorder={reorder}
                    renderMenu={(id, index) => menu?.id === id && menu.mode === "inline" ? (
                      <div role="group" aria-label={`${nameOf(id)} 메뉴`} onKeyDown={(event) => { if (event.key === "Escape") closeMenu(); }}
                        className="flex flex-wrap gap-2 pb-3 pl-24">
                        {actionsFor(id, index, "inline")}
                      </div>
                    ) : null} />
                  {ids.length > 1 && <p id="reorder-help" className="mt-2 text-xs text-ink-subtle">⋮⋮를 끌어서 순서를 바꿀 수 있어요. 키보드는 ⋮⋮를 선택한 뒤 위·아래 화살표 키를 눌러요.</p>}
                </div>
              )}
              {suggestions.length > 0 && (
                <div aria-labelledby="nearby-title" role="group" className="mt-8">
                  <h3 id="nearby-title" className="flex items-center gap-2 font-display text-base font-bold">
                    <span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />근처에 이런 곳도 있어요
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">{day}일차 장소에서 직선거리 {NEARBY_KM}km 안, 아직 담지 않은 곳이에요. 실제 이동 거리는 다를 수 있어요.</p>
                  <ul className="mt-2">
                    {suggestions.map(({ place, anchor, km }) => (
                      <li key={place.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold break-words">{place.name}</span>
                          <span className="block text-xs text-ink-muted">{anchor.name}에서 {distanceLabel(km)} · {place.category.split(" > ").at(-1)}</span>
                        </span>
                        <button type="button" onClick={() => addSuggestion(place.id)} aria-label={`${place.name} 후보함에 담고 ${day}일차에 넣기`}
                          className="min-h-tap shrink-0 bg-room px-3 text-sm font-semibold whitespace-nowrap text-on-room">+ {day}일차에 넣기</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section aria-labelledby="left-title" className="min-w-0 pt-2 lg:col-start-1">
              <h2 id="left-title" className="font-display text-lg font-bold">아직 날짜 없는 곳 <span className="font-normal text-ink-muted">{left.length}곳</span></h2>
              {left.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">모든 후보를 날짜에 넣었어요 · <Link href="/explore" className="inline-flex min-h-tap items-center font-semibold text-ink">어디 갈까?에서 더 모으기</Link></p>
              ) : (
                <ul className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {left.map(({ id, near }, index) => (
                    <li key={id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold break-words">{nameOf(id)}</span>
                        {near ? (
                          <span className="block text-xs font-semibold text-ink">{day}일차 {near.anchor.name}에서 {distanceLabel(near.km)}</span>
                        ) : places[id] && <span className="block text-xs text-ink-muted">{regionName(places[id].region)}</span>}
                      </span>
                      <button type="button" ref={(node) => { if (node) addButtons.current.set(id, node); else addButtons.current.delete(id); }}
                        onClick={() => addToDay(id, index)} aria-label={`${nameOf(id)} ${day}일차에 넣기`}
                        className="min-h-tap shrink-0 bg-room px-3 text-sm font-semibold whitespace-nowrap text-on-room">+ {day}일차에 넣기</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <footer className="pt-10 pb-6 text-xs text-ink-subtle">장소 정보 한국관광공사 TourAPI · 지도 카카오 · 날씨 기상청 단기예보</footer>
      </main>

      {editing && <ConditionsEditor trip={trip} onClose={() => setEditing(false)} onNotice={setNotice} />}
      <dialog ref={sheet} onClose={() => setMenu(null)} aria-labelledby="sheet-title"
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto bg-bg p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] text-ink backdrop:bg-room/60">
        {menu?.mode === "sheet" && menuIndex !== -1 && (
          <div className="flex flex-col gap-2">
            <h2 id="sheet-title" className="mb-1 font-display text-lg font-bold">{nameOf(menu.id)} · {day}일차 {menuIndex + 1}번째</h2>
            {actionsFor(menu.id, menuIndex, "sheet")}
            <button type="button" autoFocus onClick={() => closeMenu()} className="min-h-12 text-sm">취소</button>
          </div>
        )}
      </dialog>
    </div>
  );
}
