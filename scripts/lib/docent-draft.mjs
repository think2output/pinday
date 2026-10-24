// 도슨트 해설 초안 만들기의 순수 함수. 검수에서 고른 문단만 근거로 쓰고, 결과의 근거 번호와 숫자를 검사한다.
import { createHash } from "node:crypto";

export const PROMPT_VERSION = "docent-draft-v1";
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** HTML 태그·엔티티를 걷어 읽을 수 있는 글로 만든다(원문은 따로 보존) */
export function plainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n+/g, "\n").trim();
}

/**
 * 검수 기록의 선택 문단을 근거 목록으로 만든다. 원문이 바뀌었거나 선택 상태가 아니면 쓰지 않고 이유를 돌려준다.
 * 선택하지 않은 출처(미검수·제외·주변 유산)는 여기서 아예 들어오지 않는다.
 */
export function selectedSources(review, evidenceFile) {
  const problems = [];
  const sources = review.selectedExcerpts.flatMap((excerpt) => {
    const source = evidenceFile.evidence.find((entry) => entry.id === excerpt.sourceId);
    if (!source) { problems.push(`${excerpt.sourceId}: 근거 파일에 없음`); return []; }
    if (sha256(source.originalText) !== excerpt.originalTextSha256) { problems.push(`${excerpt.sourceId}: 원문이 바뀌어 재검수 필요`); return []; }
    if (source.originalText.slice(excerpt.start, excerpt.end) !== excerpt.originalText) { problems.push(`${excerpt.sourceId}: 선택 범위 불일치`); return []; }
    if (source.review?.status !== "selected-scope") { problems.push(`${excerpt.sourceId}: 선택 상태 아님(${source.review?.status ?? "없음"})`); return []; }
    return [{ sourceId: source.id, provider: source.provider, title: source.title, url: source.url, license: source.license ?? null,
      text: plainText(excerpt.originalText), originalTextSha256: excerpt.originalTextSha256 }];
  });
  return { sources: sources.map((source, index) => ({ n: index + 1, ...source })), problems };
}

const sentence = { type: "object", properties: { text: { type: "string" }, sources: { type: "array", items: { type: "integer" } } }, required: ["text", "sources"], additionalProperties: false };
const sentences = { type: "array", items: sentence };
export const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    summary: sentences,
    history: sentences,
    neighborhood: sentences,
    beforeVisit: sentences,
    points: { type: "array", items: { type: "object", properties: { title: { type: "string" }, sentences }, required: ["title", "sentences"], additionalProperties: false } },
    narration: { type: "string" },
  },
  required: ["summary", "history", "neighborhood", "beforeVisit", "points", "narration"],
  additionalProperties: false,
};

export function buildPrompt(review, sources) {
  const system = [
    "너는 부산 여행 서비스 PinDay의 도슨트 해설 초안 작성자다. 아래 [근거] 안의 내용만 사용한다.",
    "규칙:",
    "- 근거에 없는 연도·숫자·인물·전설·평가·운영 정보(시간, 요금, 행사)를 만들지 않는다. 일반 상식도 덧붙이지 않는다.",
    "- 모든 문장의 sources에 그 문장을 뒷받침하는 근거 번호를 1개 이상 넣는다. 뒷받침할 근거가 없는 문장은 쓰지 않는다.",
    "- 근거가 부족한 부분은 빈 배열로 둔다. 억지로 채우지 않는다. 화면에서 '근거 자료에 관련 내용이 없어요'로 표시된다.",
    "- summary: 한 문장(0~1개). history: 역사와 문화. neighborhood: 동네의 특징. beforeVisit: 방문 전 알아두기. 각 0~3문장.",
    "- points: 현장에서 직접 볼 수 있는 대상이 근거에 명시된 경우만 0~3개. 제목은 짧게.",
    "- narration: 위 문장들만 말하는 문체(\"~예요\")로 다시 쓴 들려주기 원고. 근거 번호·괄호 없이, 새 내용 추가 금지. 쓸 문장이 없으면 빈 문자열.",
    "- 존댓말 해요체, 짧고 쉬운 문장. 과장 표현(최고, 꼭, 반드시) 금지.",
  ].join("\n");
  const user = [
    `장소: ${review.placeName}`,
    `작성 범위: ${review.draftingScope}`,
    review.notes?.length ? `주의:\n${review.notes.map((note) => `- ${note}`).join("\n")}` : "",
    "[근거]",
    ...sources.map((source) => `[${source.n}] ${source.title}\n${source.text}`),
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

const allSentences = (draft) => [
  ...draft.summary, ...draft.history, ...draft.neighborhood, ...draft.beforeVisit, ...draft.points.flatMap((point) => point.sentences),
];
const numbersIn = (text) => text.match(/\d+(?:[.,]\d+)*/g) ?? [];

/**
 * 자동 검사: 없는 근거 번호, 근거 없는 문장, 인용 근거에 없는 숫자, 들려주기 원고의 새 숫자.
 * 통과해도 사실 확인이 끝난 것은 아니다(사람 검수 필요).
 */
export function checkDraft(draft, sources, placeName = "") {
  const valid = new Set(sources.map((source) => source.n));
  const textOf = new Map(sources.map((source) => [source.n, source.text]));
  const issues = [];
  for (const item of allSentences(draft)) {
    if (!item.sources.length) issues.push({ type: "no-source", text: item.text });
    const bad = item.sources.filter((n) => !valid.has(n));
    if (bad.length) issues.push({ type: "unknown-source", text: item.text, sources: bad });
    const cited = [placeName, ...item.sources.map((n) => textOf.get(n) ?? "")].join("\n");
    const missing = numbersIn(item.text).filter((number) => !cited.includes(number));
    if (missing.length) issues.push({ type: "number-not-in-source", text: item.text, numbers: missing });
  }
  const sentenceNumbers = allSentences(draft).flatMap((item) => numbersIn(item.text));
  const narrationNew = numbersIn(draft.narration).filter((number) => !sentenceNumbers.includes(number) && !placeName.includes(number));
  if (narrationNew.length) issues.push({ type: "narration-new-number", numbers: narrationNew });
  if (draft.summary.length > 1) issues.push({ type: "summary-too-long" });
  if (draft.points.length > 3) issues.push({ type: "too-many-points" });
  return issues;
}

/** 미국 달러 추정 비용 */
export function estimateUsd(usage, price) {
  const input = usage.input_tokens ?? 0;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return ((input - cached) * price.input + cached * price.cachedInput + output * price.output) / 1_000_000;
}
