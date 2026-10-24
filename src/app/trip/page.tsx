import { Suspense } from "react";
import type { Metadata } from "next";
import { TripView } from "./_components/TripView";

export const metadata: Metadata = { title: "내 여행 · PinDay" };

export default function TripPage() {
  return (
    <Suspense fallback={<div className="min-h-180 bg-bg" />}>
      <TripView />
    </Suspense>
  );
}
