# HANDOFF — 지금 상태

마지막 업데이트: 2026-10-24 · 작성: Claude Code

## 현재 브랜치
`feat/project-setup` (← `docs/tech-stack` ← main). 둘 다 아직 GitHub에 안 올림(push 전), main에 합치기 전.

## 끝낸 것
- 레포 생성, `docs/기획서.md`, `docs/wireframes/`(화면 25개 + 안내서), 에이전트 규칙 파일 추가
- 기술 스택 결정: Next.js + TypeScript + Tailwind + Vercel, 데이터베이스 없이 JSON 파일 저장 (DECISIONS "기술 스택")
- 기본 폴더 구조 (AGENTS.md "폴더 구조"에 설명), `.env.example`, `.gitattributes`(줄바꿈 LF)
- 디자인 값 파일 `src/styles/tokens.css` — 값은 임시. 임시 홈 화면이 이 값으로 그려짐
- `npm run lint`, `npm run build` 통과

## 하다 만 것
- 없음. 임시 홈(`src/app/page.tsx`)은 홈 화면 작업 때 교체

## 다음 할 일 (순서대로)
1. 디자인 기준 정하기 (색·글꼴·둥글기·간격). 사용자가 디자인을 중요하게 여김 → 시각 예시 2~3개로 비교해서 고르게 할 것. 사용자가 참고 사이트를 찾아오기로 함. 정하면 DECISIONS에 기록하고 `src/styles/tokens.css` 값만 바꾼다
2. TourAPI·부산테마여행정보로 부산 장소 목록 받아보기 (`scripts/` → `data/places/`) → 실제 분류 이름 확인 → 취향 분류표·실내/야외 분류표 초안. 사용자의 `.env`(공공데이터포털 키) 필요
3. 내 여행 정보 저장소 `src/lib/trip/` (지역·기간, 취향, 후보함, 일정 + 초기화·되돌리기 + 기간 변경 규칙)
4. 이후 기획서 12장 개발 순서대로

## 사용자가 해둔 것
- 공공데이터포털 승인: 한국관광공사 국문 관광정보(TourAPI), 부산테마여행정보, 관광 빅데이터 지역별 방문자수, 기상청 단기예보(신청)
- 기상청 API허브(apihub.kma.go.kr)에서 단기예보 authKey 받음 → `.env`의 `KMA_APIHUB_AUTH_KEY`. 날씨 대안 작업 때 공공데이터포털 단기예보와 API허브 중 무엇을 쓸지 공식 문서 확인 후 정하고 DECISIONS에 기록
- 2026-10-24: 카카오 디벨로퍼스 가입 + 카카오맵 사용 설정 켬, 부산근현대역사관 아카이브 API 신청(승인 대기)
- 확인 필요: 카카오맵 대중교통·도보 경로 활성화, 비즈월렛 연결, 사이트 도메인 `http://localhost:3000` 등록
- 할 일: `.env.example`을 복사해 `.env` 만들고 키 채우기
- 아직: OpenAI(월 한도 먼저 설정), 카카오모빌리티, Vercel 가입·GitHub 연결(배포 단계에서)

## 주의
- 키는 레포에 없음. `.env`는 사용자가 직접 만든다. 서버 코드는 `requireEnv()`(`src/lib/server/env.ts`)로 키를 읽는다.
- 공공데이터포털 키는 Decoding(인코딩 안 된) 키를 `.env`에 넣기로 안내함. 호출 코드에서는 `URLSearchParams`로 주소를 만들어 한 번만 인코딩할 것(이중 인코딩하면 인증 오류).
- 디자인: 와이어프레임은 배치만 따르고, 색·글꼴은 tokens.css 이름만 쓴다. 화면 작업마다 390px·데스크톱 모습을 사용자에게 확인받을 것.
- `npm run dev`가 AGENTS.md 맨 아래 Next.js 안내 블록을 자동으로 다시 쓴다. 이미 커밋돼 있으니 지우지 말 것.
