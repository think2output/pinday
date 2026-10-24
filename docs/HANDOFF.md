# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-25 · 작성: Codex (내 여행 별도 페이지 분리)
마지막 확인: 사용자 피드백으로 홈의 큰 흰 내 여행 카드를 제거하고 /trip 페이지로 분리. Chrome 390px·1440px에서 저장된 여행이 있어도 홈 첫 화면에 카드가 없고, /trip 요약·초기화·되돌리기·빈 상태 동작 확인. 공통 헤더의 내 여행 링크 변경은 사전 확인 질문 후 답변 대기. `npm test` 85개·린트·빌드 통과. 기존 홈 동작 점검을 포함한 자세한 결과는 `docs/HOME_QA.md`. 수정 후 사용자 화면 확인은 대기. 이전 날씨 API 실제 확인은 `docs/WEATHER_API.md`. `.vscode/`는 개인 설정으로 커밋하지 않음.

## 현재 브랜치
`fix/trip-page` (← `feat/home-trip-card` ← `fix/home-interactions` ← `feat/home-design`). 사용자 피드백을 반영해 홈 카드 제거 및 별도 페이지 분리. 이 수정 브랜치는 로컬 커밋, 아직 push하지 않음. 아래는 이전 브랜치 기록. 이전 홈 동작 수정 `c180eaf`·공통 헤더 수정 `16d6066` 포함. 2026-10-24 `git fetch origin` 확인 결과 원격 main `8f98ab8`은 PR #6을 병합했지만 부모가 `7d7ea37`이라 시안까지만 포함. 디자인 값·글꼴 `6c789f4`, 홈 구현 `54ccf09`, 문서 `84551eb`·`dd2253d`는 main에 없었음. 2026-10-25 사용자 요청으로 이 브랜치의 구현·문서 커밋을 원격에 push. 홈 동작 수정과 내 여행 카드까지 모두 포함하므로 main 병합은 이 브랜치로 PR을 만들면 됨. main 병합은 아직 하지 않음.

이전 기록:
`feat/weather-api` (← `feat/places-api` ← `fix/docent-evidence-matching` ← `docs/docent-evidence-review` ← `feat/docent-evidence` ← `docs/design-exploration` ← `feat/trip-store` ← `feat/place-data`). 현재 작업 브랜치를 GitHub에 올림(push). `feat/places-api`도 push했으며 이전 단계의 모든 커밋을 포함함. 로컬 main은 아직 첫 기획 커밋 상태. main에 합치는 PR은 사용자가 만들고 합친다(gh CLI는 읽기 권한만 있고 git push는 가능). 마지막 브랜치가 앞의 작업을 모두 포함한다.
- `docs/tech-stack`, `feat/project-setup`은 이전 단계 브랜치(로컬에만 있음, 위 브랜치에 포함)
- 현재 원격 저장소: `https://github.com/think2output/pinday.git`. 구현 마지막 커밋은 `f9e5736`(날씨 API). 그 아래 `9c21cbb`(장소 API), `b3bd67d`(근거 연결 보완), `3f64d88`(대표 검수), `37bfd70`(근거 수집)을 모두 포함하며, 개별 과거 브랜치를 다시 합칠 필요 없음.
- 사용자 요청으로 이 세션을 마무리함. 구현 변경은 모두 커밋·푸시했고, 마지막으로 인계 문서만 갱신·커밋·푸시한다. 다음 세션 시작 시 원격 main의 최신 병합 상태를 다시 확인하고, 미병합이면 이 브랜치를 기준으로 새 작업 브랜치를 만든다.

## 끝낸 것
- 내 여행 별도 페이지: `src/app/trip/page.tsx`·`_components/TripView.tsx`·`TripSummary.tsx`·`TripReset.tsx`. 홈의 큰 흰 카드는 사용자 확인 후 제거. 요약·초기화·10초 되돌리기는 /trip에서 제공하고 홈 기간 창에는 여행 관리 링크만 둠. 공통 헤더 연결 변경 승인과 수정 화면 사용자 확인은 남음.
- 홈 동작 점검: 두 화면 크기에서 구 선택·전체 해제·기간 창·저장 유지 확인. 키보드·터치·기간 축소도 확인. 조명으로 생기는 가로 넘침과 닫기 버튼 누름 영역 수정. 사용자 승인 후 공통 헤더 누름 영역 44px 이상으로 확대. 결과 `docs/HOME_QA.md`.
- 홈 화면 구현(시안 C): `src/app/page.tsx` → `src/app/_home/`(HomeView·BusanMap·TripConditions·StoryShelf·regions). 공통 상단 메뉴 `src/components/SiteHeader.tsx`. 지역은 여행 저장소 setRegions, 기간은 그 자리의 작은 창에서 setPeriod. 시작 버튼은 /explore(아직 없음). 홈 데이터 `src/lib/server/home.ts`(+테스트 5개), 이야기 데이터 `scripts/build-stories.mjs` → `data/stories/stories.json`.
- 홈 디자인 재정리: 시안 3개(A 백색 전시실·B 아웃라인·C 어두운 전시실) 비교 → **C 확정**, 휴대폰·데스크톱 시안 완성. 원본 `docs/design/home-c-mobile.dc.html`, `home-c-desktop.dc.html`, 캔버스 링크와 좋았던 것·뺀 것은 `docs/design/README.md` 2차 정리, 확정 값은 DECISIONS "디자인".
- 날씨 API: `GET /api/weather?placeId=...&startDate=YYYY-MM-DD&days=1~14`. 기상청 API허브 단기예보 전체 페이지·KST 최신 발표·공식 좌표 변환·5분 성공 캐시·동시 요청 합치기·오류 구분 구현. 예보 기간 이후와 기간 안 결측을 구별하고 온도/강수 결측은 null로 보존. 일정은 변경하지 않음. 사용법·공식 근거·실제 응답 확인: `docs/WEATHER_API.md`. 날씨 테스트 17개 추가, 전체 80개 통과.
- 장소 API: `GET /api/places` 목록·조건 필터·취향순·페이지 나누기, `GET /api/places/[id]` 상세. JSON 408곳을 서버 전용 모듈에서 제공하며 외부 API·키·브라우저 여행 정보에 의존하지 않음. 정확한 지역 비교·지도 경계·오류·정렬 등 새 테스트 33개, 전체 63개 통과. 사용법·HTTP 확인 기록: `docs/PLACE_API.md`. 도슨트 해설/원문은 이 API에 포함하지 않음.
- 기획서·와이어프레임·에이전트 규칙, 기술 스택 결정(Next.js + TypeScript + Tailwind + Vercel, DB 없이 JSON 파일)
- 기본 폴더 구조(AGENTS.md "폴더 구조"), `.env.example`, `.gitattributes`, 디자인 값 파일 `src/styles/tokens.css`(값은 임시), `npm run lint`·`npm run build` 통과
- 키 확인 스크립트 `scripts/check-keys.mjs`: 공공데이터포털 키(TourAPI, 부산테마여행정보), 기상청 API허브 키 모두 정상
- 장소 원본 데이터 받기 `scripts/fetch-places.mjs` → `data/places/raw/` (관광지 351, 문화시설 125, 레포츠 60, 부산테마여행 247, 분류 이름표)
- 분류표 확정 `docs/분류표.md` (취향 유형 → 분류, 실내/야외, DECISIONS "장소 분류")
- 서비스용 장소 목록 `scripts/build-places.mjs` → `data/places/places.json` (408곳: 관광지 345 + 문화시설 63, 취향·실내 태그 포함)
- 기상청 API허브 단기예보 활용신청 완료, 키 확인 정상
- 내 여행 정보 저장소 `src/lib/trip/` (사용법은 그 폴더 README). 규칙 테스트 21개 `npm test` 통과. 홈에 연결해 지역·기간·카드·초기화·되돌리기는 브라우저 확인 완료. 후보 담기·일정 편집은 어디 갈까?·언제 갈까? 구현 때 확인
- 도슨트 근거 수집(기획서 8장 1단계): `scripts/probe-heritage.mjs`로 국가유산청 3곳 소량 시험 후 `scripts/collect-docent-evidence.mjs`로 408곳 전체 수집. TourAPI detailCommon2 설명 + 1km 내 국가유산 XML 설명 + 부산 이야기 장소명 연결. 파라미터·필드는 실제 응답 확인. 사용법·출처·분류 규칙: `data/docent/README.md`.
- `data/docent/evidence/` 장소별 JSON 408개(스키마 v2), 연결 자료 2,658건(주변·언급·제외 포함). 충분 후보(검수 전) 83곳 / 소개만 324곳 / 직접 소개 원문 없음 1곳(해성아트베이) / 수집 오류 0곳. `data/docent/evidence-summary.json` 집계. 전체 글 기준 191곳에서 문단 기준 83곳으로 보완. 이전 연결 80건 제거·11건 추가(확인된 별칭 연결 7건 포함). `data/docent/evidence-comparison.json` 비교표. 로컬 캐시 `data/docent/cache/`는 Git 제외.
- 대표 10곳 AI 1차 검수: `docs/docent-evidence-review.md`와 `data/docent/reviews/representative-2026-10-24.json`. 범위 제한 초안 후보 7곳·자료 보완 2곳·보류 1곳. 선택 문단·출처 제외 이유·원문 SHA-256 기록. 검수의 선택 범위는 유지하고 수집 규칙 v2의 자동 집계는 별도로 갱신함. 사람 최종 검수·해설 생성은 아직.
- 수집 규칙 v2: HTML 파서로 본문/속성 구분·문단별 판별·mentioned-only 분리. 검수로 확인한 석당박물관/옛백제병원 별칭만 명시. 검수 선택 문단 9건·제외 13건 적용, 알려진 오류/지난 행사 이야기 격리. 출처별 원문 변경 시 재검수로 전환해 충분 근거에서 제외. 테스트는 XML·거리·실제 오연결·문단 혼입·변경된 검수의 회귀 사례를 포함해 총 30개 통과. API 응답은 기존 성공 캐시를 사용.
- 홈 화면 디자인 시안 탐색 → 기록 `docs/design/README.md`(좋았던 것·싫었던 것), 확정 항목은 DECISIONS "디자인". **사용자가 디자인을 나중에 다시 잡기로 함**

## 하다 만 것
- 근거는 자동 수집·1차 분류 상태로 `humanReview: pending`. 해설 생성은 하지 않음. 충분 후보는 TourAPI 외 직접 설명 문단 하나가 300자 이상이라는 수집용 기준이며, 실제 해설 작성에 충분한지는 사람 검수가 필요함. 주변 유산은 `nearby-only`, 단순 언급은 `mentioned-only`로 분리. 문단 판별은 제한된 패턴이므로 의미·사실 전체를 검증한 것이 아님.
- **출처 충돌**: 25의용단(126814)은 TourAPI가 일제강점기 독립운동으로, 국가유산청은 임진왜란 순절 제단으로 설명. 원문·reviewNotes를 보존했으므로 해설 생성 전 반드시 확인.
- 검수에서 발견한 HTML 속성 연결·비교/주차장 언급·별칭 누락은 수집 규칙 v2에 반영. 이야기 1363의 지정종류 충돌과 2617의 지난 행사는 격리. 857은 ‘속성만 언급’이라는 최초 검수 설명이 부정확해 ‘본문의 감천 문화마을도 아니고라는 비교 언급’으로 정정함. 생성기는 아직 없으므로 향후에도 review 상태·선택 문단·원문 해시를 반드시 반영해야 함.
- 디자인: 홈 방향(C 어두운 전시실)·색·모서리·글꼴을 tokens.css와 layout.tsx에 반영함. 세로 간격·글자 크기 단계는 홈 구현하며 정리. Pretendard 가변 글꼴이 약 2MB라 나중에 화면 속도를 보고 나눠 받기(subset) 검토
- 홈의 "이번 주 부산 이야기"는 임시 목록. 랜덤 뽑기는 입구만(준비 중). 이야기 카드에서 도슨트로 가는 버튼은 도슨트 화면이 생기면 추가
- /trip은 구현됨. 공통 헤더의 내 여행 링크를 /trip으로 바꾸는 것은 승인 대기. 그 외 메뉴·취향 테스트·시작 버튼의 목적 화면(/explore 등)은 아직 없음
- 실내/야외 예외 장소 확인은 날씨 대안 작업 때 (`docs/분류표.md` 확인 후보 목록)

## 다음 할 일
1. (끝남) tokens.css·글꼴 반영, 홈 구현. 디자인 값 이름은 `src/styles/tokens.css` 맨 위 설명 참고. 화면 코드에 색 코드 직접 쓰지 말 것.
2. 홈의 큰 흰 여행 카드는 채택하지 않아 제거하고 /trip으로 분리. 공통 헤더의 내 여행 링크 변경 허용 답변과 화면 사용자 확인이 남음(`docs/HOME_QA.md`). 다음 구현은 어디 갈까? → 언제 갈까? 순서로 여행 저장소와 API 연결. /explore·/schedule이 아직 없어 시작/이어서 계획하기의 실제 이동 흐름은 해당 화면 구현 때 확인. 홈 지도 칸은 그림 없이도 동작. 화면마다 390px·데스크톱 확인. API 계약은 `docs/PLACE_API.md`, `docs/WEATHER_API.md`.
3. 나머지 13칸 지도 선 그림, 홈 첫 문구(사용자가 다시 쓰기로 함)는 홈 구현 중이나 후에.
4. 도슨트는 별도 후속: 대표 검수의 선택 문단·제한을 사용자에게 확인받고, OpenAI 키 준비 후 소수 장소부터 해설 시험 생성·검수. 생성기는 선택 문단·제외/재검수/미검수 상태·출처 해시를 반드시 적용해야 함. 자동 충분 후보 83곳을 공개 가능한 이야기로 취급하지 않는다. 백제병원 연혁·석당박물관 연결 자료의 상세 검수와 부산근현대역사관 아카이브 승인 후 보완은 아직.
5. 이후 기획서 12장의 개발 순서·QA 기준대로 진행.

## 이번 세션 결정 기록
- 2026-10-25 사용자 피드백: 홈에 큰 흰 여행 카드 표시 금지, 별도 /trip 관리 화면으로 분리. DECISIONS·디자인 README·와이어프레임 README에 반영.
- 2026-10-25 내 여행 카드 표시 조건·10초 되돌리기·핀 표시 개수·일정 막대 기준은 DECISIONS "홈 내 여행 카드"에 기록.
- 2026-10-24 홈 디자인 방향(C 어두운 전시실)·색·모서리·지도 칸 그림 방식은 DECISIONS "디자인"에 추가. 첫 문구와 간격 체계는 미정으로 남김.
- 근거 수집 규칙 v2, 장소 API 계약, 날씨 API·캐시 동작은 `docs/DECISIONS.md`에 2026-10-24 날짜로 반영돼 있음. 세션 종료 정리에서 새로 추가한 제품 결정은 없음.

## 사용자가 해둔 것
- 공공데이터포털 승인: 한국관광공사 국문 관광정보(TourAPI), 부산테마여행정보, 관광 빅데이터 지역별 방문자수
- 기상청 API허브(apihub.kma.go.kr) 키 → `.env`의 `KMA_APIHUB_AUTH_KEY`. 동네예보(단기예보) `VilageFcstInfoService_2.0` 등 활용신청 완료
- 카카오: 무료 기능만 켬. 대중교통·도보 경로 API는 유료라 안 켬 → 어떻게 갈까? 대중교통·도보 방식 다시 정해야 함(기획서 6-6, 개발 10단계 전까지). 사이트 도메인 `http://localhost:3000` 등록 여부 확인 필요
- 부산근현대역사관 아카이브 API 신청(승인 대기)
- `.env` 만들고 공공데이터포털·카카오·기상청 API허브 키 넣음
- 아직: OpenAI(월 한도 먼저 설정), 카카오모빌리티, Vercel 가입·GitHub 연결(배포 단계에서)

## 주의
- 여행 저장소 `useTrip()`은 오늘 날짜(new Date)를 읽어서, cacheComponents 설정에서는 미리 만드는 화면에 넣으면 빌드가 실패한다. 그 화면을 `<Suspense>`로 감쌀 것(홈 page.tsx 참고). 저장소 쪽에서 근본적으로 고치려면 공통 파일이라 사용자 확인 후.
- 헤드리스 크롬의 기본 창 폭은 500px 아래로 줄지 않는다. 이전에는 390px iframe을 사용했고, 이번에는 DevTools Protocol의 기기 화면 크기 모의 기능으로 390px 확인함.
- 키는 레포에 없음. 서버 코드는 `requireEnv()`(`src/lib/server/env.ts`)로, 스크립트는 `process.loadEnvFile(".env")`로 키를 읽는다.
- 공공데이터포털 키는 Decoding 키. 호출 주소는 `URLSearchParams`로 만들어 한 번만 인코딩할 것(이중 인코딩하면 인증 오류).
- 공공데이터포털은 가끔 `APPLICATION_ERROR`를 돌려준다. 다시 시도하면 된다(`fetch-places.mjs`의 `getJson` 참고).
- 사진 공공누리 3유형(변경금지)이 190곳. 자르거나 덧칠 금지.
- 지역(구·군)으로 거를 때는 `region` 값을 정확히 같은지 비교할 것. `endsWith("서구")`는 강서구까지 걸린다.
- 디자인: 와이어프레임은 배치만 따르고, 색·글꼴은 tokens.css 이름만 쓴다. 화면 작업마다 390px·데스크톱 모습을 사용자에게 확인받을 것. 사용자가 싫어하는 것(구분선 남발, 둥근 모서리, 형광펜, 영문 모노 라벨 등)은 `docs/design/README.md` 표 참고.
- `npm run dev`가 AGENTS.md 맨 아래 Next.js 안내 블록을 자동으로 다시 쓴다. 이미 커밋돼 있으니 지우지 말 것.
