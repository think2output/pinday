import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { listDocents } from "@/lib/server/docent";
import { regionName } from "../_home/regions";
import { MyTripStories } from "./_components/MyTripStories";

export const metadata: Metadata = { title: "AI 도슨트 · PinDay" };

export default function DocentListPage() {
  const docents = listDocents();
  const names = Object.fromEntries(docents.map((docent) => [docent.placeId, docent.placeName]));
  return (
    <div className="mx-auto w-full max-w-page px-gutter pb-16 lg:box-content lg:px-gutter-wide">
      <SiteHeader />
      <main className="pt-8 lg:pt-14">
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight lg:text-5xl">부산을 이야기로<br className="lg:hidden" /> 만나보세요</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">근거 자료에 있는 내용만으로 AI가 만든 장소 해설이에요. 사람이 확인한 곳만 보여드리고, 계속 늘려갈게요.</p>

        <Suspense fallback={null}>
          <MyTripStories names={names} />
        </Suspense>

        <section aria-labelledby="all-stories" className="mt-12">
          <h2 id="all-stories" className="font-display text-xl font-extrabold">모든 이야기 <span className="text-base font-bold text-ink-muted">{docents.length}곳</span></h2>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {docents.map((docent) => (
              <li key={docent.placeId} className="min-w-0">
                <Link href={`/docent/${docent.placeId}`} data-docent-card={docent.placeId} className="group flex h-full min-w-0 flex-col">
                  <span data-docent-thumbnail="" className="relative flex aspect-[3/2] w-full shrink-0 items-center justify-center overflow-hidden bg-line">
                    {docent.image ? (
                      <Image src={docent.image.url} alt="" fill sizes="(min-width: 1440px) 416px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw" unoptimized className="object-contain" />
                    ) : <span className="text-xs text-ink-subtle">등록된 사진이 없어요.</span>}
                  </span>
                  <span className="mt-3 block text-xs text-ink-muted">{regionName(docent.region)} · {docent.category.split(" > ").at(-1)}</span>
                  <span className="mt-1 block min-h-7 font-display text-lg leading-7 font-bold group-hover:underline group-focus-visible:underline">{docent.placeName}</span>
                  <span data-docent-description="" className="mt-1 line-clamp-2 h-12 text-sm leading-6 text-ink-muted">{docent.draft.summary[0]?.text ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-ink-subtle">장소 사진 한국관광공사 TourAPI(공공누리 유형은 각 이야기 화면에 표시) · 이름 검색과 지역 고르기는 이야기가 더 늘어나면 열어요.</p>
        </section>
      </main>
    </div>
  );
}
