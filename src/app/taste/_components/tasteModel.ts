import type { TasteId } from "../../../lib/trip/types";

export const TASTE_IDS: TasteId[] = ["alley", "sunset", "history", "wave"];
export const QUESTIONS = [
  { chapter: "아침", scene: "부산역을 나서자, 도슨트가 네 갈래의 이야기를 건넵니다.", title: "어떤 이야기로\n하루를 열어볼까요?", choices: [
    ["사람이 남긴 골목", "이름 없는 길에도 누군가의 하루가 있을 것 같아요."],
    ["바다가 건네는 여백", "설명보다 먼저, 바다를 한참 바라보고 싶어요."],
    ["오래된 장소의 기억", "지금 보이는 풍경의 이전 모습이 궁금해요."],
    ["풍경 너머의 발견", "높은 곳에 올라, 아직 안 보이는 쪽을 보고 싶어요."],
  ] },
  { chapter: "오후", scene: "걷다 보니 잠깐 멈춰 서고 싶은 곳을 만났습니다.", title: "발걸음을 멈춘 건\n무엇이었나요?", choices: [
    ["골목 안쪽의 작은 장면", "스쳐 지나갈 뻔한 동네의 표정을 발견했어요."],
    ["파도 소리가 닿는 자리", "무언가 하지 않아도 좋은 시간이 있어요."],
    ["유물 옆에 적힌 한 문장", "‘왜 여기에 있을까?’ 질문이 시작됐어요."],
    ["길 끝에서 열린 전망", "조금 더 걸어온 보람이 느껴져요."],
  ] },
  { chapter: "해 질 녘", scene: "빛이 바뀌면 같은 장소도 다르게 보입니다.", title: "오늘의 한 장면을\n남긴다면?", choices: [
    ["겹겹이 이어진 지붕", "사람이 사는 풍경을 담고 싶어요."],
    ["바다 위로 번지는 빛", "색이 천천히 바뀌는 순간을 기다릴래요."],
    ["오래된 문을 지나는 빛", "시간이 겹쳐 보이는 장면이 좋아요."],
    ["먼 수평선과 바위", "눈앞이 탁 트이는 장면이 기억에 남아요."],
  ] },
  { chapter: "하루 정리", scene: "도슨트가 묻습니다. ‘조금 더 머물고 싶었던 곳은요?’", title: "한 번 더 돌아가고\n싶은 순간은?", choices: [
    ["길을 하나 잘못 들었을 때", "뜻밖의 골목을 만나는 것도 여행이니까요."],
    ["아무 말 없이 쉬었을 때", "여행에도 비워 둔 시간이 필요해요."],
    ["장소의 사연을 알았을 때", "이야기를 듣고 다시 보니 다르게 느껴졌어요."],
    ["새로운 길에 들어섰을 때", "조금 낯선 풍경을 만나는 게 즐거워요."],
  ] },
  { chapter: "귀가", scene: "부산에서의 하루가 끝났습니다. 오래 남길 한 문장을 골라보세요.", title: "당신의 여행은\n어떤 문장인가요?", choices: [
    ["길마다 사람의 온기가 있었다", "작은 장면들을 오래 기억하는 여행."],
    ["바다를 보고 마음을 비웠다", "여유로운 순간을 모으는 여행."],
    ["알고 보니 전혀 다른 풍경이었다", "장소의 시간을 읽어내는 여행."],
    ["다음 풍경이 계속 궁금했다", "새로운 발견을 따라가는 여행."],
  ] },
] as const;

export const RESULTS = {
  alley: { name: "이바구길 골목 산책자", lead: "당신은 길보다, 그 안에 사는 이야기를 따라갑니다.", description: "유명한 풍경 앞에서도 작은 골목이 먼저 눈에 들어오는 사람. 천천히 걷고 자세히 볼수록 당신의 부산은 더 풍성해질 거예요.", keywords: ["사람의 흔적", "골목의 표정", "느린 발견"], courseTitle: "계단에서 골목을 지나, 바다 곁 마을로", stops: [
    { id: "1942337", prompt: "한 계단씩 오르며 동네의 높낮이를 느껴보세요." },
    { id: "1997221", prompt: "골목과 집들이 만드는 풍경에 시선을 두어보세요." },
    { id: "2684712", prompt: "바다 곁 마을에서는 어떤 장면이 눈에 들어오나요?" },
  ] },
  sunset: { name: "광안리 노을 감상가", lead: "당신의 여행에는, 바라보는 시간도 필요합니다.", description: "많은 곳을 지나기보다 마음에 드는 풍경 하나를 오래 보고 싶은 사람. 바다를 곁에 둔 장소들을 따라 당신만의 여백을 만들어보세요.", keywords: ["바다의 여백", "빛의 변화", "쉬어가는 시간"], courseTitle: "서쪽 바다에서 광안리까지, 세 번의 쉼표", stops: [
    { id: "126079", prompt: "첫 바다에서는 아무것도 서두르지 않아도 좋아요." },
    { id: "126122", prompt: "같은 바다도 다른 장소에서는 다르게 보일 거예요." },
    { id: "126078", prompt: "마지막 해변에서는 오늘 가장 좋았던 순간을 떠올려보세요." },
  ] },
  history: { name: "동래성 시간 여행자", lead: "당신은 지금의 풍경에서, 이전의 시간을 찾습니다.", description: "‘왜 여기에 있을까?’라는 질문으로 장소를 더 깊이 만나는 사람. 성곽과 유물, 사찰을 이어 보며 눈앞의 풍경을 다시 읽어보세요.", keywords: ["장소의 기억", "알고 보는 즐거움", "시간의 겹"], courseTitle: "성곽과 유물, 사찰을 잇는 시간", stops: [
    { id: "2654613", prompt: "성곽 앞에서 이 장소의 이전 모습을 상상해보세요." },
    { id: "130145", prompt: "유물에 담긴 이야기를 도슨트와 함께 읽어보세요." },
    { id: "126148", prompt: "사찰의 문을 지날 때, 어떤 의미가 있는지 살펴보세요." },
  ] },
  wave: { name: "태종대 파도 탐험가", lead: "당신에게 다음 풍경은, 조금 더 걸어갈 이유입니다.", description: "바람이 닿는 곳, 시야가 열리는 곳을 만나고 싶은 사람. 해안과 전망을 이어가며 부산의 서로 다른 표정을 발견해보세요.", keywords: ["열린 시야", "해안의 풍경", "새로운 발견"], courseTitle: "해안의 굴곡을 따라, 다음 전망으로", stops: [
    { id: "1945309", prompt: "해안의 선을 눈으로 따라가보세요." },
    { id: "1940208", prompt: "전망 앞에서 시선을 조금 더 멀리 보내보세요." },
    { id: "126658", prompt: "숲과 바위해안, 바다가 만드는 풍경을 만나보세요." },
  ] },
} satisfies Record<TasteId, { name: string; lead: string; description: string; keywords: string[]; courseTitle: string; stops: { id: string; prompt: string }[] }>;

export type TasteStory = { summary: string; narration: string };
export type TastePlace = { id: string; name: string; region: string; category: string; lat: number; lng: number; story: TasteStory | null };
export type CourseStop = TastePlace & { prompt: string };

/** 최다 득점이 동점이면, 동점 유형 중 가장 최근 고른 답을 우선한다. */
export function scoreTaste(answers: TasteId[]): TasteId | null {
  if (answers.length !== QUESTIONS.length || answers.some((id) => !TASTE_IDS.includes(id))) return null;
  const counts = TASTE_IDS.map((id) => answers.filter((answer) => answer === id).length);
  const highest = Math.max(...counts);
  return [...answers].reverse().find((id) => counts[TASTE_IDS.indexOf(id)] === highest) ?? null;
}

/** 편집한 대표 코스. 없는 장소·잘못된 좌표는 추측해 채우지 않는다. */
export function resolveCourse(taste: TasteId, places: Record<string, TastePlace>): CourseStop[] {
  return RESULTS[taste].stops.flatMap(({ id, prompt }) => {
    const place = places[id];
    return place && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat >= 34 && place.lat <= 36 && place.lng >= 128 && place.lng <= 130 ? [{ ...place, prompt }] : [];
  });
}

/** 기존 일정은 그대로 두고, 아직 어느 날에도 없는 장소만 추천 순서대로 추가. */
export function newCourseIds(course: CourseStop[], days: string[][]): string[] {
  const scheduled = new Set(days.flat());
  return [...new Set(course.map((place) => place.id))].filter((id) => !scheduled.has(id));
}
