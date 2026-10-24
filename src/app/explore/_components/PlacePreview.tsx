"use client";

import Image from "next/image";
import type { Place } from "./types";
import { regionName } from "../../_home/regions";
import { canMapPlace } from "./mapCoordinates";

export function PlacePreview({ place, added, onToggle, onClose }: { place: Place; added: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <section aria-label={`${place.name} 미리보기`} className="absolute right-3 bottom-3 left-3 z-20 max-h-[80%] overflow-y-auto bg-bg p-4 text-ink shadow-paper lg:right-4 lg:bottom-4 lg:left-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}</p>
          <h2 className="mt-1 font-display text-xl font-bold">{place.name}</h2>
          <p className="mt-2 text-sm text-ink-muted">{place.address}</p>
          {!canMapPlace(place) && <p className="mt-2 text-xs text-ink-subtle">지도 위치는 확인이 필요해요. 후보함에는 담을 수 있어요.</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="미리보기 닫기" className="min-h-tap min-w-tap shrink-0">✕</button>
      </div>
      {place.image && (
        <figure className="mt-4">
          <Image src={place.image.url} alt={`${place.name} 사진`} width={240} height={180} unoptimized className="h-auto w-32 lg:w-40" />
          <figcaption className="mt-2 text-[11px] text-ink-subtle">사진 한국관광공사 TourAPI · 공공누리 {place.image.license === "Type3" ? "3" : "1"}유형</figcaption>
        </figure>
      )}
      <button type="button" aria-pressed={added} onClick={onToggle} className="mt-4 min-h-tap w-full bg-room px-4 text-sm font-bold text-on-room">
        {added ? "✓ 후보함에서 빼기" : "♡ 후보함 담기"}
      </button>
    </section>
  );
}
