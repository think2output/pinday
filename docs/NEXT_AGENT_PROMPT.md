PinDay 작업을 이어받아줘.

먼저 AGENTS.md와 아래 문서를 읽어줘. docs/HANDOFF.md부터 읽어.
- docs/HANDOFF.md
- docs/DECISIONS.md
- docs/기획서.md
- docs/wireframes/README.md
- docs/design/README.md
- docs/SCHEDULE_QA.md (가장 최근 작업)

git status·최근 커밋 5개와 원격 main의 병합 상태를 확인해줘. 언제 갈까?(/schedule)는 feat/schedule 브랜치에 구현돼 있어. fetch 후 이 브랜치가 main에 병합됐으면 최신 origin/main, 아직이면 origin/feat/schedule을 기준으로 새 작업 브랜치를 만들어. 로컬 main이 최신이라고 가정하지 마.

현재 상태:
- 홈·탐색(/explore)·일정(/schedule)·내 여행(/trip) 기능 완료. 마지막 검증은 테스트 98개·린트·빌드 통과.
- /schedule 디자인은 아직 사용자 검토 전이야. 기능 완료와 디자인 확정을 구분해줘.
- 홈의 큰 흰 내 여행 카드는 다시 넣지 마. 여행 요약·초기화는 /trip.
- 실제 지도 확인은 http://localhost:3000 으로 해줘.

다음 작업은 내가 정할게. 후보는 /schedule 피드백 반영, 도슨트 검수·생성, 어떻게 갈까?(/route), 날씨 대안(/weather), 취향 테스트야.

꼭 지킬 것:
- 기존 useTrip()/tripActions를 사용하고 저장소를 새로 만들지 마. useTrip() 화면은 <Suspense>로 감싸.
- 공통 파일(저장소·tokens.css·공통 컴포넌트) 수정이나 공통 코드 추출 전에는 먼저 물어봐.
- 색은 tokens.css 이름만. 둥근 카드·크림 배경·구분선 남발·영문 모노 라벨·형광펜 금지.
- 미검수 83곳을 이야기 있는 장소로 표시하거나 해설을 만들지 마.
- 반송공원(2907087) 좌표를 추측해 고치지 마.
- 키를 출력·커밋하지 말고 .vscode/는 건드리지 마.

지금 상태와 이번 작업 범위를 짧게 요약하고 내가 OK하면 시작해.
