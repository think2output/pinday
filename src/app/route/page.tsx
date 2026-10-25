import { Suspense } from "react";
import type { Metadata } from "next";
import { listPlaces } from "@/lib/server/places";
import type { SchedulePlace } from "../schedule/_components/scheduleModel";
import { RouteView } from "./_components/RouteView";

export const metadata: Metadata = { title: "어떻게 갈까? · PinDay" };

export default function RoutePage() {
  const { items } = listPlaces(new URLSearchParams({ limit: "500" }));
  const places: Record<string, SchedulePlace> = Object.fromEntries(items.map((place) => [place.id, {
    id: place.id, name: place.name, region: place.region, category: place.category, lat: place.lat, lng: place.lng,
  }]));
  return (
    <Suspense fallback={<div className="min-h-180 bg-bg" />}>
      <RouteView places={places} />
    </Suspense>
  );
}
