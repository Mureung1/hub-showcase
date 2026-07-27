# Market API Integration

GAZUA의 시장 데이터 연동은 프론트엔드가 외부 API를 직접 호출하지 않고 NestJS 백엔드의
`/api/market/*` API만 호출하는 구조다. API Key와 Client Secret은 백엔드 환경변수로만 관리한다.

## 공식 문서 기준

- NAVER Developers News Search: https://developers.naver.com/docs/serviceapi/search/news/news.md
- NAVER API HUB News Search: https://api.ncloud-docs.com/docs/naver-api-hub-search-news
- Financial Modeling Prep Economic Calendar: https://site.financialmodelingprep.com/developer/docs/stable/economics-calendar
- Financial Modeling Prep Quickstart: https://site.financialmodelingprep.com/developer/docs/quickstart
- OpenDART 공시검색: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
- OpenDART 고유번호: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018
- OpenDART 기업개황: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002
- OpenDART 단일회사 주요계정: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016
- FRED series metadata: https://fred.stlouisfed.org/docs/api/fred/series.html
- FRED observations: https://fred.stlouisfed.org/docs/api/fred/series_observations.html
- FRED API key: https://fred.stlouisfed.org/docs/api/api_key.html
- Toss Securities docs: https://developers.tossinvest.com/docs
- Toss Securities OpenAPI JSON: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json

## Provider 역할

- `NaverNewsProvider`: NAVER Developers 또는 NAVER API HUB 뉴스 검색 호출.
- `FmpProvider`: FMP `/economic-calendar` 호출.
- `OpenDartProvider`: OpenDART `list.json`, `corpCode.xml`, `company.json`, `fnlttSinglAcnt.json` 호출.
- `FredProvider`: FRED `/series`, `/series/observations` 호출.
- `TossSecuritiesProvider`: OAuth2 Client Credentials 토큰 발급 후 시세/캔들/시장정보 조회.

Provider는 외부 응답 호출과 최소 검증만 맡고, 서비스가 정규화, 필터링, 중복 제거, 캐싱, 공통 응답 envelope을 담당한다.

## 환경변수

실제 값은 커밋하지 않는다.

```env
NAVER_API_MODE=API_HUB
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_API_HUB_KEY=

FMP_API_KEY=

OPEN_DART_API_KEY=

FRED_API_KEY=

TOSS_INVEST_CLIENT_ID=
TOSS_INVEST_CLIENT_SECRET=
```

시장 데이터 Provider 키는 optional이다. 키가 없으면 앱 부팅은 유지되고, 해당 Provider 호출 시
`PROVIDER_DISABLED` 오류를 반환한다.

## 백엔드 API

- `GET /api/market/news`
- `GET /api/market/news?category=MACRO&limit=20`
- `GET /api/market/calendar/economic`
- `GET /api/market/calendar/economic?from=2026-07-27&to=2026-08-02&country=US&importance=HIGH`
- `GET /api/market/disclosures`
- `GET /api/market/disclosures?symbol=005930&from=2026-07-01&to=2026-07-27&type=MAJOR`
- `GET /api/market/companies/005930`
- `GET /api/market/companies/005930/financials?year=2025&reportCode=11011`
- `GET /api/market/macro/series/CPIAUCSL`
- `GET /api/market/macro/indicators?names=CPI,UNEMPLOYMENT,FED_FUNDS_RATE`
- `GET /api/market/stocks/005930`
- `GET /api/market/stocks/005930/quote`
- `GET /api/market/stocks/005930/orderbook`
- `GET /api/market/stocks/005930/trades`
- `GET /api/market/stocks/005930/candles?interval=1d`
- `GET /api/market/stocks/005930/analysis?period=6m`
- `GET /api/market/exchange-rate`
- `GET /api/market/trading-calendar`
- `GET /api/market/indices`
- `GET /api/market/calendar?types=ECONOMIC,DISCLOSURE`

## 공통 응답

```ts
interface ApiResponse<T> {
  data: T
  meta: {
    provider?: string
    providers?: string[]
    updatedAt: string
    cached: boolean
    isDelayed?: boolean
  }
}
```

통합 캘린더처럼 여러 Provider를 조합하는 경우 `providers` 배열을 사용한다.

## 캐시 정책

- 뉴스: 5분
- 경제 캘린더: 10분
- 공시: 5분
- FRED 시계열: 1시간
- 주식 현재가/호가/체결: 짧은 TTL 15초
- 1분봉: 30초
- 일봉: 5분
- 종목 기본정보: 24시간
- 장 운영 캘린더: 12시간
- DART 기업코드: 24시간
- Toss OAuth Access Token: 실제 `expires_in` 기준, 만료 60초 전 갱신

현재는 NestJS 프로세스 메모리 기반 TTL 캐시다. `MarketCacheService`로 분리했기 때문에 Redis 도입 시 같은 인터페이스로 교체할 수 있다.

## 오류 처리

- 네트워크 오류와 5xx만 제한적으로 재시도한다.
- 4xx는 재시도하지 않는다.
- API Key와 Secret은 로그에 남기지 않는다.
- 외부 Provider 오류는 내부 표준 오류로 변환한다.
- OpenDART의 정상 HTTP 응답 안 `status` 오류 코드는 별도로 처리한다.
- 날짜 범위와 limit은 DTO와 서비스에서 제한한다.

## 프론트엔드 연결

`frontend/src/entities/market`에 TanStack Query hook을 추가했다.

- `useMarketNews()`
- `useEconomicCalendar()`
- `useMarketCalendar()`
- `useDisclosures()`
- `useMacroIndicators()`
- `useStockQuote()`
- `useStockCandles()`
- `useStockAnalysis()`

`MarketNewsPage`, `MarketCalendarPage`는 loading, empty, error, retry, provider metadata, delayed metadata를 표시한다.

프론트 API Base URL은 기본 `http://localhost:3000`이고, 필요하면 `VITE_API_BASE_URL`로 바꾼다.

## 테스트

외부 API는 테스트에서 직접 호출하지 않는다.

```bash
pnpm typecheck
pnpm test
```

추가된 테스트 범위:

- NAVER HTML 태그 제거, HTML entity 디코딩, 뉴스 중복 제거
- FMP 중요도 매핑, actual 존재 여부 기반 RELEASED/UPCOMING 판정
- OpenDART `status` 비즈니스 오류 처리와 공시 URL 매핑
- FRED `.` 결측값 처리
- Toss OAuth 토큰 동시 요청 캐싱
- Toss 캔들/현재가 정규화
- 이동평균, RSI, 변동성 등 기본 기술 지표 계산
- 프론트 뉴스/캘린더 Query 화면 렌더링

## 구현 제외

Toss Securities의 계좌, 잔고, 보유 종목, 매수 가능 금액, 주문, 주문 정정, 주문 취소, 조건 주문 API는 구현하지 않았다.
이번 작업 범위가 조회 전용이고, 실제 거래 기능은 계좌 식별자와 사용자 승인, 감사 로그, 주문 전 검증, 별도 권한 정책이 필요하기 때문이다.

## 남은 제약

- API Key가 없으면 Provider별 live 조회는 동작하지 않는다.
- FMP 무료 플랜은 경제 캘린더 접근 범위가 제한될 수 있다.
- Toss Securities Open API는 토스증권 계좌와 사전 신청, 허용 IP 설정이 필요할 수 있다.
- OpenDART 기업코드는 최초 조회 시 ZIP 다운로드와 파싱 비용이 있다.
- 분석 결과는 참고용 수치이며 매수/매도 판단이나 투자 권유를 반환하지 않는다.
