# 도슨트 근거 자료

해설 생성 전 단계의 원문 모음이다. AI 해설·음성은 생성하지 않았다.

대표 10곳의 AI 1차 검수: `docs/docent-evidence-review.md`, 기계가 읽을 수 있는 문단·제외 출처 기록: `data/docent/reviews/representative-2026-10-24.json`. 범위 제한 초안 후보 7곳·자료 보완 2곳·보류 1곳이며 사람 최종 검수는 아직이다. 기존 자동 집계는 변경하지 않았다. 수집 원문에 HTML 속성 연결·별칭 누락 등이 있어 생성 전 수집 규칙 보완과 재집계가 필요하다.

## 실행

프로젝트 루트에서 Node.js로 실행한다. 브라우저에서는 실행하거나 가져오지 않는다.

```sh
node scripts/probe-heritage.mjs
node scripts/collect-docent-evidence.mjs --limit=3
node scripts/collect-docent-evidence.mjs
```

- `.env`의 `DATA_GO_KR_SERVICE_KEY`(Decoding 키)가 필요하다. 국가유산 API는 키 없이 XML로 호출한다.
- `--limit=N`: 목록 앞 N곳 시험. 집계는 `evidence-summary-sample.json`에 따로 저장한다.
- 기본은 `cache/`의 성공 응답 재사용. 월 갱신은 `--refresh`로 다시 받는다. 테마여행 원본은 `node scripts/fetch-places.mjs`로 먼저 갱신한다.
- 타임아웃 30초, 오류 최대 4회 재시도. 개별 상세 실패는 장소의 `errors`에 남기고 계속 수집하며 마지막 종료코드는 1이다. 목록 전체 수집 실패는 즉시 중단한다.
- 캐시는 로컬 실행 산출물로 Git에 넣지 않는다. 검수 대상인 장소별 JSON·집계·소량 시험 결과만 커밋한다.

## 파일과 필드

- `evidence/{장소id}.json`: 장소별 `evidence` 배열, 분류, 검수 주의, 수집 오류.
- 근거마다 `id`, `provider`, `source`, `title`, `originalText`, `url`, `relation`을 저장한다. 원문 HTML은 보존한다. 화면에서 표시할 때 원문을 그대로 HTML로 실행하면 안 된다.
- `same-place`: 장소명으로 직접 연결한 자료. `nearby-only`: 좌표로만 가까운 유산. 근처 유산의 역사를 해당 장소의 역사로 옮겨 쓰면 안 된다.
- TourAPI·부산테마여행 링크는 키를 뺀 API 원문 주소로, 직접 호출하려면 개인 인증키가 필요하다. 테마여행은 UC_SEQ로 원문을 조회할 수 있음을 실제 확인했다. 외부 공개 웹페이지 주소는 추측해 만들지 않았다.
- 부산테마여행은 기존 `data/places/raw/busan-theme-travel.json`(247편)을 사용한다. 원본 수집 일시 필드가 없어 `unknown`으로 두고 SHA-256으로 사용한 파일을 식별한다.
- 국가유산은 본문만 수집한다. 이미지·나레이션은 이용 조건을 확인하기 전에는 사용하지 않는다.

## 분류 기준 — 자동 집계이며 사람 검수 전

| 저장 값 | 의미 |
| --- | --- |
| `sufficient-candidate` | 근거가 충분한 **검수 후보**. TourAPI 외에 장소와 직접 연결된 국가유산 설명 또는 부산 이야기 원문이 공백·태그 제외 300자 이상 있음 |
| `introduction-only` | 위 추가 근거 기준을 만족하지 않음. 주변 유산이 있어도 소개만 분류에 남을 수 있음 |
| `no-direct-evidence` | 장소를 직접 설명하는 원문이 없음. 주변 유산 자료만 있는 경우도 포함 |
| `collection-incomplete` | API 수집 오류가 남아 있어 분류 보류 |

300자는 작업용 보수적 분류 기준이며 사실 정확성·해설 완성도를 보증하지 않는다. `humanReview: pending` 상태다. 이야기 전체에 장소명이 한 번만 나오는 경우도 있으므로 해당 장소를 설명하는 부분을 사람이 확인해야 한다. ‘소개만’에는 짧은 추가 자료가 있는 곳도 포함된다.

장소 연결은 괄호 설명·공백·이름 앞 ‘부산’을 정규화한 뒤 비교한다. 국가유산은 이름 일치, 부산 이야기는 PLACE/MAIN_PLACE/MAIN_TITLE/TITLE의 이름 일치 또는 4글자 이상 전체 장소명이 본문에 명시된 경우만 연결한다. 짧은 이름의 본문 부분 일치, 좌표만 가까운 이야기, 유사한 이름 추측 연결은 하지 않는다. 이 때문에 놓치는 자료는 검수 후 별도 규칙으로 보완해야 한다.

**알려진 충돌:** 25의용단(`126814`)은 TourAPI의 ‘일제강점기 독립운동’ 설명과 국가유산청의 ‘임진왜란 순절 제단’ 설명이 충돌한다. 양쪽 원문을 보존하고 `reviewNotes`에 표시했다. 해설 생성 전에 반드시 확인한다.

## API 확인 기록 (2026-10-24)

공식 공개 API의 실제 응답으로 필드·파라미터·페이지 처리를 확인했다. 인증키가 든 요청은 저장·출력하지 않는다.

- [TourAPI detailCommon2](https://apis.data.go.kr/B551011/KorService2/detailCommon2?contentId=126814&MobileOS=ETC&MobileApp=PinDay&_type=json): `contentId`, `MobileOS`, `MobileApp`, `_type=json`, 별도 `serviceKey`. `response.header.resultCode=0000`, `body.items.item`의 `contentid`, `overview`, `modifiedtime` 확인. 예전 버전의 overviewYN 같은 파라미터는 사용하지 않음.
- [국가유산 부산 목록](https://www.khs.go.kr/cha/SearchKindOpenapiList.do?ccbaCtcd=21&pageUnit=100&pageIndex=1): `totalCnt`, `pageUnit`, `pageIndex`, `item`의 식별자 3개·좌표·해제 여부 확인. 부산 633건. 인접 울산(`26`) 179건·경남(`38`) 2,639건도 실제 지역명 응답으로 확인.
- [국가유산 상세 예시](https://www.khs.go.kr/cha/SearchKindOpenapiDt.do?ccbaKdcd=23&ccbaCtcd=21&ccbaAsno=0000120000000): `ccbaKdcd`, `ccbaCtcd`, `ccbaAsno`를 목록 값 그대로 전달. 13자리 번호의 앞자리 0 보존. XML `item.content`는 CDATA. 상세 식별자가 요청과 같은지도 검사.
- 국가유산 API에 반경 파라미터를 추측해서 넣지 않았다. 부산·울산·경남 목록의 위도·경도로 Haversine 직선거리를 계산해 **계산값 1,000m 이하**만 연결한다. 표시 거리만 반올림한다. `0,0`/비정상 좌표·해제 유산은 제외한다. 좌표 없는 자료는 근처 검색에서 빠지는 제한이 있다.
- [부산테마여행 개별 원문 예시](https://apis.data.go.kr/6260000/RecommendedService/getRecommendedKr?UC_SEQ=58&pageNo=1&numOfRows=1&resultType=json): 별도 `ServiceKey` 필요. 실제 응답 `totalCount=1`, `UC_SEQ=58` 확인. 기존 전체 수집 원본의 PLACE, MAIN_PLACE, TITLE, ITEMCNTNTS 필드를 사용.

`heritage-probe.json`에 대표 3곳의 상세 XML 원문·거리·요청 주소를 남겼다. 범어사 55건(당간지주 52m·조계문 53m), 25의용단 8건(25의용단 56m·수영야류 82m), 해운대해수욕장 0건을 먼저 시험한 뒤 전체 수집했다.

## 전체 수집 결과 (2026-10-24)

| 분류 | 장소 수 |
| --- | ---: |
| 근거 충분 후보 — 사람 검수 전 | 191 |
| 소개만 있음 — 추가 근거 기준 미달 | 216 |
| 직접 소개 원문 없음 | 1 |
| 수집 실패 | 0 |
| 합계 | 408 |

근거 2,727건. TourAPI 소개가 있는 장소 407곳, 1km 이내 국가유산 원문이 연결된 장소 243곳, 부산 이야기와 연결된 장소 187곳(중복 포함). 직접 소개 원문이 없는 1곳은 해성아트베이(`3451794`). 상세 집계는 `evidence-summary.json` 참고.
