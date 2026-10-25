"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Docent } from "@/lib/server/docent";
import { tripActions, useTrip } from "@/lib/trip/store";
import { dayOf } from "@/lib/trip/rules";
import { regionName } from "../../_home/regions";
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import { useSpeech } from "./useSpeech";

type Sentence = { text: string; sources: number[] };
export type Nearby = { id: string; name: string; category: string; distance: string; hasStory: boolean };

const PROVIDERS: Record<string, string> = { heritage: "국가유산청", tourapi: "한국관광공사 TourAPI", "busan-theme": "부산광역시 부산테마여행" };
const SECTIONS = [
  { key: "history", label: "역사와 문화" },
  { key: "neighborhood", label: "동네의 특징" },
  { key: "beforeVisit", label: "방문 전 알아두기" },
] as const;

export function DocentDetail({ docent, nearby }: { docent: Docent; nearby: Nearby[] }) {
  const { trip } = useTrip();
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const picker = useRef<HTMLDialogElement>(null);
  const { draft } = docent;
  const added = trip.candidates.includes(docent.placeId);
  const scheduledDay = dayOf(trip, docent.placeId);

  const parts = useMemo(() => {
    const join = (items: Sentence[]) => items.map((item) => item.text).join(" ");
    return [
      { key: "summary", label: "한 줄 요약", text: join(draft.summary) },
      ...SECTIONS.map((section) => ({ key: section.key, label: section.label, text: join(draft[section.key]) })),
      { key: "points", label: "현장 관람 포인트", text: draft.points.map((point) => `${point.title}. ${join(point.sentences)}`).join(" ") },
    ].filter((part) => part.text);
  }, [draft]);
  const speech = useSpeech(parts);
  const listening = speech.current !== null ? parts[speech.current]?.key : null;

  useEffect(() => {
    const dialog = picker.current;
    if (picking && !dialog?.open) dialog?.showModal();
    if (!picking && dialog?.open) dialog.close();
  }, [picking]);

  const sourceBox = (scope: string, items: Sentence[]) => {
    const n = openSource?.startsWith(`${scope}:`) ? Number(openSource.split(":")[1]) : null;
    const source = n ? docent.sources.find((entry) => entry.n === n) : null;
    if (!source || !items.some((item) => item.sources.includes(source.n))) return null;
    return (
      <div id={`source-${scope}`} className="mt-3 bg-bg p-4 text-sm leading-relaxed shadow-paper">
        <strong className="block">[{source.n}] {PROVIDERS[source.provider] ?? source.provider} · {source.title}</strong>
        <p className="mt-2 whitespace-pre-line text-ink-muted">{source.text}</p>
      </div>
    );
  };
  const paragraph = (scope: string, items: Sentence[]) => (
    <>
      <p className="text-[15px] leading-8">
        {items.map((item, index) => (
          <Fragment key={index}>
            {item.text}
            {item.sources.map((n) => {
              const id = `${scope}:${n}`;
              const open = openSource === id;
              return (
                <button key={n} type="button" aria-expanded={open} aria-controls={`source-${scope}`} aria-label={`근거 ${n} ${open ? "닫기" : "보기"}`}
                  onClick={() => setOpenSource(open ? null : id)}
                  className={`mx-1 inline-flex min-h-tap min-w-tap items-center justify-center align-middle text-xs font-bold ${open ? "text-ink" : "text-ink-muted"}`}>
                  <span className={`grid size-6 place-items-center ${open ? "bg-room text-on-room" : "ring-1 ring-ink-muted ring-inset"}`}>{n}</span>
                </button>
              );
            })}{" "}
          </Fragment>
        ))}
      </p>
      {sourceBox(scope, items)}
    </>
  );
  const nowLabel = (key: string) => listening === key && (
    <span className="mb-1 flex items-center gap-2 text-xs font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-light shadow-glow" />지금 듣는 중</span>
  );

  const actions = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-room px-2 py-2 text-on-room">
        {speech.support === "ready" ? (
          <>
            <button type="button" onClick={() => (speech.playing ? speech.stop() : speech.play(speech.current ?? 0))} aria-label={speech.playing ? "듣기 멈춤" : "해설 듣기"}
              className="grid min-h-tap min-w-tap place-items-center bg-bg text-sm font-bold text-ink">{speech.playing ? "❚❚" : "▶"}</button>
            <span className="min-w-0 flex-1 text-sm">
              <strong className="block truncate">{speech.playing && speech.current !== null ? `듣는 중 · ${parts[speech.current].label}` : "해설 듣기"}</strong>
              <span className="block text-xs text-on-room-muted">기기 내장 음성 · 기기마다 목소리가 달라요</span>
            </span>
            <button type="button" onClick={() => speech.play((speech.current ?? -1) + 1)} disabled={speech.current === null || speech.current >= parts.length - 1} aria-label="다음 부분 듣기"
              className="grid min-h-tap min-w-tap place-items-center text-sm disabled:text-on-room-subtle">⏭</button>
          </>
        ) : (
          <p className="min-h-tap px-2 py-3 text-sm text-on-room-muted">{speech.support === "checking" ? "듣기 기능을 확인하고 있어요" : "이 기기에서는 듣기를 지원하지 않아요"}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={added} onClick={() => {
          if (added) { tripActions.removeCandidate(docent.placeId); setNotice(scheduledDay ? `후보함과 ${scheduledDay}일차 일정에서 뺐어요` : "후보함에서 뺐어요"); }
          else { tripActions.addCandidate(docent.placeId); setNotice("후보함에 담았어요"); }
        }} className="min-h-12 px-3 text-sm font-bold ring-1 ring-ink ring-inset">{added ? "✓ 후보함에서 빼기" : "♡ 후보함 담기"}</button>
        <button type="button" onClick={() => setPicking(true)} className="min-h-12 px-3 text-sm font-bold ring-1 ring-ink ring-inset">{scheduledDay ? `${scheduledDay}일차에 있어요` : "일정에 넣기"}</button>
      </div>
      {canMapPlace(docent) && (
        <a href={`https://map.kakao.com/link/to/${encodeURIComponent(docent.placeName)},${docent.lat},${docent.lng}`} target="_blank" rel="noreferrer"
          className="flex min-h-tap items-center justify-center text-sm font-semibold">카카오맵 길찾기 ↗</a>
      )}
      <p role="status" className={notice ? "text-center text-xs text-ink-muted" : "sr-only"}>{notice}</p>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <article className="min-w-0 pb-56 lg:pb-0">
          <figure className="flex flex-col items-start">
            <span data-docent-photo="" className="flex h-60 w-full items-center justify-center bg-line lg:h-90">
              {docent.image ? <Image src={docent.image.url} alt={`${docent.placeName} 사진`} width={960} height={640} unoptimized priority className="h-full w-full object-contain" />
                : <span className="text-sm text-ink-muted">등록된 사진이 없어요.</span>}
            </span>
            {docent.image && <figcaption className="mt-2 text-xs text-ink-subtle">사진 한국관광공사 TourAPI · 공공누리 {docent.image.license === "Type3" ? "제3유형(변경금지)" : "제1유형"}</figcaption>}
          </figure>
        <p className="mt-6 text-sm text-ink-muted">{regionName(docent.region)} · {docent.category.split(" > ").at(-1)}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight lg:text-5xl">{docent.placeName}</h1>
        {docent.notes.map((note) => <p key={note} className="mt-2 text-xs text-ink-subtle">{note}</p>)}

        <section aria-label="한 줄 요약" className="mt-6">
          {nowLabel("summary")}
          {draft.summary.length ? <div className="font-display text-lg font-bold lg:text-xl [&_p]:text-[length:inherit] [&_p]:leading-relaxed">{paragraph("summary", draft.summary)}</div>
            : <p className="text-sm text-ink-muted">근거 자료에 관련 내용이 없어요.</p>}
        </section>

        {SECTIONS.map((section) => (
          <section key={section.key} aria-labelledby={`h-${section.key}`} className="mt-10">
            {nowLabel(section.key)}
            <h2 id={`h-${section.key}`} className="font-display text-lg font-bold">{section.label}</h2>
            <div className="mt-2">{draft[section.key].length ? paragraph(section.key, draft[section.key]) : <p className="text-sm text-ink-muted">근거 자료에 관련 내용이 없어요.</p>}</div>
          </section>
        ))}

        {draft.points.length > 0 && (
          <section aria-labelledby="h-points" className="mt-10">
            {nowLabel("points")}
            <h2 id="h-points" className="font-display text-lg font-bold">현장 관람 포인트</h2>
            <ol className="mt-3 flex flex-col gap-4">
              {draft.points.map((point, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center bg-room font-display text-sm font-bold text-on-room">{index + 1}</span>
                  <div className="min-w-0"><strong className="block">{point.title}</strong>{paragraph(`point${index}`, point.sentences)}</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="h-sources" className="mt-12">
          <h2 id="h-sources" className="font-display text-base font-bold">이 해설의 근거 자료</h2>
          <ul className="mt-2 text-sm">
            {docent.sources.map((source) => <li key={source.n} className="py-1">[{source.n}] {PROVIDERS[source.provider] ?? source.provider} · {source.title}</li>)}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">위 근거 자료에 있는 내용만으로 AI가 만든 해설이에요 · 만든 날 {docent.generatedOn} · 사람 확인 {docent.reviewedOn}. 문장 끝 번호를 누르면 원문을 볼 수 있어요.</p>
        </section>

        {nearby.length > 0 && (
          <section aria-labelledby="h-nearby" className="mt-12">
            <h2 id="h-nearby" className="font-display text-lg font-bold">근처에 이런 곳도 있어요</h2>
            <ul className="mt-3">
              {nearby.map((place) => (
                <li key={place.id} className="py-2">
                  {place.hasStory ? <Link href={`/docent/${place.id}`} className="font-semibold underline">{place.name}</Link> : <span className="font-semibold">{place.name}</span>}
                  <span className="block text-xs text-ink-muted">직선거리 {place.distance} · {place.category}{place.hasStory ? " · 이야기 있음" : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="fixed right-0 bottom-0 left-0 z-30 bg-bg px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-paper lg:sticky lg:top-6 lg:bottom-auto lg:z-auto lg:self-start lg:p-0 lg:shadow-none">
        {actions}
      </aside>

      <dialog ref={picker} onCancel={() => setPicking(false)} onClose={() => setPicking(false)} aria-labelledby="picker-title"
        className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%-32px)] max-w-sm overflow-y-auto bg-bg p-5 text-ink shadow-paper backdrop:bg-room/70">
        <div className="flex items-center justify-between"><h2 id="picker-title" className="font-display text-lg font-bold">몇 일차에 넣을까요?</h2>
          <button type="button" autoFocus onClick={() => setPicking(false)} aria-label="닫기" className="min-h-tap min-w-tap">✕</button></div>
        {scheduledDay && <p className="mt-2 text-sm text-ink-muted">이미 {scheduledDay}일차에 있어요. 다른 날로 옮기려면 <Link href="/schedule" className="font-semibold text-ink underline">언제 갈까?</Link>에서 바꿔요.</p>}
        <ul className="mt-3 flex flex-col gap-2">
          {trip.days.map((ids, index) => (
            <li key={index}>
              <button type="button" disabled={scheduledDay !== null} onClick={() => { tripActions.addToDay(docent.placeId, index + 1); setNotice(`${index + 1}일차에 넣었어요`); setPicking(false); }}
                className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm ring-1 ring-line ring-inset disabled:text-ink-subtle">
                <span className="font-semibold">{index + 1}일차</span><span className="text-ink-muted">지금 {ids.length}곳</span>
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
