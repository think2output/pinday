# lib/trip — 내 여행 정보 저장소

브라우저에 저장하는 "내 여행 정보"(지역·기간, 취향, 후보함, 일정)를 읽고 쓰는 코드(기획서 5장).
모든 화면은 이곳을 통해서만 내 여행 정보를 바꾼다. 공통 파일이라 바꿀 때는 먼저 사용자에게 묻는다.

| 파일 | 내용 |
| --- | --- |
| `types.ts` | `Trip` 모양, 취향 id |
| `dates.ts` | 날짜 계산, 기간 검사(지난 날짜 불가, 최대 14일) |
| `rules.ts` | 규칙(순수 함수): 담기, 일차에 넣기·옮기기·빼기·순서 바꾸기, 기간 바꾸기, 날씨 대안 바꾸기 |
| `store.ts` | 저장·화면 반영: `useTrip()`, `tripActions` |

## 화면에서 쓰는 법

```tsx
"use client";
import { useTrip, tripActions } from "@/lib/trip/store";
import { dayOf, unscheduled } from "@/lib/trip/rules";

const { trip, saved } = useTrip(); // saved가 false면 "자동으로 정했어요" 표시
tripActions.addCandidate(placeId); // 어느 화면에서 바꿔도 모든 화면에 바로 반영
const { error, notice } = tripActions.setPeriod(start, end); // notice가 있으면 알림으로 띄움
```

- 일정은 **일차 기준**(`days[0]` = 1일차)이다. 날짜는 `dateOfDay(trip.startDate, n)`으로 구한다.
- 아직 날짜 없는 곳 = `unscheduled(trip)`. 일차 고르기 창에서 이미 들어간 날은 `dayOf()`로 막는다.
- 초기화: `tripActions.reset()` 후 몇 초간 되돌리기 버튼 → `tripActions.undoReset()`. 확인 창 숫자는 `summary(trip)`.
- 자동 여행 날짜는 기기 시간 기준이라 서버 렌더와 하루 다를 수 있다. 날짜를 보여주는 부분은 화면이 브라우저에서 그려진 뒤 표시한다.
