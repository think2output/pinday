# PinDay 와이어프레임

화면 구조와 동작의 기준이에요. `docs/기획서.md`와 함께 봐요. 원본 캔버스: https://claude.ai/artifact/KxhfnXkTCzkQYBD7ckxZwD

## 이 파일들을 읽는 방법 (에이전트용)

- 회색 저충실도 와이어프레임이에요. **배치·순서·요소·동작을 따르고, 색·글꼴·사진은 따르지 않아요.** 디자인 기준은 아직 미정(`docs/DECISIONS.md` 참고).
- 파일은 캔버스 도구 전용 템플릿 형식이라 브라우저에서 바로 열면 깨질 수 있어요. 코드처럼 읽어서 구조를 파악해요.
  - `{{이름}}`: 아래 `<script>`의 `renderVals()`가 계산하는 값
  - `<sc-for list="{{목록}}" as="x">`: 목록을 반복해서 그림
  - `<sc-if value="{{조건}}">`: 조건이 참일 때만 보임
  - `<script>` 안의 `state`와 함수들이 화면 동작(선택, 담기, 이동 등)을 보여주는 예시 로직
- 대괄호 `[ ]` 문구는 실제 데이터가 들어갈 자리예요. 장소 이름은 예시예요.

## 파일 ↔ 화면

| 파일 | 화면 | 기획서 |
| --- | --- | --- |
| Main.dc.html | 홈 · 데스크톱 · 처음 온 사람 | 6-1 |
| Mobile-first.dc.html | 홈 · 휴대폰 · 처음 온 사람 | 6-1 |
| Mobile-return.dc.html | 홈 · 휴대폰 · 다시 온 사람 (내 여행 카드) | 6-1 |
| Random-rolling.dc.html, Random-result.dc.html | 랜덤 뽑기 (홈 안) | 6-2 |
| Taste-desktop.dc.html, Taste-mobile.dc.html | 취향 테스트 | 6-3 |
| Where-desktop.dc.html | 어디 갈까? · 데스크톱 | 6-4 |
| Where-mobile-sheet.dc.html, Where-mobile-preview.dc.html | 어디 갈까? · 휴대폰 (목록 서랍 / 핀 누름) | 6-4 |
| When-desktop.dc.html, When-mobile.dc.html, When-mobile-picker.dc.html | 언제 갈까? (⋯ 메뉴 포함) | 6-5 |
| How-desktop.dc.html, How-mobile.dc.html | 어떻게 갈까? | 6-6 |
| Weather-desktop.dc.html, Weather-mobile.dc.html | 날씨 대안 | 6-7 |
| DocentList-desktop.dc.html, DocentList-mobile.dc.html | AI 도슨트 목록 | 6-8 |
| Docent-desktop.dc.html, Docent-mobile.dc.html | AI 도슨트 상세 (휴대폰은 듣는 중) | 6-9 |
| Empty-where.dc.html, Empty-when.dc.html, Empty-weather.dc.html | 빈 상태 | 7 |
| DataFlow.dc.html | 데이터 연결 지도 (화면별 읽기·쓰기) | 5 |

## 와이어프레임 이후 바뀐 결정

- 어떻게 갈까?: 대중교통·도보는 ODsay가 아니라 **카카오맵 경로 API**를 써요(How-* 파일의 "출처: ODsay" 문구는 무시).
- 여행 초기화는 취향 유형까지 지워요.
