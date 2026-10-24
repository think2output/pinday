// 홈 블록 지도: 부산 16개 구·군을 비슷한 크기의 칸으로 위치만 맞춘 배치 (기획서 6-1)
// spot은 그 구의 대표 명소로, data/places/places.json에 있는 장소 이름이다.

export type MapIcon = "bridge" | "lighthouse" | "houses";

export type MapRegion = {
  /** 내 여행 정보에 저장하는 전체 이름 */
  region: string;
  name: string;
  spot: string;
  /** CSS grid 위치 (4열 × 5행) */
  col: string;
  row: string;
  /** 칸 안 선 그림. 아직 3칸만 있다 */
  icon?: MapIcon;
};

export const MAP_REGIONS: MapRegion[] = [
  { region: "부산광역시 강서구", name: "강서구", spot: "가덕도", col: "1", row: "2 / span 2" },
  { region: "부산광역시 북구", name: "북구", spot: "화명수목원", col: "2", row: "1" },
  { region: "부산광역시 금정구", name: "금정구", spot: "범어사", col: "3", row: "1" },
  { region: "부산광역시 기장군", name: "기장군", spot: "해동용궁사", col: "4", row: "1" },
  { region: "부산광역시 사상구", name: "사상구", spot: "삼락생태공원", col: "2", row: "2" },
  { region: "부산광역시 동래구", name: "동래구", spot: "동래읍성지", col: "3", row: "2" },
  { region: "부산광역시 해운대구", name: "해운대구", spot: "해운대해수욕장", col: "4", row: "2" },
  { region: "부산광역시 부산진구", name: "부산진구", spot: "부산시민공원", col: "2", row: "3" },
  { region: "부산광역시 연제구", name: "연제구", spot: "온천천시민공원", col: "3", row: "3" },
  { region: "부산광역시 수영구", name: "수영구", spot: "광안리해수욕장", col: "4", row: "3", icon: "bridge" },
  { region: "부산광역시 사하구", name: "사하구", spot: "감천문화마을", col: "1", row: "4 / span 2", icon: "houses" },
  { region: "부산광역시 서구", name: "서구", spot: "송도해수욕장", col: "2", row: "4" },
  { region: "부산광역시 동구", name: "동구", spot: "168계단", col: "3", row: "4" },
  { region: "부산광역시 남구", name: "남구", spot: "이기대", col: "4", row: "4" },
  { region: "부산광역시 중구", name: "중구", spot: "보수동책방골목", col: "2", row: "5" },
  { region: "부산광역시 영도구", name: "영도구", spot: "태종대", col: "3", row: "5", icon: "lighthouse" },
];

export const regionName = (region: string) => region.replace(/^부산광역시\s*/, "");
