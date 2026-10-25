// 홈 일러스트 지도: 구·군의 모양과 위치는 mapLayout.ts에서 정의한다.
// spot은 그 구의 대표 명소로, data/places/places.json에 있는 장소 이름이다.

export type MapIcon =
  | "bridge" | "lighthouse" | "houses" | "island" | "arboretum"
  | "temple" | "seasideTemple" | "wetland" | "fortress" | "beach"
  | "park" | "stream" | "cableCar" | "stairs" | "cliff" | "books";

export type MapRegion = {
  /** 내 여행 정보에 저장하는 전체 이름 */
  region: string;
  name: string;
  spot: string;
  /** 대표 명소의 특징을 표현한 상징 선 그림 */
  icon: MapIcon;
};

export const MAP_REGIONS: MapRegion[] = [
  { region: "부산광역시 강서구", name: "강서구", spot: "가덕도", icon: "island" },
  { region: "부산광역시 북구", name: "북구", spot: "화명수목원", icon: "arboretum" },
  { region: "부산광역시 금정구", name: "금정구", spot: "범어사", icon: "temple" },
  { region: "부산광역시 기장군", name: "기장군", spot: "해동용궁사", icon: "seasideTemple" },
  { region: "부산광역시 사상구", name: "사상구", spot: "삼락생태공원", icon: "wetland" },
  { region: "부산광역시 동래구", name: "동래구", spot: "동래읍성지", icon: "fortress" },
  { region: "부산광역시 해운대구", name: "해운대구", spot: "해운대해수욕장", icon: "beach" },
  { region: "부산광역시 부산진구", name: "부산진구", spot: "부산시민공원", icon: "park" },
  { region: "부산광역시 연제구", name: "연제구", spot: "온천천시민공원", icon: "stream" },
  { region: "부산광역시 수영구", name: "수영구", spot: "광안리해수욕장", icon: "bridge" },
  { region: "부산광역시 사하구", name: "사하구", spot: "감천문화마을", icon: "houses" },
  { region: "부산광역시 서구", name: "서구", spot: "송도해수욕장", icon: "cableCar" },
  { region: "부산광역시 동구", name: "동구", spot: "168계단", icon: "stairs" },
  { region: "부산광역시 남구", name: "남구", spot: "이기대", icon: "cliff" },
  { region: "부산광역시 중구", name: "중구", spot: "보수동책방골목", icon: "books" },
  { region: "부산광역시 영도구", name: "영도구", spot: "태종대", icon: "lighthouse" },
];

export const regionName = (region: string) => region.replace(/^부산광역시\s*/, "");
