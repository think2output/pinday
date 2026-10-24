# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-25 · 작성: Cursor 에이전트 (언제 갈까? + 근처 추천 + 도슨트 초안)

## 가장 먼저 알아둘 것

- **AI 도슨트 `/docent`·`/docent/[id]` 구현**, 브랜치 `feat/docent-drafts`(← `feat/schedule-nearby`). AI 초안 7곳 중 **사용자 승인 6곳 공개**(25의용단·범어사·감천문화마을·168계단·태종대·복천박물관), 해운대해수욕장은 한 문장뿐이라 비공개. 화면은 승인된 해설만 읽는다. 상세·확인: `docs/DOCENT_QA.md`. 생성 방법: `data/docent/README.md` "해설 초안".
- 사람 검수 방식(사용자 승인): AI가 문장별 원문 대조 결과를 짧은 표로 보고 → 사용자가 승인. 긴 검수 문서를 사용자에게 직접 읽히지 말 것.
- OpenAI 선불 $5. 7곳 생성 실제 비용 약 $0.002(`gpt-6-luna`). 다시 만들 땐 `--only`·`--budget`을 쓰고, 문서만 고칠 땐 `--report`(호출 없음).
- 근거 문단이 짧아 대부분 요약·관람 포인트만 있고 역사·동네·방문 정보는 비어 있다. 풍부한 해설을 원하면 사람 검수로 근거 문단을 더 골라야 한다(자동 충분 후보 83곳은 아직 미검수).
- **언제 갈까? `/schedule` 구현 완료**, PR #10으로 main 병합. 사용자가 화면을 보고 "전체적으로 괜찮다"고 확인했다. 세부 디자인(하단 버튼 위치 등)은 아직 확정 아님. 상세·확인 기록: `docs/SCHEDULE_QA.md`.
- 이어서 **근처 추천**을 `feat/schedule-nearby`에 추가·push(사용자 "괜찮다" 확인). 그날 일정 아래 직선 2km 안의 아직 담지 않은 곳 최대 3곳, 날짜 없는 곳은 가까운 순 정렬, 지도에 흰 동그라미.
- 마지막 검증: **테스트 110개·린트·빌드 통과**(도슨트 초안 검사 8개 포함). Chrome 390px·1440px(별도 프로필)에서 넣기·옮기기·빼기·끌기(마우스/터치)·키보드·빈 상태·날씨/지도 실패·기간 축소·새로고침·근처 추천 확인.
- 다음 작업 후보: 도슨트 해설 확대(근거 문단 검수 → 생성) / 어떻게 갈까?(`/route`) / 날씨 대안(`/weather`) / 취향 테스트·랜덤 뽑기. 헤더의 어떻게 갈까?·날씨 대안은 아직 404.
- 로컬 확인 주소는 **http://localhost:3000/**. `127.0.0.1:3000`에서는 카카오 지도 오류가 재현됐다.
- 홈 상단의 큰 흰 '내 여행 카드'는 사용자가 거절해 제거했다. 여행 요약·초기화·되돌리기는 **`/trip`**. 홈에 다시 올리지 말 것.

## Git 상태와 이어받는 기준

- 저장소: `https://github.com/think2output/pinday.git`.
- 2026-10-25 fetch 확인: 원격 main **`f8be055`** = PR #10(`feat/schedule`) 병합. 그 위에서 `feat/schedule-nearby`를 만들어 push했다.
- 그 위에 `feat/docent-drafts`를 만들어 push했다(근처 추천 커밋 포함). **main 병합은 사용자가 PR로 한다.** `feat/docent-drafts` PR 하나로 둘 다 합칠 수 있다. 다음 세션은 fetch 후 병합 여부를 확인하고, 들어갔으면 최신 `origin/main`, 아니면 `origin/feat/docent-drafts`에서 이어간다.
- `.vscode/`는 사용자 개인 설정(미추적). 커밋에서 제외. `.env`·키는 출력·커밋 금지.

## 구현된 화면·데이터

| 항목 | 현재 상태 / 코드 / 확인 문서 |
| --- | --- |
| 홈 `/` | 시안 C '어두운 전시실', 블록형 16개 구·군 지도·여행 기간·이야기 카드. `src/app/_home/` |
| 탐색 `/explore` | 장소 검색·분류·취향순·실제 카카오 지도·묶음 핀·후보함. '날짜에 배치하기'가 `/schedule`로 연결됨. `docs/EXPLORE_QA.md` |
| 일정 `/schedule` | 날짜 탭(강수 표시)·그날 일정·근처 추천·날짜 없는 곳(가까운 순)·그날 지도(순서 번호·점선·추천 흰 동그라미). `src/app/schedule/`. `docs/SCHEDULE_QA.md` |
| 내 여행 `/trip` | 기간·후보·일정 요약, 초기화·되돌리기, 이어서 계획하기. `src/app/trip/` |
| 여행 저장소 | `src/lib/trip/`. `useTrip()`과 `tripActions`. 이번 작업에서 수정 없음 |
| 장소 | 408곳, `data/places/places.json`, `/api/places`. `docs/PLACE_API.md` |
| 날씨 API | `/api/weather`. `docs/WEATHER_API.md`. 일정 화면은 부산 대표 격자로 호출 |
| AI 도슨트 `/docent` | 승인 해설 6곳 목록·상세(근거 번호 펼침·듣기·후보함·일정 넣기·카카오맵 길찾기). `src/app/docent/`, `src/lib/server/docent.ts`. `docs/DOCENT_QA.md` |
| 이야기·도슨트 데이터 | 홈 이야기 임시 4편. 근거 408곳(충분 후보 83곳 미검수). 해설 7곳(`data/docent/drafts/`, 승인 6·비공개 1). 스크립트 `scripts/generate-docent-drafts.mjs` |

## 일정 화면에서 정한 것 (자세히는 SCHEDULE_QA)

- 저장은 기존 `tripActions`만. 일차 기준 저장 규칙 그대로(`days[0]`=1일차, 하루에 한 번, 일정에서 빼도 후보함 유지).
- 탐색 폴더의 `kakao.ts`·`mapCoordinates.ts`·`ConditionsEditor.tsx`를 **수정 없이 가져다 씀**(사용자 승인). 공통 폴더로 옮기는 것은 아직 안 함 — 옮기려면 사용자 확인.
- 끌기는 라이브러리 없이 직접 구현(`DayList.tsx`, 포인터 이벤트). 키보드 ↑↓, ⋯ 메뉴의 순서 앞으로/뒤로도 제공.
- 날씨 표시: 예보 전·자료 없음·판단 불가·실패·지난 날짜를 '비 없음'으로 바꾸지 않는다. 계산은 `scheduleModel.ts`(테스트 있음).
- 이동 확인·날씨 확인 버튼은 비활성 '준비 중'. 휴대폰 하단 고정 대신 지도 아래 일반 위치(와이어프레임과 다름, 사용자 검토 필요).
- ⋯ 메뉴의 이야기 보기: 승인 해설이 있는 장소만 `/docent/[id]` 링크, 나머지는 비활성 '이야기 준비 중'.
- 근처 추천: 좌표 직선거리(`distanceKm`)만 쓰고 걸리는 시간은 쓰지 않는다. 기준 2km·최대 3곳은 `scheduleModel.ts`의 `NEARBY_KM`·`limit`. 좌표가 잘못된 장소는 기준·추천에서 제외. 도슨트 검수 후 "이야기 있는 곳 우선" 같은 기준을 더할지는 그때 결정.

## 사용자 확인이 필요한 것

- `/schedule` 디자인(탭 모양, 목록 밀도, 지도 크기, 하단 버튼 위치) 검토.
- 실제 휴대폰에서 ⋮⋮ 끌기 감도.
- 헤더의 어떻게 갈까?·날씨 대안·AI 도슨트 메뉴는 아직 화면이 없어 404. 준비 중 안내로 바꿀지는 공통 컴포넌트(SiteHeader) 수정이라 사용자 확인 필요.

## 디자인·구현 주의 (계속 유효)

- `src/styles/tokens.css` 이름만 사용. 제목 Wanted Sans·본문 Pretendard, 모서리 0, 흰 바탕·먹색·노란 조명 하나. 둥근 카드·크림 바탕·구분선 남발·영문 모노 라벨·형광펜 금지. `docs/design/README.md`.
- `useTrip()`을 쓰는 화면은 `<Suspense>`로 감싸야 빌드된다.
- Next.js 16.4.3(cacheComponents 켜짐)·React 19.3.0. 작성 전 `node_modules/next/dist/docs/` 확인. AGENTS.md의 Next 안내 블록을 지우지 않는다.
- vitest에는 `@/` 경로 별칭이 없다. 테스트 대상 파일은 상대 경로로 import.
- 반송공원(2907087) 원본 좌표가 부산 밖. 추측해 고치지 말고 지도에서만 제외(탐색·일정 모두 적용됨).
- 사진 공공누리 3유형은 자르거나 기울이거나 덧칠하지 않는다. 지역 비교는 전체 이름으로.
- 브라우저 확인은 별도 Chrome 프로필로 한다(사용자 저장 정보를 덮어쓰지 않음).

## 아직 구현하지 않은 것·미정

- `/route`, `/weather`, `/taste` 화면, 랜덤 뽑기, 탐색의 이야기 필터, 도슨트의 최근 소식·공식 음성(이용 조건 확인 필요).
- 홈 첫 문구, '이번 주 부산 이야기' 선정 기준, 지도 나머지 13칸 그림.
- 도슨트 해설 확대: `data/docent/README.md`, `docs/docent-evidence-review.md`. 충분 후보 83곳을 공개 이야기로 취급하지 않는다. 해운대·백제병원·석당박물관·부산근현대역사관 아카이브 보완 필요.
- 대중교통·도보 유료 API는 `/route` 전 재결정 필요. 실내/야외 예외 장소는 날씨 대안 때 검토.
- OpenAI 키/월 한도, 카카오모빌리티, Vercel 연결은 아직. 부산근현대역사관 아카이브는 마지막 기록상 승인 대기.

## 참고 문서와 세션 마무리

- 최초 인수: `AGENTS.md`, 이 파일 → `docs/DECISIONS.md` → `docs/기획서.md` → `docs/wireframes/README.md` → `docs/design/README.md`.
- API 계약: `docs/PLACE_API.md`, `docs/WEATHER_API.md`. 여행 저장소: `src/lib/trip/README.md`.
- 확인 기록: `docs/HOME_QA.md`, `docs/EXPLORE_QA.md`, `docs/SCHEDULE_QA.md`.
- 세션 끝에는 검증 결과·남은 문제를 이 파일에 반영하고 커밋. 새 결정만 DECISIONS에 추가. main 직접 push·force push·다른 브랜치 삭제 금지.
