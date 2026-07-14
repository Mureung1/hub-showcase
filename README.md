# GAZUA

AI와 대화하며 시황과 관심 종목을 이해하고, 투자 판단에 필요한 근거를 만드는
초보 투자자용 주식 판단 보조 서비스입니다.

## 1. 프로젝트 개요

주식 초보자에게 부족한 것은 정보의 양보다 정보를 해석하는 기준입니다. 뉴스, 차트,
금리, 환율처럼 흩어진 정보가 많아도 현재 시장이나 종목의 상황을 이해하지 못하면 감이나
추천에 의존해 투자하기 쉽습니다.

GAZUA는 사용자가 현재 시황이나 관심 종목을 질문하면 AI가 다음 내용을 구조적으로
정리해 제공합니다.

- 현재 시장 또는 종목 상태의 요약
- 상승 가능성을 뒷받침하는 근거
- 하락 가능성과 투자 리스크
- 상황에 따라 선택할 수 있는 시나리오
- 어려운 금융 용어에 대한 초보자 관점의 설명

GAZUA는 특정 종목의 매수나 매도를 지시하거나 수익을 보장하는 서비스가 아닙니다.
사용자가 충분한 근거와 리스크를 비교하고 스스로 판단할 수 있도록 돕는 것이 목표입니다.
MVP는 AI 시황·종목 질의응답과 근거·리스크·시나리오 제공에 집중하며, 자동 매매와 증권사
계좌 연동은 포함하지 않습니다.

## 2. 기술 스택

| 영역            | 기술                    | 선택 이유                                                                    |
| --------------- | ----------------------- | ---------------------------------------------------------------------------- |
| UI              | React                   | 선언형 컴포넌트 모델과 풍부한 생태계를 활용해 복잡한 화면 상태를 구성합니다. |
| 언어            | TypeScript              | API, 상태, 컴포넌트 경계의 타입 오류를 개발 단계에서 발견합니다.             |
| 개발 환경       | Vite                    | 빠른 개발 서버와 간결한 빌드 설정을 제공합니다.                              |
| 패키지 관리     | pnpm                    | 콘텐츠 주소 기반 저장소로 설치 공간을 절약하고 의존성을 엄격하게 관리합니다. |
| 스타일          | Emotion                 | 컴포넌트와 스타일을 함께 관리하면서 동적 스타일과 타입을 활용합니다.         |
| 라우팅          | React Router            | URL과 페이지 상태를 연결하고 페이지 단위 코드 분할을 지원합니다.             |
| 서버 상태       | TanStack Query          | 요청 상태, 캐시, 재시도, 무효화를 컴포넌트의 UI 상태와 분리합니다.           |
| 클라이언트 상태 | Zustand                 | 작은 API로 전역 UI 상태를 관리하고 불필요한 구조를 줄입니다.                 |
| HTTP            | Axios                   | 공통 설정, 인터셉터, 오류 처리를 HTTP 클라이언트 계층에 모읍니다.            |
| 검증            | Zod                     | 외부 데이터와 사용자 입력을 런타임에 검증하고 TypeScript 타입을 추론합니다.  |
| 아이콘          | Lucide React            | 일관된 형태와 접근 가능한 React 아이콘 컴포넌트를 제공합니다.                |
| 테스트          | Vitest, Testing Library | Vite 설정을 공유하면서 사용자 관점의 컴포넌트 동작을 검증합니다.             |
| 정적 분석       | ESLint                  | 잠재적인 오류와 React Hook 사용 문제를 코드 실행 전에 발견합니다.            |
| 포맷팅          | Prettier                | 코드 모양에 대한 논쟁을 줄이고 저장 시 일관된 형식을 적용합니다.             |

## 3. 프로젝트 구조와 아키텍처

### Feature-Sliced Design

프로젝트는 아래 FSD 레이어를 사용합니다.

```text
src/
├── app/       # 앱 초기화, Provider, Router, 전역 스타일
├── pages/     # 라우트 단위 페이지 조합
├── widgets/   # 페이지의 독립적인 대형 UI 영역
├── features/  # 사용자의 구체적인 행동과 유스케이스
├── entities/  # 핵심 비즈니스 엔티티와 데이터 표현
└── shared/    # 도메인에 의존하지 않는 공통 코드
```

의존성은 다음과 같이 상위 레이어에서 하위 레이어 방향으로만 흐릅니다.

```text
app
↓
pages
↓
widgets
↓
features
↓
entities
↓
shared
```

하위 레이어는 상위 레이어를 참조하지 않습니다. 이 규칙은 기능 변경이 다른 영역으로
연쇄 전파되는 것을 막고 각 Slice를 독립적으로 테스트하기 쉽게 만듭니다.

각 Slice는 필요에 따라 다음 Segment를 가질 수 있습니다.

```text
entities/market/
├── api/       # 요청 함수, 요청/응답 타입, Query Hook
├── model/     # 도메인 타입, 상태, 계산 로직
├── ui/        # 엔티티를 표현하는 UI
├── lib/       # Slice 내부 보조 로직
├── config/    # Slice 설정과 상수
└── index.ts   # 외부에 공개하는 Public API
```

### FSD Import 규칙

다른 Slice의 코드는 최상위 `index.ts` Public API를 통해서만 가져옵니다.

```ts
// 올바른 예시
import { MarketCard } from '@/entities/market'

// 잘못된 예시
import { MarketCard } from '@/entities/market/ui/MarketCard'
```

내부 경로를 직접 참조하지 않으면 파일 배치를 바꿔도 외부 호출부가 함께 깨지는 문제를
줄일 수 있습니다. 과도한 Barrel Export는 순환 의존성을 만들 수 있으므로 각 FSD
Slice의 최상위 `index.ts`에서만 사용합니다.

### 상태와 데이터 소유권

서버 상태, 클라이언트 상태, 컴포넌트 지역 상태를 구분합니다.

| 데이터                          | 관리 도구                    | 예시                                                 |
| ------------------------------- | ---------------------------- | ---------------------------------------------------- |
| 서버에서 조회하는 상태          | TanStack Query               | 시장 정보, 뉴스, AI 분석 기록, 포트폴리오, 관심 종목 |
| 여러 화면이 공유하는 UI 상태    | Zustand                      | 선택 종목, 사이드바, 테마, WebSocket 연결 상태       |
| 한 컴포넌트에서만 사용하는 상태 | React `useState`             | 입력 열림 여부, 임시 선택값                          |
| 고빈도 실시간 데이터            | WebSocket 또는 차트 인스턴스 | 현재가, 체결, 실시간 캔들 갱신                       |

TanStack Query의 데이터를 Zustand에 다시 복사하지 않습니다. 같은 서버 데이터를 두
저장소에 보관하면 어느 데이터가 최신 상태인지 판단하기 어려워지기 때문입니다.

### 실시간 시세 데이터

실시간 가격 데이터는 일반 API 데이터와 분리합니다.

- 최초 캔들 조회는 Axios와 TanStack Query를 사용합니다.
- 현재가와 체결 데이터는 WebSocket으로 수신합니다.
- 실시간 차트는 차트 인스턴스의 `update`를 사용합니다.
- WebSocket 연결 상태는 Zustand에서 관리합니다.

WebSocket 틱이 들어올 때마다 전체 Query Cache를 갱신하지 않습니다.

```ts
// 잘못된 예시
socket.onmessage = (event) => {
  queryClient.setQueryData(MarketQueryKeys.candles(symbol, interval), JSON.parse(event.data))
}
```

고빈도 데이터로 Query Cache를 계속 변경하면 불필요한 렌더링과 캐시 연산이 발생할 수
있습니다. Query Cache는 서버에서 조회한 데이터의 수명과 동기화에 사용하고, 실시간
렌더링 경로는 별도로 유지합니다.

## 4. 코드 컨벤션

### React 컴포넌트

#### 일반 컴포넌트 네이밍

모든 React 컴포넌트는 `PascalCase`를 사용합니다. 일반 컴포넌트는 ES6 Arrow
Function과 Named Export로 선언합니다.

```tsx
// 올바른 예시
export const MarketCard = () => {}

// 잘못된 예시
export const marketCard = () => {}
export function marketCard() {}
```

Arrow Function을 사용하면 일반 컴포넌트와 함수 선언문을 사용하는 페이지 컴포넌트를
시각적으로 구분할 수 있고, 프로젝트 전체의 선언 방식을 일관되게 유지할 수 있습니다.

#### Props 타입 네이밍

컴포넌트 Props는 `interface`로 선언하고 이름은 `컴포넌트명Props`로 작성합니다.
`React.FC`는 사용하지 않고 구조 분해한 Props에 직접 타입을 지정합니다.

```tsx
// 올바른 예시
export interface MarketCardProps {
  symbol: string
  price: number
}

export const MarketCard = ({ symbol, price }: MarketCardProps) => {
  return <div>{`${symbol}: ${price}`}</div>
}
```

```tsx
// 잘못된 예시
export type MarketCardProps = {}

export const MarketCard: React.FC<MarketCardProps> = () => {}
```

`React.FC`를 사용하지 않으면 Props 타입이 직접 노출되고 불필요한 타입 래핑 없이 반환
타입과 제네릭을 명확하게 관리할 수 있습니다. 단, Union Type과 함수 타입에는 `type`을
사용합니다.

```ts
export type TradeDirection = 'LONG' | 'SHORT' | 'NEUTRAL'
export type ChartInterval = '1m' | '5m' | '1h' | '4h' | '1d'
```

#### 페이지 컴포넌트

페이지 컴포넌트는 함수 선언문과 Default Export를 사용합니다.

```tsx
export default function MarketPage() {}
```

페이지는 코드 분할과 Lazy Loading의 진입점으로 사용합니다.

```tsx
const MarketPage = lazy(() => import('@/pages/market/MarketPage'))
```

Default Export를 사용하면 별도의 모듈 변환 없이 동적 import를 간결하게 작성할 수
있습니다. 일반 컴포넌트에서는 Named Export를 사용하며 Default Export는 페이지
컴포넌트에서만 허용합니다.

#### 컴포넌트 디렉터리

독립적으로 사용되는 컴포넌트는 별도 디렉터리를 가집니다. 테스트와 스타일, Public
API를 컴포넌트 가까이에 배치합니다.

```text
MarketCard/
├── index.ts
├── MarketCard.tsx
├── MarketCard.styles.ts
├── MarketCard.test.tsx
└── MarketCard.stories.tsx   # Storybook을 사용하는 경우
```

`index.ts`는 해당 컴포넌트를 외부에 공개하는 Public API 역할만 담당합니다.

```ts
export { MarketCard } from './MarketCard'
export type { MarketCardProps } from './MarketCard'
```

서로 밀접하게 관련된 하위 컴포넌트는 같은 디렉터리에 배치합니다.

```text
TradingChart/
├── TradingChart.tsx
├── ChartToolbar.tsx
├── ChartLegend.tsx
└── index.ts
```

관련 코드가 함께 변경되도록 배치하는 응집도 원칙과 Common Closure Principle을
따릅니다. 작은 하위 컴포넌트를 기계적으로 별도 Slice나 디렉터리로 분리하지 않습니다.

#### 이벤트 함수 네이밍

Props로 전달되는 이벤트는 `on`으로 시작하고, 컴포넌트 내부에서 이벤트를 처리하는
함수는 `handle`로 시작합니다.

```tsx
export interface SymbolItemProps {
  onSelect: (symbol: string) => void
}

export const SymbolItem = ({ onSelect }: SymbolItemProps) => {
  const handleClick = () => {
    onSelect('BTCUSDT')
  }

  return <button onClick={handleClick}>BTC</button>
}
```

`on*`은 외부에 노출된 이벤트 계약을, `handle*`은 내부 구현을 나타내므로 이벤트의
흐름을 이름만으로 구분할 수 있습니다.

#### Boolean 네이밍

Boolean 변수는 `is`, `has`, `can`, `should`로 시작합니다.

```ts
const isLoading = true
const isConnected = false
const hasPosition = true
const canSubmitOrder = false
const shouldReconnect = true
```

```ts
// 잘못된 예시
const loading = true
const connected = false
```

변수 이름만 보고 Boolean 값이라는 사실과 값이 나타내는 상태나 권한을 판단할 수 있어야
합니다.

### API 및 데이터 관리

#### API 요청 및 응답 타입

API 요청과 응답 타입은 `interface`로 작성합니다. 요청 타입에는 `RequestBody`, 응답
타입에는 `ResponseBody` 접미사를 붙입니다.

```ts
export interface GetMarketSummaryResponseBody {
  symbol: string
  price: string
  changeRate: number
}

export interface CreateAnalysisRequestBody {
  symbol: string
  question: string
}
```

URL Parameter와 Query Parameter는 각각 `PathParams`, `QueryParams`로 구분합니다.

```ts
export interface GetCandlesPathParams {
  symbol: string
}

export interface GetCandlesQueryParams {
  interval: ChartInterval
  limit: number
}
```

접미사로 HTTP 요청의 각 위치를 구분하면 같은 필드 이름이 있더라도 값의 출처와 전달
방식을 빠르게 파악할 수 있습니다.

#### API 요청 함수

API 요청 함수는 `export async function`으로 선언합니다. 함수 이름은 HTTP Method가
아니라 실제 동작을 나타내는 동사로 시작합니다.

```ts
export async function getMarketSummary() {}

export async function getCandlesBySymbol(symbol: string, interval: ChartInterval) {}

export async function createMarketAnalysis(body: CreateAnalysisRequestBody) {}
```

```ts
// 잘못된 예시
export const fetchData = async () => {}
export const requestApi = async () => {}
```

`get`, `create`, `update`, `delete`처럼 동작이 명확한 이름을 사용하면 API 함수의 목적을
호출부에서 바로 파악할 수 있습니다.

#### API 파일의 응집도

하나의 API 기능에 해당하는 요청 함수, 타입, Query Hook을 같은 파일에 배치합니다.

```text
entities/market/api/
├── getMarketSummary.ts
├── getCandlesBySymbol.ts
└── _keys.ts
```

```ts
export interface GetMarketSummaryResponseBody {
  symbol: string
  price: string
}

export async function getMarketSummary() {}

export const useGetMarketSummaryQuery = () => {
  return useQuery({
    queryKey: MarketQueryKeys.summary(),
    queryFn: getMarketSummary,
  })
}
```

API 명세가 변경될 때 함께 수정되는 코드를 같은 위치에 두면 변경 범위를 줄일 수
있습니다. 파일이 지나치게 커지는 경우에만 타입, API 함수, Query Hook 파일로
분리합니다.

#### Query Key 관리

TanStack Query의 Query Key는 각 Slice의 `api/_keys.ts`에서 관리합니다.

```ts
export const MarketQueryKeys = {
  all: () => ['MARKET'] as const,

  summary: () => [...MarketQueryKeys.all(), 'SUMMARY'] as const,

  candles: (symbol: string, interval: ChartInterval) =>
    [...MarketQueryKeys.all(), 'CANDLES', symbol, interval] as const,
}
```

Query Key를 계층형 객체로 관리하면 캐시 무효화 범위를 명확하게 지정할 수 있습니다.

```ts
queryClient.invalidateQueries({
  queryKey: MarketQueryKeys.all(),
})
```

컴포넌트 내부에서 Query Key 배열을 직접 작성하지 않습니다.

```ts
// 잘못된 예시
useQuery({
  queryKey: ['market', symbol, interval],
})
```

Query Key 팩토리를 사용하면 문자열 오타와 키 구조 불일치를 막고 전체 Slice 또는 특정
리소스를 일관되게 무효화할 수 있습니다.

#### 금융 데이터 타입

가격, 주문 수량, 평균 매수가 등 정확성이 중요한 금융 데이터는 API에서 `string`으로
전달받습니다.

```ts
export interface PositionResponseBody {
  symbol: string
  quantity: string
  averageEntryPrice: string
  currentPrice: string
}
```

JavaScript의 `number`는 부동소수점 방식이므로 소수 계산에서 오차가 발생할 수 있습니다.
차트 표시처럼 정밀 계산이 필요하지 않은 경계에서만 `number`로 변환합니다. 최종 주문
금액과 손익 계산은 서버에서 다시 검증합니다.

### 기타 네이밍 규칙

#### Zod Schema

Zod Schema는 `camelCase`로 작성하고 `Schema` 접미사를 붙입니다. Zod Schema에서
추론한 타입은 일반적인 도메인 타입 이름을 사용합니다.

```ts
export const signUpSchema = z.object({
  email: z.email(),
})

export type SignUpFormValues = z.infer<typeof signUpSchema>
```

```ts
// 지양하는 예시
export const SignUpSchema = z.object({})
export type SignUpSchemaType = z.infer<typeof SignUpSchema>
```

변수는 JavaScript 관례에 따라 `camelCase`로 작성하고 타입 이름은 `PascalCase`로
구분합니다. 타입 이름에는 Schema의 구현 방식보다 실제 도메인 의미를 담습니다.

#### Custom Hook

Custom Hook은 반드시 `use`로 시작합니다.

```ts
export const useMarketSocket = () => {}
export const useSelectedSymbol = () => {}
export const useCreateAnalysisMutation = () => {}
```

Query Hook은 `use + 동작 + 대상 + Query`, Mutation Hook은
`use + 동작 + 대상 + Mutation` 형식으로 작성합니다.

```ts
useGetMarketSummaryQuery()
useGetCandlesBySymbolQuery()
useCreateMarketAnalysisMutation()
```

#### Widget 컴포넌트

FSD의 `widgets` 레이어에 위치하며 페이지의 주요 영역을 구성하는 컴포넌트에는
`Widget` 접미사를 붙입니다.

```tsx
export const MarketOverviewWidget = () => {}
export const TradingChartWidget = () => {}
export const AiAnalysisWidget = () => {}
```

작은 공통 컴포넌트에는 `Widget`을 붙이지 않습니다.

```tsx
export const Button = () => {}
export const PriceBadge = () => {}
```

접미사를 통해 페이지를 구성하는 큰 단위와 재사용 가능한 작은 UI 요소를 이름만으로
구분합니다.

#### 상수

전역 또는 모듈 상수는 `UPPER_SNAKE_CASE`를 사용합니다.

```ts
export const DEFAULT_SYMBOL = 'BTCUSDT'
export const MAX_RECONNECT_COUNT = 5
export const AI_MESSAGE_MAX_LENGTH = 1_000
```

시간 값은 단위를 이름에 명시합니다.

```ts
export const RECONNECT_DELAY_MS = 3_000
export const MARKET_STALE_TIME_MS = 10_000
```

단위가 없는 `delay`, `timeout`, `timestamp` 같은 이름은 사용하지 않습니다. 값의 단위를
이름에 포함하면 호출부에서 잘못된 단위로 계산하거나 전달하는 실수를 줄일 수 있습니다.

### TypeScript

#### any 사용 금지

외부에서 들어오는 데이터는 `any`가 아니라 `unknown`으로 받은 후 검증합니다.

```ts
export function parseSocketMessage(message: unknown) {
  return marketSocketMessageSchema.parse(message)
}
```

`any`는 TypeScript 검사를 우회하므로 API와 WebSocket 데이터 오류가 런타임까지 전달될
수 있습니다. `unknown`은 데이터를 사용하기 전에 타입을 좁히거나 검증하도록
강제합니다.

#### Enum 대신 Union Type

단순한 상태 값은 Enum보다 Union Type을 우선합니다.

```ts
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
```

Union Type은 별도의 JavaScript 객체를 생성하지 않고 자동 완성과 Exhaustive Check를
적용하기 쉽습니다.

#### 타입 전용 Import

타입만 가져오는 경우 `import type`을 사용합니다.

```ts
import type { ChartInterval } from '../model/chart.types'
```

해당 Import가 런타임에 필요하지 않음을 명확히 하고 불필요한 런타임 의존성과 순환
의존성을 줄일 수 있습니다.

### 자동화 규칙

코드 스타일은 개발자가 수동으로 맞추지 않고 ESLint와 Prettier에 맡깁니다. VS
Code에서는 저장 시 Prettier 포맷과 ESLint 자동 수정이 적용되도록
`.vscode/settings.json`을 공유합니다.

다음 규칙을 필수로 적용합니다.

```text
TypeScript strict mode
no-explicit-any
consistent-type-imports
react-hooks/rules-of-hooks
react-hooks/exhaustive-deps
no-console
prefer-const
eqeqeq
```

컨벤션과 다른 구현이 꼭 필요한 경우 임의로 예외를 만들지 않고 먼저 기술적인 이유와
영향 범위를 설명합니다.

## 5. 커밋 컨벤션

커밋 메시지는 `Type: 변경 내용` 형식을 사용합니다. 한 커밋에는 하나의 논리적 변경을
담고 변경 내용은 짧고 구체적으로 작성합니다.

| Type       | 설명                                         |
| ---------- | -------------------------------------------- |
| `Feat`     | 새로운 기능 추가                             |
| `Fix`      | 버그 수정                                    |
| `!HOTFIX`  | 치명적 버그 긴급 수정                        |
| `Design`   | CSS 등 UI 디자인 변경                        |
| `Style`    | 코드 포맷팅, 세미콜론 누락 등 로직 없는 변경 |
| `Refactor` | 코드 리팩터링                                |
| `Comment`  | 주석 추가 및 변경                            |
| `Docs`     | README 등 문서 수정                          |
| `Test`     | 테스트 코드 추가 및 리팩터링                 |
| `Rename`   | 파일 또는 폴더명 변경                        |
| `Remove`   | 파일 또는 폴더 삭제                          |
| `Chore`    | 패키지 매니저, 빌드 설정 등 기타 작업        |

```text
Feat: 관심 종목 추가 기능 구현
Fix: 실시간 시세 재연결 오류 수정
Docs: FSD 구조와 코드 컨벤션 추가
Chore: ESLint 설정 변경
```

## 6. 실행 및 검증 명령어

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| 명령어              | 용도                        |
| ------------------- | --------------------------- |
| `pnpm dev`          | Vite 개발 서버 실행         |
| `pnpm lint`         | ESLint 정적 분석            |
| `pnpm typecheck`    | TypeScript 타입 검사        |
| `pnpm test`         | Vitest 테스트 1회 실행      |
| `pnpm test:watch`   | 테스트 감시 모드 실행       |
| `pnpm build`        | 타입 검사 후 프로덕션 빌드  |
| `pnpm format`       | Prettier로 전체 파일 포맷팅 |
| `pnpm format:check` | 포맷 변경 없이 형식 검사    |

모든 작업 완료 전 다음 명령을 실행합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

PowerShell 실행 정책으로 `pnpm`이 차단되는 환경에서는 `pnpm.cmd`를 사용합니다.

## 7. 작업 방식

1. 변경 전 관련 코드, 설정, 테스트를 읽고 작업할 기능의 FSD 레이어와 Slice를 결정합니다.
2. 다른 Slice를 사용할 때 Public API가 있는지 먼저 확인합니다.
3. 기존 패턴을 우선하고 변경 범위를 작게 유지하며 불필요한 추상화를 추가하지 않습니다.
4. 외부 데이터는 타입을 단정하지 않고 `unknown`으로 받은 뒤 Zod로 검증합니다.
5. 서버 상태, 전역 UI 상태, 지역 상태, 실시간 데이터의 소유권을 구분합니다.
6. 사용자 동작과 실패 경로를 기준으로 변경 위험도에 맞는 테스트를 작성합니다.
7. `lint`, `typecheck`, `test`, `build`를 실행해 변경을 검증합니다.
8. 컨벤션 예외가 필요하면 적용 전에 기술적인 이유와 영향 범위를 설명합니다.
9. 구조나 공통 컨벤션을 바꿨다면 README와 AGENTS.md를 함께 갱신합니다.

AI 에이전트용 핵심 작업 규칙은 [AGENTS.md](./AGENTS.md)에서 관리합니다.
Claude Code는 [CLAUDE.md](./CLAUDE.md)를 통해 같은 규칙을 불러옵니다.
