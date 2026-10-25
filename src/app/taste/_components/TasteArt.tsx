import type { TasteId } from "../../../lib/trip/types";

/** 특정 건축물을 복제하지 않은 네 가지 이야기의 상징 그림. */
export function TasteArt({ kind, className = "" }: { kind: TasteId; className?: string }) {
  return <svg viewBox="0 0 300 200" fill="none" aria-hidden="true" className={className}>
    <ellipse cx="155" cy="160" rx="100" ry="14" fill="currentColor" opacity=".06" />
    <circle cx={kind === "sunset" ? 206 : 212} cy="60" r={kind === "sunset" ? 37 : 19} className="fill-light" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {kind === "alley" && <><path d="M36 157h45v-30h35v-30h39V75h37v-27h42v109M43 106V81l25-17 25 17v30M49 81h38M58 94h12v15M119 88V60l22-14 23 14M126 62h15v15M191 126V94l24-16 25 16v63M202 105h17v23M85 159l121-1M105 145h31M139 125h30M173 104h14" /><path d="M36 173l197-1" opacity=".3" /></>}
      {kind === "sunset" && <><path d="M24 132h250M57 127V68M235 127V68M57 76c35 58 138 58 178 0M79 100v29M103 114v15M126 121v8M149 124v5M174 121v8M198 113v16M220 99v30M28 153c24-13 44 13 68 0s43 13 65 0 43 13 65 0 31 7 48 0M36 175c22-12 41 10 65 0s42 12 64 0 46 11 70 0" /><path d="M198 146h20M190 160h32M202 174h18" opacity=".4" /></>}
      {kind === "history" && <><path d="M38 161h226M51 155V79l25-15h148l24 15v76M42 80l34-28h148l34 28H42M64 53l12-18h148l12 18M90 155V97h32v58M177 155V97h32v58M138 155v-45a14 14 0 0 1 28 0v45M78 81v72M225 81v72M35 171h233M67 43h168" /><path d="M134 60h36M137 69h30M143 133h16M143 143h16" opacity=".4" /></>}
      {kind === "wave" && <><path d="M36 160l43-30 25 10 22-34 34 17 31-25 43 24 30 38M180 110l7-55h28l7 55M182 55l18-20 20 20h-38M190 66h22M194 83h12v15M42 177c26-16 44 14 70 0s45 16 70 0 45 13 72 0M73 149l10-5M133 135l17 8M217 137l16 9" /><path d="M224 65l40-12M225 76l45 3M173 65l-35-12" opacity=".4" /></>}
    </g>
  </svg>;
}
