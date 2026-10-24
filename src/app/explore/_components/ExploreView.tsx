"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { tripActions, useTrip } from "@/lib/trip/store";
import { dayOf } from "@/lib/trip/rules";
import { dayCount } from "@/lib/trip/dates";
import { regionName } from "../../_home/regions";
import { ConditionsEditor } from "./ConditionsEditor";
import { PlacePreview } from "./PlacePreview";
import { PlacesMap } from "./PlacesMap";
import { usePlaces } from "./usePlaces";
import { canMapPlace } from "./mapCoordinates";
import { TASTE_NAMES, type Bounds, type Category } from "./types";

const subscribeMounted = () => () => {};
const QUICK_CATEGORIES = ["NA020900", "VE030100", "VE040100", "VE070100", "HS010700"];

export function ExploreView({ categories, names }: { categories: Category[]; names: Record<string, string> }) {
  const { trip, saved } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"name" | "taste">("taste");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [fitAttempt, setFitAttempt] = useState(0);
  const [sheet, setSheet] = useState<"peek" | "full" | "closed">("peek");
  const [notice, setNotice] = useState<string | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const candidateDialog = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQueryText(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const dialog = candidateDialog.current;
    if (showCandidates && !dialog?.open) dialog?.showModal();
    if (!showCandidates && dialog?.open) dialog.close();
  }, [showCandidates]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "500", sort: trip.taste ? sort : "name" });
    trip.regions.forEach((region) => params.append("region", region));
    if (category) params.set("category", category);
    if (queryText.trim()) params.set("q", queryText.trim());
    if (trip.taste) params.set("taste", trip.taste);
    return params.toString();
  }, [trip.regions, trip.taste, sort, category, queryText]);
  const { items, loading, error, retry } = usePlaces(query);
  const selected = items.find((place) => place.id === selectedId) ?? null;
  const visible = !bounds || mapFailed ? items : items.filter((place) => !canMapPlace(place) || (place.lat >= bounds.south && place.lat <= bounds.north && place.lng >= bounds.west && place.lng <= bounds.east));
  const onSelect = useCallback((id: string) => { setSelectedId(id); setSheet("peek"); }, []);
  const regionLabel = trip.regions.length ? trip.regions.slice(0, 2).map(regionName).join(" · ") + (trip.regions.length > 2 ? ` 외 ${trip.regions.length - 2}곳` : "") : "부산 전체";
  const days = dayCount(trip.startDate, trip.endDate);

  const toggleCandidate = (id: string) => {
    if (trip.candidates.includes(id)) {
      const scheduled = dayOf(trip, id);
      tripActions.removeCandidate(id);
      setNotice(scheduled ? `${names[id] ?? "장소"}을 후보함과 ${scheduled}일차 일정에서 뺐어요` : `${names[id] ?? "장소"}을 후보함에서 뺐어요`);
    } else {
      tripActions.addCandidate(id);
      setNotice(`${names[id] ?? "장소"}을 후보함에 담았어요`);
    }
  };

  const candidateList = () => trip.candidates.length ? (
    <ul className="space-y-3">
      {trip.candidates.map((id) => (
        <li key={id} className="flex items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 break-words">{names[id] ?? "목록에 없는 장소"}</span>
          <button type="button" onClick={() => toggleCandidate(id)} aria-label={`${names[id] ?? "목록에 없는 장소"} 후보함에서 빼기`} className="min-h-tap min-w-tap shrink-0 text-ink-muted">✕</button>
        </li>
      ))}
    </ul>
  ) : <p className="text-sm leading-relaxed text-ink-muted">마음에 드는 곳을 ♡로 담아보세요.</p>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-gutter lg:max-w-[calc(var(--container-page)+2*var(--spacing-gutter-wide))] lg:px-gutter-wide">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 pt-3 lg:pt-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-4xl">어디 갈까?</h1>
          <button type="button" onClick={() => setEditing(true)} className="min-h-tap shrink-0 text-sm font-semibold">조건 바꾸기</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <strong title={trip.regions.map(regionName).join(" · ")}>{regionLabel}</strong>
          <span className="text-ink-muted">{mounted ? `${trip.startDate.slice(5).replace("-", ".")} — ${trip.endDate.slice(5).replace("-", ".")} · ${days === 1 ? "당일" : `${days - 1}박 ${days}일`}` : "여행 기간 확인 중"}</span>
          {!saved && <span className="text-xs text-ink-subtle">자동으로 정했어요</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 lg:mt-5">
          <label className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-80">
            <span className="sr-only">장소 이름 검색</span>
            <input type="search" placeholder="어떤 장소를 찾으세요?" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(null); }} className="min-h-tap w-full min-w-0 border-b border-line bg-transparent text-sm outline-offset-2" />
          </label>
          <label className="flex min-h-tap items-center gap-2 text-sm">
            <span className="sr-only">장소 분류</span>
            <select aria-label="장소 분류" value={category} onChange={(event) => { setCategory(event.target.value); setSelectedId(null); }} className="min-h-tap max-w-42 bg-bg text-sm">
              <option value="">모든 분류</option>
              {categories.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
            </select>
          </label>
        </div>
        <div className="no-scrollbar my-2 flex shrink-0 gap-5 overflow-x-auto whitespace-nowrap lg:my-3">
          {[{ code: "", name: "전체" }, ...QUICK_CATEGORIES.flatMap((code) => categories.find((entry) => entry.code === code) ?? [])].map((option) => (
            <button key={option.code} type="button" aria-pressed={category === option.code} onClick={() => { setCategory(option.code); setSelectedId(null); }} className={`min-h-tap min-w-tap shrink-0 text-sm ${category === option.code ? "font-extrabold text-ink" : "text-ink-muted"}`}>{option.name}</button>
          ))}
        </div>
        <p role="status" className={notice ? "pb-2 text-xs text-ink-muted" : "sr-only"}>{notice}</p>
        <div className="relative h-[70dvh] min-h-120 shrink-0 lg:grid lg:h-[72dvh] lg:max-h-200 lg:grid-cols-[minmax(230px,0.9fr)_minmax(0,1.7fr)_minmax(190px,0.7fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:pb-4">
          <section aria-label="장소 목록" data-map-bounds={bounds ? JSON.stringify(bounds) : undefined} className={`absolute right-0 bottom-0 left-0 z-20 flex min-h-0 flex-col bg-bg px-3 shadow-paper lg:relative lg:inset-auto lg:z-auto lg:h-full lg:px-0 lg:shadow-none ${selected ? "hidden lg:flex" : "flex"} ${sheet === "closed" ? "h-14" : sheet === "full" ? "h-[92%]" : mapFailed ? "h-[65%]" : "h-[48%]"}`}>
            <button type="button" aria-expanded={sheet !== "closed"} aria-label={sheet === "full" ? "장소 목록 접기" : "장소 목록 펼치기"}
              onPointerDown={(event) => { drag.current = { y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerUp={(event) => {
                if (!drag.current) return;
                const delta = event.clientY - drag.current.y;
                if (Math.abs(delta) > 30) { drag.current.moved = true; setSheet(delta < 0 ? "full" : "closed"); }
              }}
              onClick={() => { if (drag.current?.moved) { drag.current = null; return; } setSheet((current) => current === "peek" ? "full" : current === "full" ? "closed" : "peek"); }}
              className="flex min-h-tap w-full touch-none items-center justify-between text-sm font-bold lg:hidden">
              <span>장소 {visible.length}곳</span><span aria-hidden="true">{sheet === "full" ? "↓" : "↑"}</span>
            </button>
            <div className={`min-h-0 flex-1 flex-col ${sheet === "closed" ? "hidden lg:flex" : "flex"}`}>
              <div className="flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-sm font-bold"><span className="hidden lg:inline">장소 </span><span className="hidden lg:inline">{visible.length}곳</span><span className="lg:hidden">{bounds && !mapFailed ? "지금 지도 중심으로" : "선택한 지역에서"}</span></h2>
                <select aria-label="장소 정렬" value={trip.taste ? sort : "name"} onChange={(event) => { setSort(event.target.value as "name" | "taste"); setSelectedId(null); }} className="min-h-tap bg-bg text-sm">
                  <option value="name">이름순</option><option value="taste" disabled={!trip.taste}>내 취향순</option>
                </select>
              </div>
              <p className="mb-3 text-xs text-ink-subtle">{trip.taste ? TASTE_NAMES[trip.taste] : "취향 테스트는 준비 중이에요"} · 이야기 필터 준비 중</p>
              <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                {loading ? <p role="status" className="py-6 text-sm text-ink-muted">장소를 불러오고 있어요</p> : error ? (
                  <div role="alert" className="py-6 text-sm"><p>장소를 불러오지 못했어요.</p><button type="button" onClick={retry} className="min-h-tap font-semibold">다시 시도</button></div>
                ) : visible.length ? (
                  <ul className="space-y-1">
                    {visible.map((place) => (
                      <li key={place.id} className="flex items-center gap-1 py-2">
                        <button type="button" aria-pressed={selected?.id === place.id} aria-label={`${place.name} ${canMapPlace(place) ? "지도에서 보기" : "상세 보기"}`} onClick={() => onSelect(place.id)} className="min-h-tap min-w-0 flex-1 py-1 pr-2 text-left">
                          <span className="block text-xs text-ink-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}</span>
                          <span className="mt-1 block font-display text-base font-bold">{place.name}</span>
                          {!canMapPlace(place) && <span className="mt-1 block text-xs text-ink-subtle">지도 위치 확인 필요</span>}
                          {trip.taste && place.tastes.includes(trip.taste) && <span className="mt-1 block text-xs text-ink-muted">내 취향과 잘 맞아요 · {TASTE_NAMES[trip.taste]}</span>}
                        </button>
                        <button type="button" aria-pressed={trip.candidates.includes(place.id)} aria-label={`${place.name} ${trip.candidates.includes(place.id) ? "후보함에서 빼기" : "후보함 담기"}`} onClick={() => toggleCandidate(place.id)} className="min-h-tap min-w-tap shrink-0 text-xl">{trip.candidates.includes(place.id) ? "✓" : "♡"}</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 text-sm text-ink-muted"><p>{items.length ? "이 지도 범위에 장소가 없어요. 지도를 움직여보세요." : "이 조건에 맞는 장소가 없어요."}</p><button type="button" onClick={() => { setCategory(""); setSearch(""); setBounds(null); setSelectedId(null); setFitAttempt((value) => value + 1); }} className="mt-2 min-h-tap font-semibold text-ink">검색·분류 초기화</button></div>
                )}
              </div>
            </div>
          </section>
          <section aria-label="장소 지도" className="absolute inset-0 min-h-0 overflow-hidden bg-line lg:relative lg:col-start-2">
            <PlacesMap places={items} fitKey={`${query}:${fitAttempt}`} selected={selected} candidates={trip.candidates} onSelect={onSelect} onBounds={setBounds} onUnavailable={setMapFailed} />
            {selected && <PlacePreview place={selected} added={trip.candidates.includes(selected.id)} onToggle={() => toggleCandidate(selected.id)} onClose={() => setSelectedId(null)} />}
          </section>
          <aside aria-labelledby="candidate-title" className="hidden min-h-0 flex-col lg:flex">
            <h2 id="candidate-title" className="py-3 font-display text-lg font-bold">후보함 <span className="text-ink-muted">{trip.candidates.length}곳</span></h2>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{candidateList()}</div>
            <button type="button" disabled className="mt-5 min-h-tap bg-room px-3 text-sm font-semibold text-on-room opacity-50">날짜에 배치하기 · 준비 중</button>
          </aside>
        </div>
        <div className="fixed right-0 bottom-0 left-0 z-30 flex min-h-18 items-center justify-between gap-3 bg-bg px-gutter pb-[env(safe-area-inset-bottom)] lg:hidden">
          <button type="button" onClick={() => setShowCandidates(true)} className="min-h-tap text-sm font-bold">후보 {trip.candidates.length}곳 보기</button>
          <button type="button" disabled className="min-h-tap bg-room px-3 text-sm font-semibold text-on-room opacity-50">날짜에 배치하기 · 준비 중</button>
        </div>
        <footer className="pt-6 pb-24 text-xs text-ink-subtle lg:pb-6">장소 정보 한국관광공사 TourAPI · 지도 카카오</footer>
      </main>
      {editing && <ConditionsEditor trip={trip} onClose={() => setEditing(false)} onNotice={setNotice} />}
      <dialog ref={candidateDialog} onCancel={() => setShowCandidates(false)} onClose={() => setShowCandidates(false)} aria-labelledby="mobile-candidates-title" className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto bg-bg p-5 text-ink shadow-paper backdrop:bg-room/80">
        <div className="mb-4 flex items-center justify-between"><h2 id="mobile-candidates-title" className="font-display text-xl font-bold">후보함 {trip.candidates.length}곳</h2><button type="button" autoFocus onClick={() => setShowCandidates(false)} aria-label="후보함 닫기" className="min-h-tap min-w-tap">✕</button></div>
        {candidateList()}
      </dialog>
    </div>
  );
}
