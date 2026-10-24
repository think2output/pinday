import { Suspense } from "react";
import type { Metadata } from "next";
import { listPlaces } from "@/lib/server/places";
import { ExploreView } from "./_components/ExploreView";

export const metadata: Metadata = { title: "어디 갈까? · PinDay" };

export default function ExplorePage() {
  const { items } = listPlaces(new URLSearchParams({ limit: "500" }));
  const categories = [...new Map(items.map((place) => [place.categoryCode, place.category.split(" > ").at(-1)!])).entries()]
    .map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const names = Object.fromEntries(items.map((place) => [place.id, place.name]));
  return (
    <Suspense fallback={<div className="min-h-180 bg-bg" />}>
      <ExploreView categories={categories} names={names} />
    </Suspense>
  );
}
