"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTrip } from "@/lib/trip/store";
import { dayOf } from "@/lib/trip/rules";

const subscribeMounted = () => () => {};

/** 후보함·일정에 있는 장소 중 공개된 이야기. 없으면 영역을 숨긴다 */
export function MyTripStories({ names }: { names: Record<string, string> }) {
  const { trip } = useTrip();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  if (!mounted) return null;
  const mine = trip.candidates.filter((id) => names[id]);
  if (!mine.length) return null;
  return (
    <section aria-labelledby="my-stories" className="mt-10">
      <h2 id="my-stories" className="font-display text-xl font-extrabold">내 여행 장소의 이야기</h2>
      <ul className="no-scrollbar -mx-gutter mt-4 flex gap-3 overflow-x-auto px-gutter lg:mx-0 lg:flex-wrap lg:px-0">
        {mine.map((id) => {
          const day = dayOf(trip, id);
          return (
            <li key={id} className="shrink-0">
              <Link href={`/docent/${id}`} className="flex min-h-14 min-w-48 flex-col justify-center bg-room px-4 py-2 text-on-room">
                <span className="text-xs text-on-room-muted">{day ? `일정 ${day}일차` : "후보함"}</span>
                <span className="font-display font-bold">{names[id]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
