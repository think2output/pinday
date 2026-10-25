import { Suspense } from "react";
import type { Metadata } from "next";
import { listPlaces } from "@/lib/server/places";
import { listDocents } from "@/lib/server/docent";
import { RESULTS, type TastePlace } from "./_components/tasteModel";
import { TasteView } from "./_components/TasteView";

export const metadata: Metadata = { title: "당신에게 켜지는 부산의 이야기 · PinDay", description: "다섯 장면을 고르면, 당신의 취향과 부산 대표 이야기 코스를 만나보세요." };

export default function TastePage() {
  const stories = listDocents();
  const ids = new Set(Object.values(RESULTS).flatMap((result) => result.stops.map((stop) => stop.id)));
  const { items } = listPlaces(new URLSearchParams({ limit: "500" }));
  const places: Record<string, TastePlace> = Object.fromEntries(items.filter((place) => ids.has(place.id)).map((place) => {
    const story = stories.find((item) => item.placeId === place.id);
    return [place.id, { id: place.id, name: place.name, region: place.region, category: place.category, lat: place.lat, lng: place.lng,
      story: story ? { summary: story.draft.summary.map((item) => item.text).join(" "), narration: story.draft.narration } : null,
    }];
  }));
  const related = stories.map((story) => ({ id: story.placeId, name: story.placeName, tastes: items.find((place) => place.id === story.placeId)?.tastes ?? [], summary: story.draft.summary.map((item) => item.text).join(" "), narration: story.draft.narration }));
  return <Suspense fallback={<p className="p-gutter text-sm text-ink-muted">당신의 이야기를 준비하고 있어요</p>}><TasteView places={places} stories={related} /></Suspense>;
}
