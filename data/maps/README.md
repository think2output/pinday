# 홈 부산 지도 경계

- 원본: [StatGarten / swcho/korea-maps](https://github.com/swcho/korea-maps)
- 고정 커밋: `d5f8ea3208f19a73a01f865847d20cc195ae91ba`
- 파일: `svg/simple/부산광역시_시군구_경계.svg`
- 원본 설명에 따르면 통계청 SGIS Open API로 수집한 **2020년** 행정구역 경계다. 최신 행정·법적 경계를 보증하는 지도로 표시하지 않는다.
- 저장소의 MIT 라이선스 원문은 `LICENSE`에 보관했다. 화면에서도 SGIS·StatGarten 출처를 표시한다.
- `busan-boundaries.json`은 원본 SVG의 16개 `path`를 그대로 추출했다. 해안선·섬·구의 상대 크기를 수동으로 바꾸지 않는다. `center`는 각 구의 가장 큰 폴리곤 내부에서 경계까지의 최소 거리가 큰 점을 탐색한 이름표 위치다. 오목한 구의 면적 중심이 옆 구로 빠지는 문제를 피한다.
- 사용자가 첨부한 상업용 지도 이미지는 모양을 비교하는 참고 자료일 뿐이며, 추적·복사·배포하지 않았다.
