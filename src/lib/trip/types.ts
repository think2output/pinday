// 내 여행 정보 (기획서 5장, DECISIONS "내 여행 정보")

export type TasteId = "alley" | "sunset" | "history" | "wave";

export type Trip = {
  version: 1;
  /** 고른 구·군. 시·도 전체 이름("부산광역시 수영구"). 비어 있으면 부산 전체 */
  regions: string[];
  /** 출발일·도착일, "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  /** auto = "부산 전체 + 내일부터 2박 3일" 자동으로 정한 기간 */
  periodSource: "auto" | "user";
  taste: TasteId | null;
  /** 후보함: 담은 장소 id, 담은 순서. 일정에 넣어도 남는다 */
  candidates: string[];
  /** 일정: days[0] = 1일차 장소 id 순서. 길이는 항상 여행 일수와 같다 */
  days: string[][];
};

/** 기간을 줄여서 날짜 없는 곳으로 옮겨진 장소 */
export type MovedOnShrink = { day: number; placeIds: string[] };
