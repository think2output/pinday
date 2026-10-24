// 대표검수에서 '범위 제한 초안 후보'로 고른 장소의 도슨트 해설 초안을 OpenAI로 만든다.
// 기본은 미리보기(호출 안 함). 실제 호출: node scripts/generate-docent-drafts.mjs --run
// 옵션: --only=126814  --budget=0.30(달러, 넘으면 중단)  --report(호출 없이 검사·검수 문서만 다시 만들기)
// 결과: data/docent/drafts/{장소id}.json, docs/docent-drafts-review.md. 모두 'AI 초안 · 사람 검수 전'.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { buildPrompt, checkDraft, DRAFT_SCHEMA, estimateUsd, PROMPT_VERSION, selectedSources } from "./lib/docent-draft.mjs";

const MODEL = "gpt-6-luna";
// https://developers.openai.com/api/docs/models/gpt-6-luna (2026-10-25 확인, 100만 토큰당 달러)
const PRICE = { input: 0.1, cachedInput: 0.01, output: 0.5 };
const REVIEW_FILE = "data/docent/reviews/representative-2026-10-24.json";
const DRAFT_DIR = "data/docent/drafts";
const REPORT = "docs/docent-drafts-review.md";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [k, v] = arg.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const run = args.run === true;
// --report: API를 부르지 않고 저장된 초안의 자동 검사와 검수 문서만 다시 만든다
if (args.report) {
  const doc = JSON.parse(readFileSync("data/docent/reviews/representative-2026-10-24.json", "utf8"));
  for (const review of doc.reviews) {
    const file = `data/docent/drafts/${review.placeId}.json`;
    if (!existsSync(file)) continue;
    const saved = JSON.parse(readFileSync(file, "utf8"));
    saved.checks = { issues: checkDraft(saved.draft, saved.sources, saved.placeName) };
    writeFileSync(file, JSON.stringify(saved, null, 2) + "\n");
  }
}
const budget = Number(args.budget ?? 0.3);

const reviewDoc = JSON.parse(readFileSync(REVIEW_FILE, "utf8"));
const targets = reviewDoc.reviews.filter((review) => review.decision === "scoped-draft-candidate" && (!args.only || review.placeId === args.only));
if (!targets.length) { console.error("대상 장소가 없어요"); process.exit(1); }

let key = null;
if (run) {
  process.loadEnvFile(".env");
  key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("OPENAI_API_KEY가 .env에 없어요"); process.exit(1); }
}

async function generate(system, user) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: MODEL, store: false, reasoning: { effort: "low" }, max_output_tokens: 4000,
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      text: { format: { type: "json_schema", name: "docent_draft", schema: DRAFT_SCHEMA, strict: true } },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${body?.error?.message ?? "응답 오류"}`);
  if (body.status !== "completed") throw new Error(`응답 미완료: ${body.status} ${body.incomplete_details?.reason ?? ""}`);
  const content = body.output.find((item) => item.type === "message")?.content ?? [];
  const refusal = content.find((part) => part.type === "refusal");
  if (refusal) throw new Error(`거절: ${refusal.refusal}`);
  const text = content.find((part) => part.type === "output_text")?.text;
  if (!text) throw new Error("결과 글이 없어요");
  return { draft: JSON.parse(text), usage: body.usage };
}

mkdirSync(DRAFT_DIR, { recursive: true });
let spent = 0;
for (const review of args.report ? [] : targets) {
  const evidenceFile = JSON.parse(readFileSync(`data/docent/evidence/${review.placeId}.json`, "utf8"));
  const { sources, problems } = selectedSources(review, evidenceFile);
  if (problems.length || !sources.length) { console.log(`건너뜀 ${review.placeName}: ${problems.join(", ") || "근거 없음"}`); continue; }
  const existing = `${DRAFT_DIR}/${review.placeId}.json`;
  if (existsSync(existing) && JSON.parse(readFileSync(existing, "utf8")).humanReview?.status === "approved" && !args.force) {
    console.log(`건너뜀 ${review.placeName}: 사람 승인된 해설(덮어쓰려면 --force, 다시 검수 필요)`); continue;
  }
  const { system, user } = buildPrompt(review, sources);
  if (!run) { console.log(`미리보기 ${review.placeName}: 근거 ${sources.length}개, 입력 약 ${system.length + user.length}자`); continue; }
  if (spent >= budget) { console.log(`예산 ${budget}달러에 도달해 중단`); break; }
  try {
    const { draft, usage } = await generate(system, user);
    const usd = estimateUsd(usage, PRICE);
    spent += usd;
    const issues = checkDraft(draft, sources, review.placeName);
    const output = {
      schemaVersion: 1, placeId: review.placeId, placeName: review.placeName,
      status: "ai-draft", humanReview: "pending", publishable: false,
      generatedAt: new Date().toISOString(), model: MODEL, promptVersion: PROMPT_VERSION,
      review: { file: REVIEW_FILE, reviewedOn: reviewDoc.reviewedOn, reviewer: reviewDoc.reviewer, draftingScope: review.draftingScope, notes: review.notes ?? [] },
      sources, draft, checks: { issues },
      usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, estimatedUsd: Number(usd.toFixed(6)) },
    };
    writeFileSync(`${DRAFT_DIR}/${review.placeId}.json`, JSON.stringify(output, null, 2) + "\n");
    console.log(`완료 ${review.placeName}: 자동 검사 문제 ${issues.length}건, 약 $${usd.toFixed(4)}`);
  } catch (error) {
    console.log(`실패 ${review.placeName}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (run || args.report) {
  writeFileSync(REPORT, report());
  console.log(`합계 약 $${spent.toFixed(4)} · 검수 문서 ${REPORT}`);
}

function report() {
  const NONE = "_근거 자료에 관련 내용이 없어요_";
  const lines = (items) => items.length ? items.map((item) => `- ${item.text} ${item.sources.map((n) => `[${n}]`).join("")}`).join("\n") : NONE;
  const issueText = { "no-source": "근거 번호 없는 문장", "unknown-source": "없는 근거 번호", "number-not-in-source": "근거에 없는 숫자", "narration-new-number": "원고에 새 숫자", "summary-too-long": "요약이 2문장 이상", "too-many-points": "관람 포인트 4개 이상" };
  const parts = reviewDoc.reviews.filter((review) => review.decision === "scoped-draft-candidate").flatMap((review) => {
    const file = `${DRAFT_DIR}/${review.placeId}.json`;
    if (!existsSync(file)) return [`## ${review.placeName} (${review.placeId})\n\n초안 없음.`];
    const { draft, sources, checks, model, generatedAt } = JSON.parse(readFileSync(file, "utf8"));
    return [[
      `## ${review.placeName} (${review.placeId})`,
      `상태: AI 초안 · 사람 검수 전 · ${model} · ${new Date(Date.parse(generatedAt) + 9 * 3600_000).toISOString().slice(0, 10)}  `,
      `작성 범위: ${review.draftingScope}  `,
      `자동 검사: ${checks.issues.length ? checks.issues.map((issue) => `${issueText[issue.type] ?? issue.type}${issue.numbers ? `(${issue.numbers.join(", ")})` : ""}`).join(" · ") : "문제 없음"}`,
      `### 한 줄 요약\n${lines(draft.summary)}`,
      `### 역사와 문화\n${lines(draft.history)}`,
      `### 동네의 특징\n${lines(draft.neighborhood)}`,
      `### 방문 전 알아두기\n${lines(draft.beforeVisit)}`,
      `### 현장 관람 포인트\n${draft.points.length ? draft.points.map((point) => `**${point.title}**\n${lines(point.sentences)}`).join("\n\n") : "_근거가 없어 숨김_"}`,
      `### 들려주기 원고\n${draft.narration ? `> ${draft.narration}` : NONE}`,
      `### 근거 원문\n${sources.map((source) => `[${source.n}] ${source.title} · ${source.provider} · ${source.url}\n\n> ${source.text.replace(/\n/g, "\n> ")}`).join("\n\n")}`,
      "### 사람 검수\n- [ ] 모든 문장이 근거 원문과 일치\n- [ ] 공개해도 됨\n- 고칠 점:",
    ].join("\n\n")];
  });
  return [
    "# 도슨트 해설 초안 검수 — AI 초안 · 사람 검수 전",
    "",
    "`node scripts/generate-docent-drafts.mjs --run`이 만든 문서다. 대표검수에서 고른 문단만 근거로 썼다. 자동 검사는 근거 번호와 숫자만 확인하며 사실 확인을 대신하지 않는다. 사람 검수를 통과하기 전에는 화면에 공개하지 않는다.",
    "",
    ...parts.map((part) => `${part}\n`),
  ].join("\n");
}
