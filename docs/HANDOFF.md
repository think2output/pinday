# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-24 · 작성: Codex
마지막 확인: `npm test`(25개), `npm run lint`(경고 없음), `npm run build` 모두 통과. `.vscode/`는 사용자 개인 편집기 설정이라 커밋하지 않음. 이번 작업은 로컬 수집 스크립트·데이터만 변경해 390px/데스크톱 화면 확인은 해당 없음.

## 현재 브랜치
`feat/docent-evidence` (← `docs/design-exploration` ← `feat/trip-store` ← `feat/place-data`). 이번 브랜치는 로컬 커밋 상태이며 아직 push하지 않음. 부모 브랜치들은 GitHub에 올림(push). 로컬 main은 아직 첫 기획 커밋 상태. main에 합치는 PR은 사용자가 만들고 합친다(gh CLI 계정은 레포 읽기 권한만 있음, git push는 됨). 마지막 브랜치가 앞의 것을 모두 포함한다.
- `docs/tech-stack`, `feat/project-setup`은 이전 단계 브랜치(로컬에만 있음, 위 브랜치에 포함)

## 끝낸 것
- 기획서·와이어프레임·에이전트 규칙, 기술 스택 결정(Next.js + TypeScript + Tailwind + Vercel, DB 없이 JSON 파일)
- 기본 폴더 구조(AGENTS.md "폴더 구조"), `.env.example`, `.gitattributes`, 디자인 값 파일 `src/styles/tokens.css`(값은 임시), `npm run lint`·`npm run build` 통과
- 키 확인 스크립트 `scripts/check-keys.mjs`: 공공데이터포털 키(TourAPI, 부산테마여행정보), 기상청 API허브 키 모두 정상
- 장소 원본 데이터 받기 `scripts/fetch-places.mjs` → `data/places/raw/` (관광지 351, 문화시설 125, 레포츠 60, 부산테마여행 247, 분류 이름표)
- 분류표 확정 `docs/분류표.md` (취향 유형 → 분류, 실내/야외, DECISIONS "장소 분류")
- 서비스용 장소 목록 `scripts/build-places.mjs` → `data/places/places.json` (408곳: 관광지 345 + 문화시설 63, 취향·실내 태그 포함)
- 기상청 API허브 단기예보 활용신청 완료, 키 확인 정상
- 내 여행 정보 저장소 `src/lib/trip/` (사용법은 그 폴더 README). 규칙 테스트 21개 `npm test` 통과. 화면에 붙여 브라우저에서 확인하는 건 아직(홈·어디 갈까? 작업 때)
- 도슨트 근거 수집(기획서 8장 1단계): `scripts/probe-heritage.mjs`로 국가유산청 3곳 소량 시험 후 `scripts/collect-docent-evidence.mjs`로 408곳 전체 수집. TourAPI detailCommon2 설명 + 1km 내 국가유산 XML 설명 + 부산 이야기 장소명 연결. 파라미터·필드는 실제 응답 확인. 사용법·출처·분류 규칙: `data/docent/README.md`.
- `data/docent/evidence/` 장소별 JSON 408개, 근거 2,727건. 충분 후보(검수 전) 191곳 / 소개만 216곳 / 직접 소개 원문 없음 1곳(해성아트베이) / 수집 오류 0곳. `data/docent/evidence-summary.json` 집계. 추가 테스트 4개(XML·거리·연결·분류), 총 25개 통과. 로컬 캐시 `data/docent/cache/`는 Git 제외.
- 홈 화면 디자인 시안 탐색 → 기록 `docs/design/README.md`(좋았던 것·싫었던 것), 확정 항목은 DECISIONS "디자인". **사용자가 디자인을 나중에 다시 잡기로 함**

## 하다 만 것
- 근거는 자동 수집·1차 분류 상태로 `humanReview: pending`. 해설 생성은 하지 않음. 충분 후보는 TourAPI 외 직접 연결된 추가 원문 300자 이상이라는 수집용 기준이며, 실제 해설 작성에 충분한지는 사람 검수가 필요함. 주변 유산은 `nearby-only`로 분리.
- **출처 충돌**: 25의용단(126814)은 TourAPI가 일제강점기 독립운동으로, 국가유산청은 임진왜란 순절 제단으로 설명. 원문·reviewNotes를 보존했으므로 해설 생성 전 반드시 확인.
- 디자인: 컨셉(핀 조명)·글꼴·홈 지도 인터랙션만 확정. 색·간격 최종값은 다시 잡을 때 정함. `src/styles/tokens.css`는 아직 예전 임시 값(청록 포인트, 기기 기본 글꼴) — 디자인 확정 때 바꾼다. 확정 글꼴(Wanted Sans, Pretendard)도 아직 프로젝트에 안 넣음
- 임시 홈(`src/app/page.tsx`)은 홈 화면 작업 때 교체
- 실내/야외 예외 장소 확인은 날씨 대안 작업 때 (`docs/분류표.md` 확인 후보 목록)

## 다음 할 일 (디자인과 상관없는 것부터)
1. 도슨트 근거 검수: 대표 장소의 출처 충돌·이야기 연결을 사람이 확인. 해설 생성(기획서 8장 2단계)은 OpenAI 키가 생긴 뒤. 부산근현대역사관 아카이브는 승인 후 추가.
2. 서버 API: 장소 목록·상세(`data/places/places.json` 제공), 날씨(기상청 API허브 단기예보 + 짧은 캐시)
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
