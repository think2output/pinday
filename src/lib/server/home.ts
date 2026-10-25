import "server-only";

import placesData from "../../../data/places/places.json";
import { listDocents, type Docent } from "./docent";

export type StoryCard = {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  kind: string;
  href: string;
  /** 연결된 장소의 TourAPI 사진. 없으면 null */
  photo: { url: string; credit: string; placeName: string; noDerivs: boolean } | null;
};

/** 공공누리 유형 표기. 3유형은 변경금지라 사진을 자르거나 덧칠하지 않는다 */
const LICENSE_LABEL: Record<string, string> = {
  Type1: "공공누리 제1유형",
  Type3: "공공누리 제3유형(변경금지)",
};

/** 구를 골랐을 때 보여줄 그 구의 이야기 수 */
const STORIES_PER_REGION = 4;

function toCard(story: Docent): StoryCard {
  const photo = story.image;
  return {
    id: story.placeId,
    title: story.placeName,
    subtitle: story.draft.summary[0]?.text ?? "",
    region: story.region,
    kind: story.category.split(" > ").at(-1) ?? story.category,
    href: `/docent/${story.placeId}`,
    photo: photo
      ? {
          url: photo.url,
          credit: ["사진 한국관광공사", LICENSE_LABEL[photo.license]].filter(Boolean).join(" · "),
          placeName: story.placeName,
          noDerivs: photo.license === "Type3",
        }
      : null,
  };
}

/** 홈 화면 데이터: 구별 관광지 수, 이번 주 이야기, 구별 이야기 */
export function homeData() {
  const regionCounts: Record<string, number> = {};
  for (const place of placesData) regionCounts[place.region] = (regionCounts[place.region] ?? 0) + 1;

  // 카드와 열리는 해설이 같은 장소가 되도록 공개 승인된 도슨트만 쓴다.
  const stories = listDocents().map(toCard);
  const weekly: StoryCard[] = [];
  const usedRegions = new Set<string>();
  for (const story of stories) {
    if (weekly.length === 4) break;
    if (!story.photo || usedRegions.has(story.region)) continue;
    weekly.push(story);
    usedRegions.add(story.region);
  }

  // 구마다 사진 있는 이야기를 먼저, 그다음 원본 순서
  const storiesByRegion: Record<string, StoryCard[]> = {};
  for (const story of stories) (storiesByRegion[story.region] ??= []).push(story);
  for (const region of Object.keys(storiesByRegion)) {
    const list = storiesByRegion[region];
    storiesByRegion[region] = [...list.filter((s) => s.photo), ...list.filter((s) => !s.photo)].slice(0, STORIES_PER_REGION);
  }

  return { regionCounts, weekly, storiesByRegion };
}
