import Image from "next/image";
import type { StoryCard } from "@/lib/server/home";
import { regionName } from "./regions";

// 홈 이야기 카드 (기획서 6-1, 시안 C). 조명 원 안에 사진을 건다.
// 사진은 공공누리 3유형(변경금지)이 있어 자르거나 기울이지 않고 원래 비율 그대로 보여준다. 기울이는 건 장식 조각만.
export function StoryShelf({ heading, stories }: { heading: string; stories: StoryCard[] }) {
  return (
    <section aria-labelledby="story-heading" className="flex flex-col gap-2 lg:gap-6">
      <h2 id="story-heading" className="px-gutter font-display text-2xl font-extrabold tracking-[-0.045em] lg:px-0 lg:text-[34px]">
        {heading}
      </h2>
      <ul className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] lg:gap-8 lg:overflow-visible">
        {stories.map((story) => (
          <li key={story.id} className="flex w-75 shrink-0 snap-center flex-col items-center gap-2.5 text-center lg:w-auto">
            <StoryArt story={story} />
            <div className="flex max-w-85 flex-col items-center gap-1.5 px-5">
              <span className="text-xs text-ink-muted lg:text-[13px]">
                {regionName(story.region)} · {story.kind}
              </span>
              <h3 className="font-display text-xl leading-tight font-bold tracking-[-0.04em] lg:text-[22px]">{story.title}</h3>
              <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted lg:text-[15px]">{story.subtitle}</p>
              <p className="mt-1 text-[11px] text-ink-subtle">
                이야기 부산테마여행정보
                {story.photo && ` · ${story.photo.credit} (${story.photo.placeName})`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StoryArt({ story }: { story: StoryCard }) {
  return (
    <div className="relative h-62.5 w-67.5 lg:h-70 lg:w-75">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-light) 45%, transparent) 0%, color-mix(in srgb, var(--color-lit) 60%, transparent) 60%, transparent 100%)",
        }}
      />
      <div aria-hidden="true" className="absolute top-7 left-41 size-18 rotate-9 bg-lit lg:left-45 lg:size-20" />
      {story.photo ? (
        <Image
          src={story.photo.url}
          alt={`${story.photo.placeName} 사진`}
          width={240}
          height={180}
          unoptimized
          className="absolute top-12 left-10 h-auto w-36 shadow-photo lg:left-11 lg:w-40"
        />
      ) : (
        <div aria-hidden="true" className="absolute top-10 left-14 h-37.5 w-29.5 -rotate-5 bg-lit" />
      )}
      <div aria-hidden="true" className="absolute top-31.5 left-38 flex size-20 -rotate-4 items-center justify-center bg-bg shadow-paper lg:top-35.5 lg:left-42.5 lg:size-22">
        <svg viewBox="0 0 50 50" className="size-14.5 text-ink lg:size-16">
          <path d="M6 40 C14 34 12 22 22 20 S34 12 42 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="1 4.5" strokeLinecap="round" />
          <path d="M42 3C39.2 3 37 5.2 37 7.9 37 11.6 42 16 42 16s5-4.4 5-8.1C47 5.2 44.8 3 42 3z" fill="var(--color-light)" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>
    </div>
  );
}
