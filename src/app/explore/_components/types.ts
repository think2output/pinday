import type { Place } from "@/lib/server/places";
export type { Place };
export type Bounds = { west: number; south: number; east: number; north: number };
export type Category = { code: string; name: string };
export const TASTE_NAMES = {
  alley: "이바구길 골목 산책자", sunset: "광안리 노을 감상가",
  history: "동래성 시간 여행자", wave: "태종대 파도 탐험가",
};
