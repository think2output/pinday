import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildPrompt, checkDraft, estimateUsd, plainText, selectedSources } from "./docent-draft.mjs";

const sha = (text) => createHash("sha256").update(text).digest("hex");
const original = "앞 문장. 1592년 25명이 성을 지켰다. 뒤 문장.";
const start = original.indexOf("1592"), end = original.indexOf("뒤") - 1;
const excerpt = { sourceId: "heritage:1", start, end, originalText: original.slice(start, end), originalTextSha256: sha(original) };
const evidenceFile = { evidence: [
  { id: "heritage:1", provider: "heritage", title: "제단", url: "u", originalText: original, review: { status: "selected-scope" } },
  { id: "tourapi:1", provider: "tourapi", title: "충돌 자료", url: "u2", originalText: "독립운동 기념관", review: { status: "excluded" } },
] };
const review = { placeName: "25의용단", draftingScope: "범위", notes: ["제향 일정 사용 금지"], selectedExcerpts: [excerpt] };

describe("근거 고르기", () => {
  it("검수에서 고른 문단만 근거로 쓰고 제외 자료는 넣지 않는다", () => {
    const { sources, problems } = selectedSources(review, evidenceFile);
    expect(problems).toEqual([]);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ n: 1, sourceId: "heritage:1", text: "1592년 25명이 성을 지켰다." });
    expect(buildPrompt(review, sources).user).not.toContain("독립운동");
  });
  it("원문이 바뀌었거나 선택 상태가 아니면 쓰지 않는다", () => {
    const changed = { evidence: [{ ...evidenceFile.evidence[0], originalText: original + "추가" }] };
    expect(selectedSources(review, changed).problems[0]).toContain("재검수");
    const unselected = { evidence: [{ ...evidenceFile.evidence[0], review: { status: "unreviewed" } }] };
    expect(selectedSources(review, unselected).sources).toEqual([]);
  });
  it("HTML을 읽을 수 있는 글로 바꾼다", () => {
    expect(plainText("<p>바다&amp;숲</p><br/>  절벽")).toBe("바다&숲\n절벽");
  });
});

describe("초안 자동 검사", () => {
  const sources = [{ n: 1, text: "1592년 25명이 성을 지켰다." }];
  const empty = { summary: [], history: [], neighborhood: [], beforeVisit: [], points: [], narration: "" };
  it("근거에 있는 숫자와 번호만 쓰면 문제 없음", () => {
    expect(checkDraft({ ...empty, history: [{ text: "1592년에 25명이 성을 지켰어요.", sources: [1] }], narration: "1592년에 25명이 성을 지켰어요." }, sources)).toEqual([]);
  });
  it("없는 번호, 근거 없는 문장, 근거에 없는 숫자, 원고의 새 숫자를 잡는다", () => {
    const issues = checkDraft({ ...empty,
      history: [{ text: "1593년에 지었어요.", sources: [1] }, { text: "아름다워요.", sources: [] }, { text: "성이에요.", sources: [3] }],
      narration: "1700년대 이야기예요." }, sources);
    expect(issues.map((issue) => issue.type)).toEqual(["number-not-in-source", "no-source", "unknown-source", "narration-new-number"]);
  });
  it("장소 이름에 든 숫자는 근거 밖 숫자로 보지 않는다", () => {
    expect(checkDraft({ ...empty, summary: [{ text: "168계단은 지름길이에요.", sources: [1] }], narration: "168계단은 지름길이에요." }, sources, "168계단")).toEqual([]);
  });
  it("비용 추정", () => {
    expect(estimateUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }, { input: 0.1, cachedInput: 0.01, output: 0.5 })).toBeCloseTo(0.6);
  });
});

describe("실제 검수 기록", () => {
  it("초안 후보 7곳 모두 원문 해시와 선택 범위가 맞는다", () => {
    const reviews = JSON.parse(readFileSync("data/docent/reviews/representative-2026-10-24.json", "utf8")).reviews
      .filter((entry) => entry.decision === "scoped-draft-candidate");
    expect(reviews).toHaveLength(7);
    for (const entry of reviews) {
      const file = JSON.parse(readFileSync(`data/docent/evidence/${entry.placeId}.json`, "utf8"));
      expect(selectedSources(entry, file).problems).toEqual([]);
    }
  });
});
