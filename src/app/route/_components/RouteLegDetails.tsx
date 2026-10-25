import type { SchedulePlace } from "../../schedule/_components/scheduleModel";
import { kakaoRouteUrl, minutesLabel } from "./routeModel";
import type { LegState, RouteMode } from "./useRouteLegs";

export function RouteLegDetails({ index, total, from, to, fromName, toName, state, mode, onMode, onRetry, onSelect }: {
  index: number; total: number; from?: SchedulePlace; to?: SchedulePlace; fromName: string; toName: string;
  state: LegState; mode: RouteMode; onMode: (mode: RouteMode) => void; onRetry: () => void; onSelect: (index: number) => void;
}) {
  const leg = state.kind === "ready" ? state.leg : null;
  return <section id="route-leg-detail" role="tabpanel" aria-labelledby={`route-leg-tab-${index}`} className="hidden min-w-0 lg:block">
    <p className="mb-4 text-sm text-ink-muted">선택한 구간 {index + 1} / {total}</p>
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1"><p className="text-xs text-ink-muted">{index + 1}번째 장소</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight wrap-anywhere">{fromName}</h2></div>
      <span aria-hidden="true" className="text-ink-subtle">→</span>
      <div className="min-w-0 flex-1"><p className="text-xs text-ink-muted">{index + 2}번째 장소</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight wrap-anywhere">{toName}</h2></div>
    </div>
    <div role="group" aria-label="선택한 구간의 이동수단" className="mt-5 flex gap-6">
      {(["transit", "walk"] as const).map((option) => <button type="button" key={option} aria-pressed={mode === option} onClick={() => onMode(option)}
        className={`min-h-tap min-w-tap pb-2 text-sm ${mode === option ? "font-bold text-ink shadow-[inset_0_-2px_var(--color-ink)]" : "text-ink-subtle"}`}>
        {option === "transit" ? "대중교통" : "도보"}
      </button>)}
    </div>
    <div className="my-5 flex flex-wrap items-baseline gap-3" aria-live="polite">
      <strong className="font-display text-4xl font-extrabold tracking-tight">{leg ? minutesLabel(leg.minutes) : state.kind === "loading" ? "찾는 중" : "확인 필요"}</strong>
      {leg && <span className="text-sm text-ink-muted">{leg.kind === "walk" ? `${leg.meters.toLocaleString()}m` : leg.transfers ? `환승 ${leg.transfers}번` : "환승 없이"}</span>}
    </div>
    {state.kind === "loading" && <p role="status" className="text-sm text-ink-muted">이 구간의 경로를 찾고 있어요</p>}
    {state.kind === "error" && <div><p role="status" className="text-sm leading-relaxed text-ink-muted">{state.message}</p>
      {state.retry && <button type="button" onClick={onRetry} className="mt-2 min-h-tap min-w-tap text-sm font-semibold underline underline-offset-4">다시 시도</button>}
    </div>}
    {leg?.kind === "walk" && <p className="text-sm leading-relaxed text-ink-muted">걸어서 이동하는 구간이에요.<br />카카오맵에서 걷는 길을 확인하세요.</p>}
    {leg?.kind === "transit" && <ol aria-label="선택한 구간의 승차·하차 안내" className="space-y-4">
      {leg.steps.map((step, stepIndex) => <li key={stepIndex} className="flex gap-3">
        <span aria-hidden="true" className="w-0.5 shrink-0 bg-line" />
        <div className="min-w-0">
          <strong className="text-base font-bold">{step.type === "WALKING" ? `걷기 ${step.minutes}분` : `${step.type === "BUS" ? "버스 " : ""}${step.names[0] || "노선 정보 확인 필요"}${step.names.length > 1 ? ` 외 ${step.names.length - 1}` : ""}`}</strong>
          {step.names.length > 1 && <p className="mt-1 text-xs leading-relaxed text-ink-muted">같은 구간 노선: {step.names.join(", ")}</p>}
          {step.type !== "WALKING" && <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {step.board && step.alight ? <>{step.board}에서 타고<br />{step.alight}에서 내려요 · {step.stopCount}정류장</> : "승차·하차 정보는 카카오맵에서 확인해주세요"}
          </p>}
        </div>
      </li>)}
    </ol>}
    {from && to && <a href={kakaoRouteUrl(mode === "walk" ? "walk" : "traffic", from, to)} target="_blank" rel="noreferrer"
      aria-label={`${fromName}에서 ${toName}까지 카카오맵에서 길 보기, 새 창`}
      className="mt-6 flex min-h-12 items-center justify-between gap-2 bg-room px-4 text-sm font-semibold text-on-room">
      카카오맵에서 길 보기 <span aria-hidden="true">↗</span>
    </a>}
    <div className="mt-2 flex justify-between gap-3 text-sm text-ink-muted">
      <button type="button" disabled={index === 0} onClick={() => onSelect(index - 1)} className="min-h-tap min-w-tap disabled:opacity-30">← 이전 구간</button>
      <button type="button" disabled={index === total - 1} onClick={() => onSelect(index + 1)} className="min-h-tap min-w-tap disabled:opacity-30">다음 구간 →</button>
    </div>
  </section>;
}
