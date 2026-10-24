# 장소 목록·상세 API

`data/places/places.json`의 408곳을 서버에서 읽어 제공한다. 외부 API 호출·인증키·브라우저 여행 정보가 필요하지 않다. 데이터 갱신은 장소 JSON을 다시 만들고 커밋·배포하는 방식이다.

## 주소

| 요청 | 용도 |
| --- | --- |
| `GET /api/places` | 이름순 장소 목록. 기본 50곳씩 |
| `GET /api/places/126081` | 해당 ID의 상세 정보. 예시는 해운대해수욕장 |

목록 응답은 `{ items, total, offset, limit, nextOffset }`이다. `total`은 조건에 맞는 전체 개수, `nextOffset`은 다음 요청에 넣을 위치이며 마지막이면 `null`이다. `items` 각 항목과 상세 응답의 `place`는 장소 JSON과 같은 필드다: `id`, `name`, `region`, `address`, `lat`, `lng`, `kind`, `category`, `categoryCode`, `tastes`, `indoor`, `image`, `tel`, `modifiedAt`.

상세 응답은 `{ place }`이다. 장소 설명·해설·근거 원문은 이 API에 포함하지 않는다. 도슨트 해설이 아직 생성되지 않았으므로 ‘이야기 있음’ 조건도 아직 제공하지 않는다. 충분 근거 후보라는 분류를 이야기 공개 여부로 사용하지 않는다.

## 목록 조건

| 이름 | 값 / 동작 |
| --- | --- |
| `region` | `부산광역시 서구`처럼 전체 구·군 이름. 생략 또는 `부산광역시`는 부산 전체 |
| `category` | 장소 데이터의 `categoryCode`와 정확히 같은 코드. 예: `VE070100` |
| `q` | 장소 이름 부분 검색. 앞뒤·중간 공백과 영문 대소문자는 무시. 최대 100자. 빈 검색어는 전체 |
| `indoor` | `true` 실내, `false` 야외. 생략하면 모두. 기존 장소 분류표의 임시 예외 여부도 그대로 유지 |
| `taste` | `alley`, `sunset`, `history`, `wave`. 해당 취향의 장소를 먼저 정렬하고 나머지도 유지 |
| `sort` | `name` 또는 `taste`. 기본은 이름순, `taste`를 주면 기본 취향순. `sort=taste`에는 `taste`가 필수 |
| `bounds` | `서쪽경도,남쪽위도,동쪽경도,북쪽위도`. 예: `129.10,35.10,129.20,35.20`. 경계 포함 |
| `limit` | 1~500 정수. 기본 50. 현재 전체 지도용 목록은 `limit=500`으로 조회 가능 |
| `offset` | 0 이상의 안전한 정수. 기본 0. 끝을 넘으면 빈 배열과 `nextOffset: null` |

`region`, `category`는 같은 이름을 반복해 여러 값을 줄 수 있다. 같은 조건 안에서는 합집합, 서로 다른 조건끼리는 교집합이다. 중복된 같은 값은 결과를 복제하지 않는다. 지역 값에 `부산광역시`를 포함하면 전체 지역으로 읽는다. 서구와 강서구는 전체 이름으로 정확히 구분한다.

나머지 조건을 중복해 넣거나 알 수 없는 조건을 넣으면 400이다. 존재하지 않는 지역·분류 코드, 잘못된 취향·정렬·실내 값, 역전되거나 비정상인 지도 범위, 음수·소수 페이지 값도 400이다. 경도는 -180~180, 위도는 -90~90이며 서쪽≤동쪽·남쪽≤북쪽이다. 날짜 변경선을 가로지르는 범위는 지원하지 않는다.

```js
// 서구·중구에서 실내 장소를 취향순으로 조회
const params = new URLSearchParams({ indoor: "true", taste: "history" });
params.append("region", "부산광역시 서구");
params.append("region", "부산광역시 중구");
const response = await fetch(`/api/places?${params}`);
const result = await response.json();
// 다음 페이지는 같은 검색 조건을 유지하고 offset만 result.nextOffset으로 바꾼다.
```

조건이 정상인데 결과가 없으면 200과 빈 `items`를 반환한다. 취향에 맞는 장소끼리, 나머지 장소끼리는 각각 이름순이다. `taste=history&sort=name`은 필터 없이 이름순으로 돌려준다.

## 오류와 캐시

- 잘못된 목록 조건: HTTP 400, `{ error: { code: "INVALID_QUERY", field, message } }`.
- 없는 장소: HTTP 404, `{ error: { code: "PLACE_NOT_FOUND", message } }`.
- GET 외 지원하지 않는 방식: Next.js가 HTTP 405로 처리한다. HEAD/OPTIONS는 Next.js 기본 동작을 따른다.
- 정상 응답은 `Cache-Control: public, max-age=0, must-revalidate`, 400·404는 `no-store`다. 목록·상세 모두 배포된 JSON을 메모리에서 읽으며 외부 응답 캐시를 사용하지 않는다.
- `src/lib/server/places.ts`는 `server-only`로 보호한다. 브라우저는 API를 사용하며 서버 모듈이나 `.env`를 가져오지 않는다.

## 확인 기록 — 2026-10-24

설치된 Next.js 16.4.3의 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`와 `03-api-reference/03-file-conventions/route.md`를 읽고 구현했다. 상세 주소의 `params`는 Promise를 await하며 Cache Components 환경에서 실제 요청을 처리한다.

`npm test` 63개·린트·빌드 통과. 추가 테스트는 페이지 누락·중복, 정확한 지역 비교, 조건 결합, 이름 검색, 지도 경계, 취향 정렬, 잘못된 요청, 비동기 상세 주소와 JSON 오류 응답을 검증한다.

빌드된 서버를 로컬 전용 포트에서 실행해 전체 408곳(200), 서구 18곳, 해운대해수욕장 상세(200), 없는 장소(404), limit=0(400), POST(405)를 실제 HTTP 요청으로 확인했다. 화면 변경은 없어 390px·데스크톱 UI 검사는 이번 작업에 해당하지 않는다.
