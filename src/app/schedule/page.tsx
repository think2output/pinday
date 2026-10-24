import { Suspense } from "react";
import type { Metadata } from "next";
import { listPlaces } from "@/lib/server/places";
import { ScheduleView } from "./_components/ScheduleView";
import type { SchedulePlace } from "./_components/scheduleModel";

export const metadata: Metadata = { title: "언제 갈까? · PinDay" };

export default function SchedulePage() {
  const { items } = listPlaces(new URLSearchParams({ limit: "500" }));
  const places: Record<string, SchedulePlace> = Object.fromEntries(items.map((place) => [place.id, {
    id: place.id, name: place.name, region: place.region, category: place.category, lat: place.lat, lng: place.lng,
  }]));
  return (
    <Suspense fallback={<div className="min-h-180 bg-bg" />}>
      <ScheduleView places={places} />
    </Suspense>
  );
}
