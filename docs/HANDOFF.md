# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-24 · 작성: Codex
마지막 확인: `npm test`(63개), `npm run lint`(경고 없음), `npm run build` 모두 통과. 빌드된 서버의 장소 API 실제 HTTP 조회·400/404/405 응답 확인. `.vscode/`는 사용자 개인 편집기 설정이라 커밋하지 않음. 이번 작업은 서버 API만 변경해 390px/데스크톱 화면 확인은 해당 없음.

## 현재 브랜치
`feat/places-api` (← `fix/docent-evidence-matching` ← `docs/docent-evidence-review` ← `feat/docent-evidence` ← `docs/design-exploration` ← `feat/trip-store` ← `feat/place-data`). API·수정·검수·수집 브랜치는 로컬 커밋 상태이며 아직 push하지 않음. `docs/design-exploration`까지는 GitHub에 올림(push). 로컬 main은 아직 첫 기획 커밋 상태. main에 합치는 PR은 사용자가 만들고 합친다(gh CLI 계정은 레포 읽기 권한만 있음, git push는 됨). 마지막 브랜치가 앞의 것을 모두 포함한다.
- `docs/tech-stack`, `feat/project-setup`은 이전 단계 브랜치(로컬에만 있음, 위 브랜치에 포함)

## 끝낸 것
- 장소 API: `GET /api/places` 목록·조건 필터·취향순·페이지 나누기, `GET /api/places/[id]` 상세. JSON 408곳을 서버 전용 모듈에서 제공하며 외부 API·키·브라우저 여행 정보에 의존하지 않음. 정확한 지역 비교·지도 경계·오류·정렬 등 새 테스트 33개, 전체 63개 통과. 사용법·HTTP 확인 기록: `docs/PLACE_API.md`. 도슨트 해설/원문은 이 API에 포함하지 않음.
- 기획서·와이어프레임·에이전트 규칙, 기술 스택 결정(Next.js + TypeScript + Tailwind + Vercel, DB 없이 JSON 파일)
- 기본 폴더 구조(AGENTS.md "폴더 구조"), `.env.example`, `.gitattributes`, 디자인 값 파일 `src/styles/tokens.css`(값은 임시), `npm run lint`·`npm run build` 통과
- 키 확인 스크립트 `scripts/check-keys.mjs`: 공공데이터포털 키(TourAPI, 부산테마여행정보), 기상청 API허브 키 모두 정상
- 장소 원본 데이터 받기 `scripts/fetch-places.mjs` → `data/places/raw/` (관광지 351, 문화시설 125, 레포츠 60, 부산테마여행 247, 분류 이름표)
- 분류표 확정 `docs/분류표.md` (취향 유형 → 분류, 실내/야외, DECISIONS "장소 분류")
- 서비스용 장소 목록 `scripts/build-places.mjs` → `data/places/places.json` (408곳: 관광지 345 + 문화시설 63, 취향·실내 태그 포함)
- 기상청 API허브 단기예보 활용신청 완료, 키 확인 정상
- 내 여행 정보 저장소 `src/lib/trip/` (사용법은 그 폴더 README). 규칙 테스트 21개 `npm test` 통과. 화면에 붙여 브라우저에서 확인하는 건 아직(홈·어디 갈까? 작업 때)
- 도슨트 근거 수집(기획서 8장 1단계): `scripts/probe-heritage.mjs`로 국가유산청 3곳 소량 시험 후 `scripts/collect-docent-evidence.mjs`로 408곳 전체 수집. TourAPI detailCommon2 설명 + 1km 내 국가유산 XML 설명 + 부산 이야기 장소명 연결. 파라미터·필드는 실제 응답 확인. 사용법·출처·분류 규칙: `data/docent/README.md`.
- `data/docent/evidence/` 장소별 JSON 408개(스키마 v2), 연결 자료 2,658건(주변·언급·제외 포함). 충분 후보(검수 전) 83곳 / 소개만 324곳 / 직접 소개 원문 없음 1곳(해성아트베이) / 수집 오류 0곳. `data/docent/evidence-summary.json` 집계. 전체 글 기준 191곳에서 문단 기준 83곳으로 보완. 이전 연결 80건 제거·11건 추가(확인된 별칭 연결 7건 포함). `data/docent/evidence-comparison.json` 비교표. 로컬 캐시 `data/docent/cache/`는 Git 제외.
- 대표 10곳 AI 1차 검수: `docs/docent-evidence-review.md`와 `data/docent/reviews/representative-2026-10-24.json`. 범위 제한 초안 후보 7곳·자료 보완 2곳·보류 1곳. 선택 문단·출처 제외 이유·원문 SHA-256 기록. 검수의 선택 범위는 유지하고 수집 규칙 v2의 자동 집계는 별도로 갱신함. 사람 최종 검수·해설 생성은 아직.
- 수집 규칙 v2: HTML 파서로 본문/속성 구분·문단별 판별·mentioned-only 분리. 검수로 확인한 석당박물관/옛백제병원 별칭만 명시. 검수 선택 문단 9건·제외 13건 적용, 알려진 오류/지난 행사 이야기 격리. 출처별 원문 변경 시 재검수로 전환해 충분 근거에서 제외. 테스트는 XML·거리·실제 오연결·문단 혼입·변경된 검수의 회귀 사례를 포함해 총 30개 통과. API 응답은 기존 성공 캐시를 사용.
- 홈 화면 디자인 시안 탐색 → 기록 `docs/design/README.md`(좋았던 것·싫었던 것), 확정 항목은 DECISIONS "디자인". **사용자가 디자인을 나중에 다시 잡기로 함**

## 하다 만 것
- 근거는 자동 수집·1차 분류 상태로 `humanReview: pending`. 해설 생성은 하지 않음. 충분 후보는 TourAPI 외 직접 설명 문단 하나가 300자 이상이라는 수집용 기준이며, 실제 해설 작성에 충분한지는 사람 검수가 필요함. 주변 유산은 `nearby-only`, 단순 언급은 `mentioned-only`로 분리. 문단 판별은 제한된 패턴이므로 의미·사실 전체를 검증한 것이 아님.
- **출처 충돌**: 25의용단(126814)은 TourAPI가 일제강점기 독립운동으로, 국가유산청은 임진왜란 순절 제단으로 설명. 원문·reviewNotes를 보존했으므로 해설 생성 전 반드시 확인.
- 검수에서 발견한 HTML 속성 연결·비교/주차장 언급·별칭 누락은 수집 규칙 v2에 반영. 이야기 1363의 지정종류 충돌과 2617의 지난 행사는 격리. 857은 ‘속성만 언급’이라는 최초 검수 설명이 부정확해 ‘본문의 감천 문화마을도 아니고라는 비교 언급’으로 정정함. 생성기는 아직 없으므로 향후에도 review 상태·선택 문단·원문 해시를 반드시 반영해야 함.
- 디자인: 컨셉(핀 조명)·글꼴·홈 지도 인터랙션만 확정. 색·간격 최종값은 다시 잡을 때 정함. `src/styles/tokens.css`는 아직 예전 임시 값(청록 포인트, 기기 기본 글꼴) — 디자인 확정 때 바꾼다. 확정 글꼴(Wanted Sans, Pretendard)도 아직 프로젝트에 안 넣음
- 임시 홈(`src/app/page.tsx`)은 홈 화면 작업 때 교체
- 실내/야외 예외 장소 확인은 날씨 대안 작업 때 (`docs/분류표.md` 확인 후보 목록)

## 다음 할 일 (디자인과 상관없는 것부터)
1. 도슨트 후속: 대표 검수의 선택 문단·제한을 사용자에게 확인받고, OpenAI 키 준비 후 소수 장소부터 해설 시험 생성·검수. 생성기는 선택 문단·제외/재검수/미검수 상태·출처 해시를 반드시 적용해야 함. 백제병원 건립/개원 연혁·석당박물관 별칭 연결 자료의 상세 검수는 아직. 부산근현대역사관 아카이브는 승인 후 추가.
2. 다음 서버 API: 날씨(기상청 API허브 단기예보 + 짧은 캐시). 장소 목록·상세는 완료(`docs/PLACE_API.md`).
3. 디자인 다시 잡기 (`docs/design/README.md`의 "다시 잡을 때 할 일" 따를 것) → 공통 화면 조각·홈 화면
4. 이후 기획서 12장 개발 순서대로 (어디 갈까? → 언제 갈까? → 도슨트 목록·상세 …)

## 사용자가 해둔 것
- 공공데이터포털 승인: 한국관광공사 국문 관광정보(TourAPI), 부산테마여행정보, 관광 빅데이터 지역별 방문자수
- 기상청 API허브(apihub.kma.go.kr) 키 → `.env`의 `KMA_APIHUB_AUTH_KEY`. 동네예보(단기예보) `VilageFcstInfoService_2.0` 등 활용신청 완료
- 카카오: 무료 기능만 켬. 대중교통·도보 경로 API는 유료라 안 켬 → 어떻게 갈까? 대중교통·도보 방식 다시 정해야 함(기획서 6-6, 개발 10단계 전까지). 사이트 도메인 `http://localhost:3000` 등록 여부 확인 필요
- 부산근현대역사관 아카이브 API 신청(승인 대기)
- `.env` 만들고 공공데이터포털·카카오·기상청 API허브 키 넣음
- 아직: OpenAI(월 한도 먼저 설정), 카카오모빌리티, Vercel 가입·GitHub 연결(배포 단계에서)

## 주의
- 키는 레포에 없음. 서버 코드는 `requireEnv()`(`src/lib/server/env.ts`)로, 스크립트는 `process.loadEnvFile(".env")`로 키를 읽는다.
- 공공데이터포털 키는 Decoding 키. 호출 주소는 `URLSearchParams`로 만들어 한 번만 인코딩할 것(이중 인코딩하면 인증 오류).
- 공공데이터포털은 가끔 `APPLICATION_ERROR`를 돌려준다. 다시 시도하면 된다(`fetch-places.mjs`의 `getJson` 참고).
- 사진 공공누리 3유형(변경금지)이 190곳. 자르거나 덧칠 금지.
- 지역(구·군)으로 거를 때는 `region` 값을 정확히 같은지 비교할 것. `endsWith("서구")`는 강서구까지 걸린다.
- 디자인: 와이어프레임은 배치만 따르고, 색·글꼴은 tokens.css 이름만 쓴다. 화면 작업마다 390px·데스크톱 모습을 사용자에게 확인받을 것. 사용자가 싫어하는 것(구분선 남발, 둥근 모서리, 형광펜, 영문 모노 라벨 등)은 `docs/design/README.md` 표 참고.
- `npm run dev`가 AGENTS.md 맨 아래 Next.js 안내 블록을 자동으로 다시 쓴다. 이미 커밋돼 있으니 지우지 말 것.
