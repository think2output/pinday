# scripts — 내 컴퓨터에서 실행하는 스크립트

장소 목록 받기, 도슨트 근거 모으기·해설 만들기처럼 배포된 서비스가 아니라 개발자가 직접 돌리는 작업을 둔다.
결과는 `data/`에 저장한다. 키는 `.env`에서 읽는다.

도슨트 근거 수집: `node scripts/probe-heritage.mjs`로 소량 시험한 뒤 `node scripts/collect-docent-evidence.mjs`를 실행한다. 옵션·분류 기준·실제 API 확인 기록은 `data/docent/README.md` 참고.
