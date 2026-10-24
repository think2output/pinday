// 날씨 대안에서 바꾼 장소 기억. 여행 저장소와 따로, 이 탭이 열려 있는 동안만(sessionStorage) 둔다.
// 일정 자체는 tripActions.replaceInDay로 저장되고, 여기에는 '바꾼 장소' 표시와 되돌리기에 필요한 원래 장소만 남긴다.
import { useSyncExternalStore } from "react";
import type { Swap } from "./weatherModel";

const KEY = "pinday:weather-swaps";
const NONE: Swap[] = [];
let cache: Swap[] | undefined;
const listeners = new Set<() => void>();

function read(): Swap[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Swap[]) {
  cache = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀도 이 화면을 보는 동안은 메모리에서 동작한다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSwaps(): Swap[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}

const sameSlot = (a: Swap, b: Swap) => a.day === b.day && a.toId === b.toId;

export function rememberSwap(swap: Swap) {
  write([...read().filter((entry) => !sameSlot(entry, swap)), swap]);
}

export function forgetSwap(swap: Swap) {
  write(read().filter((entry) => !sameSlot(entry, swap)));
}
