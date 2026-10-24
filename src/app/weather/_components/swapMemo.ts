// 날씨 대안에서 바꾼 장소·그대로 두기로 한 장소 기억. 여행 저장소와 따로, 이 탭이 열려 있는 동안만(sessionStorage) 둔다.
// 일정 자체는 tripActions.replaceInDay로 저장되고, 여기에는 표시와 되돌리기에 필요한 것만 남긴다.
import { useSyncExternalStore } from "react";
import type { Swap } from "./weatherModel";

export type Kept = { day: number; placeId: string };

function sessionList<T>(key: string, same: (a: T, b: T) => boolean) {
  const none: T[] = [];
  let cache: T[] | undefined;
  const listeners = new Set<() => void>();

  const read = (): T[] => {
    if (cache) return cache;
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
      cache = Array.isArray(parsed) ? parsed : [];
    } catch {
      cache = [];
    }
    return cache;
  };
  const write = (next: T[]) => {
    cache = next;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // 저장이 막혀도 이 화면을 보는 동안은 메모리에서 동작한다
    }
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    use: () => useSyncExternalStore(subscribe, read, () => none),
    add: (entry: T) => write([...read().filter((other) => !same(other, entry)), entry]),
    remove: (entry: T) => write(read().filter((other) => !same(other, entry))),
  };
}

const swaps = sessionList<Swap>("pinday:weather-swaps", (a, b) => a.day === b.day && a.toId === b.toId);
const kept = sessionList<Kept>("pinday:weather-kept", (a, b) => a.day === b.day && a.placeId === b.placeId);

export const useSwaps = swaps.use;
export const rememberSwap = swaps.add;
export const forgetSwap = swaps.remove;
export const useKept = kept.use;
export const keepPlace = kept.add;
export const unkeepPlace = kept.remove;
