import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { getDocent, listDocents } from "@/lib/server/docent";
import { listPlaces } from "@/lib/server/places";
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import { distanceKm, distanceLabel } from "../../schedule/_components/scheduleModel";
import { DocentDetail, type Nearby } from "../_components/DocentDetail";

export function generateStaticParams() {
  return listDocents().map((docent) => ({ id: docent.placeId }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const docent = getDocent((await params).id);
  return { title: docent ? `${docent.placeName} 이야기 · PinDay` : "이야기를 찾을 수 없어요 · PinDay" };
}

export default async function DocentPage({ params }: Props) {
  const docent = getDocent((await params).id);
  if (!docent) notFound();
  const stories = new Set(listDocents().map((entry) => entry.placeId));
  const nearby: Nearby[] = canMapPlace(docent) ? listPlaces(new URLSearchParams({ limit: "500" })).items
    .filter((place) => place.id !== docent.placeId && canMapPlace(place))
    .map((place) => ({ place, km: distanceKm(docent, place) }))
    .filter(({ km }) => km <= 2)
    .sort((a, b) => a.km - b.km)
    .slice(0, 3)
    .map(({ place, km }) => ({ id: place.id, name: place.name, category: place.category.split(" > ").at(-1) ?? "", distance: distanceLabel(km), hasStory: stories.has(place.id) })) : [];

  return (
    <div className="mx-auto w-full max-w-page px-gutter pb-16 lg:box-content lg:px-gutter-wide">
      <SiteHeader />
      <main className="pt-4 lg:pt-8">
        <Link href="/docent" className="inline-flex min-h-tap items-center text-sm font-semibold">← 모든 이야기</Link>
        <Suspense fallback={<div className="min-h-180" />}>
          <DocentDetail docent={docent} nearby={nearby} />
        </Suspense>
      </main>
    </div>
  );
}
