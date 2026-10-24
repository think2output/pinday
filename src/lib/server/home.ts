import "server-only";

import placesData from "../../../data/places/places.json";
import storiesData from "../../../data/stories/stories.json";

export type StoryCard = {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  kind: string;
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

type RawStory = (typeof storiesData.stories)[number];

function toCard(story: RawStory): StoryCard {
  const { photo } = story;
  return {
    id: story.id,
    title: story.title,
    subtitle: story.subtitle,
    region: story.region,
    kind: story.kind,
    photo: photo
      ? {
          url: photo.url,
          credit: ["사진 한국관광공사", LICENSE_LABEL[photo.license]].filter(Boolean).join(" · "),
          placeName: photo.placeName,
          noDerivs: photo.license === "Type3",
        }
      : null,
  };
}

/** 홈 화면 데이터: 구별 관광지 수, 이번 주 이야기, 구별 이야기 */
export function homeData() {
  const regionCounts: Record<string, number> = {};
  for (const place of placesData) regionCounts[place.region] = (regionCounts[place.region] ?? 0) + 1;

  const byId = new Map(storiesData.stories.map((story) => [story.id, story]));
  const weekly = storiesData.weekly.flatMap((id) => {
    const story = byId.get(id);
    return story ? [toCard(story)] : [];
  });

  // 구마다 사진 있는 이야기를 먼저, 그다음 원본 순서
  const storiesByRegion: Record<string, StoryCard[]> = {};
  for (const story of storiesData.stories) (storiesByRegion[story.region] ??= []).push(toCard(story));
  for (const region of Object.keys(storiesByRegion)) {
    const list = storiesByRegion[region];
    storiesByRegion[region] = [...list.filter((s) => s.photo), ...list.filter((s) => !s.photo)].slice(0, STORIES_PER_REGION);
  }

  return { regionCounts, weekly, storiesByRegion };
}
