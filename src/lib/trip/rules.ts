// 내 여행 정보 규칙. 모두 순수 함수: 기존 Trip을 바꾸지 않고 새 Trip을 돌려준다.
// 저장·화면 반영은 store.ts가 맡는다.
import { addDays, dayCount, validatePeriod, type PeriodError } from "./dates";
import type { MovedOnShrink, TasteId, Trip } from "./types";

/** 메뉴로 바로 들어왔을 때: 부산 전체 + 내일부터 2박 3일 */
export function createAutoTrip(today: string): Trip {
  const startDate = addDays(today, 1);
  return {
    version: 1,
    regions: [],
    startDate,
    endDate: addDays(startDate, 2),
    periodSource: "auto",
    taste: null,
    candidates: [],
    days: [[], [], []],
  };
}

/** 그 장소가 들어 있는 일차(1부터), 없으면 null */
export function dayOf(trip: Trip, placeId: string): number | null {
  const i = trip.days.findIndex((ids) => ids.includes(placeId));
  return i === -1 ? null : i + 1;
}

/** 아직 날짜 없는 곳: 후보함에 있지만 일정에 없는 장소 (담은 순서) */
export function unscheduled(trip: Trip): string[] {
  return trip.candidates.filter((id) => dayOf(trip, id) === null);
}

/** 초기화 확인 창에 보여줄 숫자 */
export function summary(trip: Trip) {
  return {
    candidates: trip.candidates.length,
    scheduled: trip.days.reduce((n, ids) => n + ids.length, 0),
  };
}

export function setRegions(trip: Trip, regions: string[]): Trip {
  // 지역을 바꿔도 담은 장소는 그대로 둔다
  return { ...trip, regions: [...new Set(regions)] };
}

export function setTaste(trip: Trip, taste: TasteId | null): Trip {
  return { ...trip, taste };
}

/**
 * 기간 바꾸기. 일정은 일차 기준으로 유지하고, 줄어서 사라진 일차의 장소는 날짜 없는 곳으로 옮긴다.
 * 잘못된 기간이면 error를 돌려주고 trip은 그대로다.
 */
export function setPeriod(
  trip: Trip,
  startDate: string,
  endDate: string,
  today: string,
): { trip: Trip; moved: MovedOnShrink[]; error: PeriodError | null } {
  const error = validatePeriod(startDate, endDate, today);
  if (error) return { trip, moved: [], error };

  const n = dayCount(startDate, endDate);
  const moved = trip.days
    .map((placeIds, i) => ({ day: i + 1, placeIds }))
    .filter((d) => d.day > n && d.placeIds.length > 0);
  const days = Array.from({ length: n }, (_, i) => trip.days[i] ?? []);
  return { trip: { ...trip, startDate, endDate, periodSource: "user", days }, moved, error: null };
}

/** "3일차 장소 2곳이 날짜 없는 곳으로 옮겨졌어요" */
export function movedNotice(moved: MovedOnShrink[]): string | null {
  if (moved.length === 0) return null;
  return moved.map((m) => `${m.day}일차 장소 ${m.placeIds.length}곳`).join(", ") + "이 날짜 없는 곳으로 옮겨졌어요";
}

export function addCandidate(trip: Trip, placeId: string): Trip {
  if (trip.candidates.includes(placeId)) return trip;
  return { ...trip, candidates: [...trip.candidates, placeId] };
}

/** 후보함에서 빼면 일정에서도 뺀다 */
export function removeCandidate(trip: Trip, placeId: string): Trip {
  if (!trip.candidates.includes(placeId) && dayOf(trip, placeId) === null) return trip;
  return {
    ...trip,
    candidates: trip.candidates.filter((id) => id !== placeId),
    days: trip.days.map((ids) => ids.filter((id) => id !== placeId)),
  };
}

/**
 * n일차 맨 뒤에 넣기. 후보함에 없으면 후보함에도 추가한다.
 * 같은 장소는 하루에만: 이미 다른 날에 있으면 바꾸지 않는다(화면에서 미리 막고, 옮기기는 moveToDay).
 */
export function addToDay(trip: Trip, placeId: string, day: number): Trip {
  if (day < 1 || day > trip.days.length || dayOf(trip, placeId) !== null) return trip;
  const withCandidate = addCandidate(trip, placeId);
  return {
    ...withCandidate,
    days: withCandidate.days.map((ids, i) => (i === day - 1 ? [...ids, placeId] : ids)),
  };
}

/** 다른 날로 옮기기 (옮긴 날 맨 뒤로) */
export function moveToDay(trip: Trip, placeId: string, day: number): Trip {
  const from = dayOf(trip, placeId);
  if (from === null || from === day || day < 1 || day > trip.days.length) return trip;
  return addToDay(removeFromSchedule(trip, placeId), placeId, day);
}

/** 일정에서 빼기 (후보함에는 남는다) */
export function removeFromSchedule(trip: Trip, placeId: string): Trip {
  if (dayOf(trip, placeId) === null) return trip;
  return { ...trip, days: trip.days.map((ids) => ids.filter((id) => id !== placeId)) };
}

/** 그날 안에서 순서 바꾸기: 장소를 toIndex(0부터) 자리로 */
export function reorderInDay(trip: Trip, day: number, placeId: string, toIndex: number): Trip {
  const ids = trip.days[day - 1];
  if (!ids || !ids.includes(placeId)) return trip;
  const rest = ids.filter((id) => id !== placeId);
  const at = Math.max(0, Math.min(toIndex, rest.length));
  const next = [...rest.slice(0, at), placeId, ...rest.slice(at)];
  return { ...trip, days: trip.days.map((d, i) => (i === day - 1 ? next : d)) };
}

/** 그날 장소를 다른 장소로 바꾸기 (날씨 대안). 날짜와 순서는 유지 */
export function replaceInDay(trip: Trip, day: number, fromId: string, toId: string): Trip {
  const ids = trip.days[day - 1];
  if (!ids || !ids.includes(fromId) || dayOf(trip, toId) !== null) return trip;
  const withCandidate = addCandidate(trip, toId);
  return {
    ...withCandidate,
    days: withCandidate.days.map((d, i) => (i === day - 1 ? d.map((id) => (id === fromId ? toId : id)) : d)),
  };
}
