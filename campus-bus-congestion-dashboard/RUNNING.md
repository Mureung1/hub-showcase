# 실행 방법

이 프로젝트는 루트가 아니라 `campus-bus-congestion-dashboard` 폴더에서 실행한다.

## 처음 한 번만

```powershell
cd "D:\New desktop\네이버\hub-N056-김진영-campus-flow\campus-bus-congestion-dashboard"
npm install
```

## 실행

```powershell
cd "D:\New desktop\네이버\hub-N056-김진영-campus-flow\campus-bus-congestion-dashboard"
npm run dev -- --host 127.0.0.1
```

브라우저에서 아래 주소로 접속한다.

```text
http://localhost:3000/
```

포트가 이미 사용 중이면 터미널에 표시되는 다음 포트(예: `3001`)로 접속한다.

## 공공데이터 갱신

`.env.local`에는 인증키와 공공데이터 API 설정을 저장한다. 파일은 Git에 올라가지 않는다.

```dotenv
DATA_GO_KR_SERVICE_KEY=발급받은_일반인증키
BUS_STOP_API_BASE_URL=https://apis.data.go.kr/1613000/BusStop
TRIP_VOLUME_API_BASE_URL=https://apis.data.go.kr/1613000/TripVolumebyStop
TRIP_VOLUME_OPR_YM=202509
BUS_STOP_OPR_YMD=20250801
```

공공데이터포털에서 다음 두 API의 개발계정 활용승인이 모두 완료되어야 한다.

- `국토교통부_정류장별 이용량`
- `국토교통부_버스정류장`

승인 상태부터 확인한다.

```powershell
npm run data:check
```

두 항목이 모두 `정상`이면 아래 순서로 한 번에 갱신한다.

```powershell
npm run data:map -- --date=20250801
npm run data:refresh -- --month=202509
npm run data:validate
npm run dev -- --host 127.0.0.1
```

- `data:map`: 앱 정류장명과 공공데이터 정류장명을 정확 일치 방식으로 연결한다.
- `data:refresh`: 월별 승·하차량을 받아 24시간 이용 집중도 점수를 만든다.
- `data:validate`: 24개 시간대, 0~100점 범위, 중복 ID, 인증키 미포함을 검사한다.
- 매핑 후보는 `reports/stop-mapping-candidates.json`에 기록된다.
- 정확히 연결되지 않은 정류장은 다른 정류장으로 대체하지 않고 `매핑 필요`로 남는다.

## 이번에 확인된 정상 상태

- 실행 스크립트: `npm run dev`
- 실제 서버: `vinext dev`
- 정상 접속 주소: `http://localhost:3000/`
- 응답 확인 결과: `200 OK`
- 현재 이용량 API: 정상
- 현재 버스정류장 매핑 API: 활용승인 전이면 `401` 또는 `403`

## 주의

- 상위 폴더에도 `package.json`이 있지만, 실제 확인한 앱은 `campus-bus-congestion-dashboard` 안에 있다.
- Windows에서 백그라운드 실행할 때는 `npm` 대신 `npm.cmd`를 써야 할 수 있다.
- 인증키를 프런트엔드 코드나 생성 JSON에 직접 넣지 않는다.
