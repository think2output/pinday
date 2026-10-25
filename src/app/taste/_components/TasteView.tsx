"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { tripActions, useTrip } from "@/lib/trip/store";
import type { TasteId } from "../../../lib/trip/types";
import { TASTE_IDS, type TastePlace } from "./tasteModel";
import { TasteResult, type RelatedStory } from "./TasteResult";
import { TasteTestModal } from "./TasteTestModal";

const subscribeMounted = () => () => {};

export function TasteView({ places, stories }: { places: Record<string, TastePlace>; stories: RelatedStory[] }) {
  const { trip } = useTrip();
  const router = useRouter();
  const requested = useSearchParams().get("result");
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [finished, setFinished] = useState<TasteId | null>(null);
  const [retaking, setRetaking] = useState(false);
  const savedResult = requested && TASTE_IDS.includes(requested as TasteId) && trip.taste === requested ? requested as TasteId : null;
  const result = finished ?? savedResult;
  const complete = (taste: TasteId) => {
    tripActions.setTaste(taste);
    setFinished(taste);
    setRetaking(false);
    router.replace(`/taste?result=${taste}`);
  };
  if (!mounted) return <p className="p-gutter text-sm text-ink-muted">당신의 이야기를 준비하고 있어요</p>;
  return <>
    {result ? <TasteResult key={result} taste={result} places={places} stories={stories} onRestart={() => setRetaking(true)} /> : <div className="mx-auto min-h-dvh w-full max-w-page px-gutter lg:box-content lg:px-gutter-wide">
      <SiteHeader />
      <p className="pt-10 text-sm text-ink-muted">어떤 이야기로 부산을 만나볼까요?</p>
      <Link href="/" className="inline-flex min-h-tap items-center text-sm font-semibold">홈으로 돌아가기 →</Link>
    </div>}
    {(!result || retaking) && <TasteTestModal onClose={() => result ? setRetaking(false) : router.replace("/")} onComplete={complete} onSaved={(taste) => {
      setFinished(taste);
      setRetaking(false);
      router.replace(`/taste?result=${taste}`);
    }} />}
  </>;
}
