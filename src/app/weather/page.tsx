import { Suspense } from "react";
import type { Metadata } from "next";
import { listPlaces } from "@/lib/server/places";
import { listDocents } from "@/lib/server/docent";
import { WeatherView } from "./_components/WeatherView";
import type { WeatherPlace } from "./_components/weatherModel";

export const metadata: Metadata = { title: "날씨 대안 · PinDay" };

export default function WeatherPage() {
  const { items } = listPlaces(new URLSearchParams({ limit: "500" }));
  const places: Record<string, WeatherPlace> = Object.fromEntries(items.map((place) => [place.id, {
    id: place.id, name: place.name, region: place.region, category: place.category, lat: place.lat, lng: place.lng, indoor: place.indoor,
  }]));
  return (
    <Suspense fallback={<div className="min-h-180 bg-bg" />}>
      <WeatherView places={places} stories={listDocents().map((docent) => docent.placeId)} />
    </Suspense>
  );
}
