// 내 여행 정보 저장소. 브라우저(localStorage)에 저장하고, 바뀌면 모든 화면과 다른 탭에 바로 알린다.
// 화면은 useTrip()으로 읽고 tripActions로만 바꾼다.
import { useSyncExternalStore } from "react";
import { todayLocal } from "./dates";
import * as rules from "./rules";
import type { TasteId, Trip } from "./types";

const STORAGE_KEY = "pinday:trip";

let stored: Trip | null | undefined; // undefined = 아직 안 읽음
let undoSnapshot: Trip | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // 사생활 보호 모드 등
  }
}

function isTrip(value: unknown): value is Trip {
  const t = value as Trip;
  return (
    !!t && t.version === 1 && Array.isArray(t.regions) && Array.isArray(t.candidates) &&
    Array.isArray(t.days) && typeof t.startDate === "string" && typeof t.endDate === "string"
  );
}

function read(): Trip | null {
  if (stored !== undefined) return stored;
  try {
    const parsed = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? "null");
    stored = isTrip(parsed) ? parsed : null;
  } catch {
    stored = null; // 깨진 값은 없는 것으로 본다
  }
  return stored;
}

function write(trip: Trip | null) {
  stored = trip;
  try {
    if (trip) storage()?.setItem(STORAGE_KEY, JSON.stringify(trip));
    else storage()?.removeItem(STORAGE_KEY);
  } catch {
    // 저장 공간이 없어도 이번 방문 동안은 메모리에서 동작한다
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바꾼 경우
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    stored = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** 저장된 여행이 없으면 자동 여행(부산 전체 + 내일부터 2박 3일)을 바탕으로 바꾸고 저장한다 */
function update(change: (trip: Trip) => Trip) {
  const current = read() ?? rules.createAutoTrip(todayLocal());
  const next = change(current);
  if (next === current) return; // 바뀐 게 없으면 저장하지 않는다(자동 여행도 저장 전 그대로)
  undoSnapshot = null;
  write(next);
}

let autoCache: { today: string; trip: Trip } | null = null;
function autoTrip(): Trip {
  const today = todayLocal();
  if (autoCache?.today !== today) autoCache = { today, trip: rules.createAutoTrip(today) };
  return autoCache.trip;
}

/**
 * 지금 여행 정보. saved가 false면 아직 저장 전인 자동 여행이다(화면에 "자동으로 정했어요" 표시).
 * 자동 여행은 표시만 하고, 처음 장소를 담는 등 무언가 바꾸는 순간 저장된다.
 */
export function useTrip(): { trip: Trip; saved: boolean } {
  const saved = useSyncExternalStore(subscribe, read, () => null);
  return { trip: saved ?? autoTrip(), saved: saved !== null };
}

export const tripActions = {
  setRegions: (regions: string[]) => update((t) => rules.setRegions(t, regions)),
  setTaste: (taste: TasteId | null) => update((t) => rules.setTaste(t, taste)),
  /** 잘못된 기간이면 error, 줄어서 옮겨진 장소가 있으면 notice 문구를 돌려준다 */
  setPeriod(startDate: string, endDate: string) {
    const result = rules.setPeriod(read() ?? autoTrip(), startDate, endDate, todayLocal());
    if (!result.error) update(() => result.trip);
    return { error: result.error, notice: rules.movedNotice(result.moved) };
  },
  addCandidate: (placeId: string) => update((t) => rules.addCandidate(t, placeId)),
  removeCandidate: (placeId: string) => update((t) => rules.removeCandidate(t, placeId)),
  addToDay: (placeId: string, day: number) => update((t) => rules.addToDay(t, placeId, day)),
  moveToDay: (placeId: string, day: number) => update((t) => rules.moveToDay(t, placeId, day)),
  removeFromSchedule: (placeId: string) => update((t) => rules.removeFromSchedule(t, placeId)),
  reorderInDay: (day: number, placeId: string, toIndex: number) =>
    update((t) => rules.reorderInDay(t, day, placeId, toIndex)),
  replaceInDay: (day: number, fromId: string, toId: string) =>
    update((t) => rules.replaceInDay(t, day, fromId, toId)),

  /** 여행 초기화: 지역·기간, 후보함, 일정, 취향 모두 지운다. 직후 undoReset()으로 되돌릴 수 있다 */
  reset() {
    const current = read();
    if (!current) return;
    write(null);
    undoSnapshot = current;
  },
  /** 마지막 초기화를 되돌린다. 그 사이 다른 변경이 있었으면 아무것도 하지 않는다 */
  undoReset() {
    if (!undoSnapshot) return;
    const snapshot = undoSnapshot;
    undoSnapshot = null;
    write(snapshot);
  },
};
