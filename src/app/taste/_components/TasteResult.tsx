"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTrip } from "@/lib/trip/store";
import type { TasteId } from "../../../lib/trip/types";
import { regionName } from "../../_home/regions";
import { useSpeech } from "../../docent/_components/useSpeech";
import { RESULTS, resolveCourse, type TastePlace } from "./tasteModel";
import { TasteArt } from "./TasteArt";
import { TasteCoursePicker } from "./TasteCoursePicker";

export type RelatedStory = { id: string; name: string; tastes: string[]; summary: string; narration: string };

function FirstStory({ story, inCourse }: { story: RelatedStory; inCourse: boolean }) {
  const parts = useMemo(() => [{ key: story.id, label: story.name, text: story.narration || story.summary }], [story]);
  const speech = useSpeech(parts);
  return <section aria-labelledby="first-story" className="mt-10 bg-room px-5 py-6 text-on-room lg:mt-14 lg:flex lg:items-center lg:gap-7 lg:px-8">
    <div className="min-w-0 flex-1"><p className="text-xs text-on-room-muted">{inCourse ? "이 코스에서 먼저 들을 이야기" : "코스 밖에서 이어 들을 이야기"}</p>
      <h2 id="first-story" className="mt-2 font-display text-xl font-bold">{story.name}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-room-muted">{story.summary}</p>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-4 lg:mt-0 lg:max-w-60 lg:shrink-0">
      {speech.support === "ready" ? <button type="button" onClick={() => speech.playing ? speech.stop() : speech.play(0)} className="min-h-tap bg-bg px-4 text-sm font-semibold text-ink">{speech.playing ? "듣기 멈춤" : "▶ 이야기 듣기"}</button> : <p role="status" className="text-xs leading-relaxed text-on-room-muted">{speech.support === "checking" ? "이 기기의 듣기 기능을 확인하고 있어요" : "이 기기에서는 한국어 듣기를 지원하지 않아요"}</p>}
      <Link href={`/docent/${story.id}`} className="inline-flex min-h-tap items-center text-sm font-semibold">글로 읽기 →</Link>
    </div>
  </section>;
}

export function TasteResult({ taste, places, stories, onRestart }: { taste: TasteId; places: Record<string, TastePlace>; stories: RelatedStory[]; onRestart: () => void }) {
  const { trip } = useTrip();
  const result = RESULTS[taste];
  const course = useMemo(() => resolveCourse(taste, places), [taste, places]);
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, []);
  const inCourseStory = course.map((place) => stories.find((story) => story.id === place.id)).find(Boolean);
  const firstStory = inCourseStory ?? stories.find((story) => story.tastes.includes(taste));
  const outside = trip.regions.length > 0 && !trip.regions.includes("부산광역시") && course.some((place) => !trip.regions.includes(place.region));
  return <div className="mx-auto min-h-dvh w-full max-w-page px-gutter pb-14 lg:box-content lg:px-gutter-wide">
    <SiteHeader />
    <main className="pt-8 break-keep lg:pt-12">
      <section className="grid items-center gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="mx-auto w-56 lg:w-full"><TasteArt kind={taste} className="w-full text-ink" /></div>
        <div><p className="text-sm text-ink-muted">다섯 장면을 지나, 당신에게 켜진 이야기</p>
          <h1 ref={heading} tabIndex={-1} className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight outline-none lg:text-5xl">{result.name}</h1>
          <p className="mt-4 text-base font-semibold lg:text-lg">{result.lead}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-muted">{result.description}</p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-subtle">{result.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</p>
        </div>
      </section>

      <section aria-labelledby="taste-course-title" className="mt-10 lg:mt-14">
        <p className="flex items-center gap-2 text-xs text-ink-muted"><span aria-hidden="true" className="size-2 rounded-full bg-light" />당신의 취향으로 엮은 부산 대표 코스</p>
        <h2 id="taste-course-title" className="mt-3 font-display text-2xl leading-snug font-extrabold tracking-tight lg:text-3xl">{result.courseTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">부산 전체에서 고른 대표 장소 {course.length}곳이에요. 여러 지역을 잇는 코스인 만큼, 장소 사이 교통편도 함께 계획해주세요.</p>
        {outside && <p className="mt-2 text-sm leading-relaxed text-ink-muted">지금 고른 지역 밖의 장소도 포함돼요. 내 지역 설정은 그대로 유지돼요.</p>}
        {course.length < 3 && <p role="status" className="mt-2 text-sm text-ink-muted">일부 장소 정보가 없어 확인 가능한 곳만 보여드려요.</p>}
        <ol className="mt-6 grid gap-7 lg:grid-cols-3 lg:gap-8" aria-label="추천 코스 순서">
          {course.map((place, index) => <li key={place.id} className="min-w-0">
            <div className="mb-3 flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center bg-room font-display text-sm font-bold text-on-room">{index + 1}</span><span className="text-xs text-ink-muted">{regionName(place.region)} · {place.category.split(" > ").at(-1)}</span><span aria-hidden="true" className="ml-auto hidden text-ink-subtle lg:inline">{index < course.length - 1 ? "→" : ""}</span></div>
            <h3 className="font-display text-xl font-bold">{place.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{place.prompt}</p>
            {place.story ? <Link href={`/docent/${place.id}`} className="mt-1 inline-flex min-h-tap items-center text-sm font-semibold underline underline-offset-4">이 장소의 이야기 →</Link> : <p className="mt-3 text-xs text-ink-subtle">도슨트 이야기 준비 중</p>}
          </li>)}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {course.length > 0 && <button type="button" onClick={() => setPicking(true)} className="flex min-h-14 w-full items-center justify-between gap-8 bg-room px-5 text-base font-semibold text-on-room sm:w-auto">이 코스를 내 일정에 담기 <span aria-hidden="true">→</span></button>}
          <Link href="/explore" className="inline-flex min-h-tap items-center text-sm font-semibold">이 취향으로 다른 장소 보기 →</Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-subtle">추천 순서를 제안하는 코스예요. 일정에 담은 뒤 ‘이동 확인’에서 실제 경로와 시간을 확인하세요.</p>
        {notice && <div role="status" className="mt-3 text-sm leading-relaxed"><p>{notice}</p><Link href="/schedule" className="inline-flex min-h-tap items-center font-semibold underline underline-offset-4">내 일정 확인 →</Link></div>}
      </section>
      {firstStory && <FirstStory key={firstStory.id} story={firstStory} inCourse={!!inCourseStory} />}
      <div className="mt-6 flex flex-wrap items-center gap-6"><button type="button" onClick={onRestart} className="min-h-tap text-sm text-ink-muted underline underline-offset-4">다른 장면으로 다시 해보기</button><p className="text-xs text-ink-subtle">취향은 저장됐어요. 추천 코스는 직접 담을 때만 일정에 들어가요.</p></div>
      <p className="mt-6 text-xs leading-relaxed text-ink-subtle">장소 정보 한국관광공사 TourAPI · 도슨트는 공개 검수된 해설만 연결해요.</p>
    </main>
    {picking && <TasteCoursePicker course={course} onClose={() => setPicking(false)} onNotice={setNotice} />}
  </div>;
}
