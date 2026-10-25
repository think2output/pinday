export const PIN_TRIES = 3;
export type PinPlace = {
  id: string; name: string; region: string; category: string; summary: string;
  image: { url: string; license: string } | null;
};

/** 서버가 공개 승인한 장소만 전달한다. 지역 밖이나 직전 결과를 임의로 채우지 않는다. */
export function pinPool(places: PinPlace[], regions: string[], lastId: string | null): PinPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return place.id !== lastId && (!regions.length || regions.includes("부산광역시") || regions.includes(place.region));
  });
}

export function choosePin(pool: PinPlace[], random: number): PinPlace | null {
  if (!pool.length || !Number.isFinite(random) || random < 0 || random >= 1) return null;
  return pool[Math.floor(random * pool.length)];
}

/** 서로 다른 이야기 최대 3장을 미리 섞어 놓고, 사용자가 한 장을 고른다. */
export function dealPins(pool: PinPlace[], random: () => number = Math.random): PinPlace[] {
  const deck = [...pool];
  for (let i = deck.length - 1; i > 0; i--) {
    const value = random();
    const at = Math.floor(Math.max(0, Math.min(0.999999, Number.isFinite(value) ? value : 0)) * (i + 1));
    [deck[i], deck[at]] = [deck[at], deck[i]];
  }
  return deck.slice(0, 3);
}
