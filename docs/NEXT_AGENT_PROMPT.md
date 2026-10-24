PinDay 작업을 이어받아줘.

먼저 AGENTS.md와 아래 문서를 읽어줘. docs/HANDOFF.md부터 읽어.
- docs/HANDOFF.md
- docs/DECISIONS.md
- docs/기획서.md (도슨트는 6-8, 6-9, 8, 11장)
- docs/wireframes/README.md
- docs/design/README.md
- data/docent/README.md, docs/docent-drafts-review.md (가장 최근 작업)

git status·최근 커밋 5개와 원격 main의 병합 상태를 확인해줘. 일정 화면은 PR #10으로 main에 있고, 근처 추천과 도슨트 초안은 feat/docent-drafts 브랜치에 있어. fetch 후 이 브랜치가 main에 병합됐으면 최신 origin/main, 아직이면 origin/feat/docent-drafts를 기준으로 새 작업 브랜치를 만들어. 로컬 main이 최신이라고 가정하지 마.

현재 상태:
- 홈·탐색·일정(근처 추천 포함)·내 여행 기능 완료. 마지막 검증은 테스트 110개·린트·빌드 통과.
- AI 도슨트(/docent)는 사용자가 승인한 6곳만 공개돼 있어. 새 해설은 AI가 원문 대조 결과를 짧은 표로 보고하고 내가 승인해야 공개해. 긴 문서를 나한테 읽으라고 하지 마.
- OpenAI는 선불 $5. 호출 전 비용을 알려주고 최소로 써.
- 홈의 큰 흰 내 여행 카드는 다시 넣지 마. 실제 지도 확인은 http://localhost:3000.

다음 작업은 내가 정할게. 후보는 도슨트 해설 확대, 어떻게 갈까?, 날씨 대안, 취향 테스트야.

꼭 지킬 것:
- 검수 안 된 해설·근거(충분 후보 83곳 포함)를 이야기 있는 장소로 표시하거나 공개하지 마.
- 기존 useTrip()/tripActions를 사용하고, useTrip() 화면은 <Suspense>로 감싸.
- 공통 파일(저장소·tokens.css·공통 컴포넌트) 수정 전에는 먼저 물어봐.
- 색은 tokens.css 이름만. 둥근 카드·크림 배경·구분선 남발·영문 모노 라벨·형광펜 금지.
- 키를 출력·커밋하지 말고 .vscode/는 건드리지 마.

지금 상태와 이번 작업 범위를 짧게 요약하고 내가 OK하면 시작해.
