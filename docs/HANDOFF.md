# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-24 · 작성: Claude Code

## 현재 브랜치
`feat/place-data` (← `feat/project-setup` ← `docs/tech-stack` ← main). 모두 아직 GitHub에 안 올림(push 전), main에 합치기 전.

## 끝낸 것
- 기획서·와이어프레임·에이전트 규칙, 기술 스택 결정(Next.js + TypeScript + Tailwind + Vercel, DB 없이 JSON 파일)
- 기본 폴더 구조(AGENTS.md "폴더 구조"), `.env.example`, `.gitattributes`, 디자인 값 파일 `src/styles/tokens.css`(값은 임시), `npm run lint`·`npm run build` 통과
- 키 확인 스크립트 `scripts/check-keys.mjs`: 공공데이터포털 키(TourAPI, 부산테마여행정보), 기상청 API허브 키 모두 정상
- 장소 원본 데이터 받기 `scripts/fetch-places.mjs` → `data/places/raw/` (관광지 351, 문화시설 125, 레포츠 60, 부산테마여행 247, 분류 이름표)
- 분류표 확정 `docs/분류표.md` (취향 유형 → 분류, 실내/야외, DECISIONS "장소 분류")
- 서비스용 장소 목록 `scripts/build-places.mjs` → `data/places/places.json` (408곳: 관광지 345 + 문화시설 63, 취향·실내 태그 포함)
- 기상청 API허브 단기예보 활용신청 완료, 키 확인 정상

## 하다 만 것
- 임시 홈(`src/app/page.tsx`)은 홈 화면 작업 때 교체
- 실내/야외 예외 장소 확인은 날씨 대안 작업 때 (`docs/분류표.md` 확인 후보 목록)

## 다음 할 일 (순서대로)
1. 디자인 기준 정하기. 사용자가 참고 사이트를 찾는 중. 시각 예시 2~3개로 비교해서 고르게 할 것. 정하면 DECISIONS 기록 + `src/styles/tokens.css` 값만 바꾼다
2. 내 여행 정보 저장소 `src/lib/trip/` (지역·기간, 취향, 후보함, 일정 + 초기화·되돌리기 + 기간 변경 규칙). 디자인과 상관없어서 디자인 결정을 기다리는 동안 먼저 해도 됨
3. 이후 기획서 12장 개발 순서대로 (홈 → 어디 갈까? → …)

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
- 디자인: 와이어프레임은 배치만 따르고, 색·글꼴은 tokens.css 이름만 쓴다. 화면 작업마다 390px·데스크톱 모습을 사용자에게 확인받을 것.
- `npm run dev`가 AGENTS.md 맨 아래 Next.js 안내 블록을 자동으로 다시 쓴다. 이미 커밋돼 있으니 지우지 말 것.
