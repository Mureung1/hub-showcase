# 개발 가이드

프론트엔드 개발 시 지켜야 하는 기술 스택, 프로젝트 구조, 코드 컨벤션, 커밋 컨벤션, 실행 명령어, 작업
방식을 정리한다. 매 작업마다 필요한 최소 규칙은 [AGENTS.md](../AGENTS.md)에 있고, 이 문서는 그 근거와
상세 예시를 담는다. 기술 스택을 선택한 이유와 대안 비교는 [decisions.md](./decisions.md)를 참고한다.

## 1. 기술 스택

| 영역            | 기술                    |
| --------------- | ----------------------- |
| UI              | React                   |
| 언어            | TypeScript              |
| 개발 환경       | Vite                    |
| 패키지 관리     | pnpm                    |
| 스타일          | Emotion                 |
| 라우팅          | React Router            |
| 서버 상태       | TanStack Query          |
| 클라이언트 상태 | Zustand                 |
| HTTP            | Axios                   |
| 검증            | Zod                     |
| 아이콘          | Lucide React            |
| 테스트          | Vitest, Testing Library |
| 정적 분석       | ESLint                  |
| 포맷팅          | Prettier                |

## 2. 프로젝트 구조와 아키텍처

루트는 pnpm workspace 기반 모노레포다.

```text
frontend/  # React, TypeScript, Vite 기반 프론트엔드 앱과 prototype 산출물
backend/   # 백엔드 작업 영역, 현재는 빈 골격만 유지
```

전체 시스템 구성과 프론트엔드/백엔드 책임 분담은 [architecture.md](./architecture.md)를 참고한다. 이
문서는 프론트엔드 코드를 어떻게 조직하는지에 집중한다.

### Feature-Sliced Design

프론트엔드 앱은 `frontend/src` 아래에서 FSD 레이어를 사용한다.

```text
frontend/src/
├── app/       # 앱 초기화, Provider, Router, 전역 스타일
├── pages/     # 라우트 단위 페이지 조합
├── widgets/   # 페이지의 독립적인 대형 UI 영역
├── features/  # 사용자의 구체적인 행동과 유스케이스
├── entities/  # 핵심 비즈니스 엔티티와 데이터 표현
└── shared/    # 도메인에 의존하지 않는 공통 코드
```

의존성은 다음과 같이 상위 레이어에서 하위 레이어 방향으로만 흐른다.

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

하위 레이어는 상위 레이어를 참조하지 않는다. 이 규칙은 기능 변경이 다른 영역으로 연쇄 전파되는 것을
막고 각 Slice를 독립적으로 테스트하기 쉽게 만든다.

각 Slice는 필요에 따라 다음 Segment를 가질 수 있다.

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

다른 Slice의 코드는 최상위 `index.ts` Public API를 통해서만 가져온다.

```ts
// 올바른 예시
import { MarketCard } from "@/entities/market";

// 잘못된 예시
import { MarketCard } from "@/entities/market/ui/MarketCard";
```

내부 경로를 직접 참조하지 않으면 파일 배치를 바꿔도 외부 호출부가 함께 깨지는 문제를 줄일 수 있다.
과도한 Barrel Export는 순환 의존성을 만들 수 있으므로 각 FSD Slice의 최상위 `index.ts`에서만
사용한다.

### 상태와 데이터 소유권

서버 상태, 클라이언트 상태, 컴포넌트 지역 상태를 구분한다.

| 데이터                          | 관리 도구                    | 예시                                                 |
| -------------------------------- | ----------------------------- | ------------------------------------------------------ |
| 서버에서 조회하는 상태          | TanStack Query                | 시장 정보, 뉴스, AI 분석 기록, 포트폴리오, 관심 종목 |
| 여러 화면이 공유하는 UI 상태    | Zustand                       | 선택 종목, 사이드바, 테마, WebSocket 연결 상태       |
| 한 컴포넌트에서만 사용하는 상태 | React `useState`              | 입력 열림 여부, 임시 선택값                          |
| 고빈도 실시간 데이터            | WebSocket 또는 차트 인스턴스  | 현재가, 체결, 실시간 캔들 갱신                       |

TanStack Query의 데이터를 Zustand에 다시 복사하지 않는다. 같은 서버 데이터를 두 저장소에 보관하면
어느 데이터가 최신 상태인지 판단하기 어려워지기 때문이다.

### 실시간 시세 데이터

실시간 가격 데이터는 일반 API 데이터와 분리한다.

- 최초 캔들 조회는 Axios와 TanStack Query를 사용한다.
- 현재가와 체결 데이터는 WebSocket으로 수신한다.
- 실시간 차트는 차트 인스턴스의 `update`를 사용한다.
- WebSocket 연결 상태는 Zustand에서 관리한다.

WebSocket 틱이 들어올 때마다 전체 Query Cache를 갱신하지 않는다.

```ts
// 잘못된 예시
socket.onmessage = (event) => {
  queryClient.setQueryData(
    MarketQueryKeys.candles(symbol, interval),
    JSON.parse(event.data),
  );
};
```

고빈도 데이터로 Query Cache를 계속 변경하면 불필요한 렌더링과 캐시 연산이 발생할 수 있다. Query
Cache는 서버에서 조회한 데이터의 수명과 동기화에 사용하고, 실시간 렌더링 경로는 별도로 유지한다.

## 3. 코드 컨벤션

### React 컴포넌트

#### 일반 컴포넌트 네이밍

모든 React 컴포넌트는 `PascalCase`를 사용한다. 일반 컴포넌트는 ES6 Arrow Function과 Named Export로
선언한다.

```tsx
// 올바른 예시
export const MarketCard = () => {};

// 잘못된 예시
export const marketCard = () => {};
export function marketCard() {}
```

Arrow Function을 사용하면 일반 컴포넌트와 함수 선언문을 사용하는 페이지 컴포넌트를 시각적으로
구분할 수 있고, 프로젝트 전체의 선언 방식을 일관되게 유지할 수 있다.

#### Props 타입 네이밍

컴포넌트 Props는 `interface`로 선언하고 이름은 `컴포넌트명Props`로 작성한다. `React.FC`는 사용하지
않고 구조 분해한 Props에 직접 타입을 지정한다.

```tsx
// 올바른 예시
export interface MarketCardProps {
  symbol: string;
  price: number;
}

export const MarketCard = ({ symbol, price }: MarketCardProps) => {
  return <div>{`${symbol}: ${price}`}</div>;
};
```

```tsx
// 잘못된 예시
export type MarketCardProps = {};

export const MarketCard: React.FC<MarketCardProps> = () => {};
```

`React.FC`를 사용하지 않으면 Props 타입이 직접 노출되고 불필요한 타입 래핑 없이 반환 타입과 제네릭을
명확하게 관리할 수 있다. 단, Union Type과 함수 타입에는 `type`을 사용한다.

```ts
export type TradeDirection = "LONG" | "SHORT" | "NEUTRAL";
export type ChartInterval = "1m" | "5m" | "1h" | "4h" | "1d";
```

#### 페이지 컴포넌트

페이지 컴포넌트는 함수 선언문과 Default Export를 사용한다.

```tsx
export default function MarketPage() {}
```

페이지는 코드 분할과 Lazy Loading의 진입점으로 사용한다.

```tsx
const MarketPage = lazy(() => import("@/pages/market/MarketPage"));
```

Default Export를 사용하면 별도의 모듈 변환 없이 동적 import를 간결하게 작성할 수 있다. 일반
컴포넌트에서는 Named Export를 사용하며 Default Export는 페이지 컴포넌트에서만 허용한다.

#### 컴포넌트 디렉터리

독립적으로 사용되는 컴포넌트는 별도 디렉터리를 가진다. 테스트와 스타일, Public API를 컴포넌트
가까이에 배치한다.

```text
MarketCard/
├── index.ts
├── MarketCard.tsx
├── MarketCard.styles.ts
├── MarketCard.test.tsx
└── MarketCard.stories.tsx   # Storybook을 사용하는 경우
```

`index.ts`는 해당 컴포넌트를 외부에 공개하는 Public API 역할만 담당한다.

```ts
export { MarketCard } from "./MarketCard";
export type { MarketCardProps } from "./MarketCard";
```

서로 밀접하게 관련된 하위 컴포넌트는 같은 디렉터리에 배치한다.

```text
TradingChart/
├── TradingChart.tsx
├── ChartToolbar.tsx
├── ChartLegend.tsx
└── index.ts
```

관련 코드가 함께 변경되도록 배치하는 응집도 원칙과 Common Closure Principle을 따른다. 작은 하위
컴포넌트를 기계적으로 별도 Slice나 디렉터리로 분리하지 않는다.

#### 이벤트 함수 네이밍

Props로 전달되는 이벤트는 `on`으로 시작하고, 컴포넌트 내부에서 이벤트를 처리하는 함수는 `handle`로
시작한다.

```tsx
export interface SymbolItemProps {
  onSelect: (symbol: string) => void;
}

export const SymbolItem = ({ onSelect }: SymbolItemProps) => {
  const handleClick = () => {
    onSelect("BTCUSDT");
  };

  return <button onClick={handleClick}>BTC</button>;
};
```

`on*`은 외부에 노출된 이벤트 계약을, `handle*`은 내부 구현을 나타내므로 이벤트의 흐름을 이름만으로
구분할 수 있다.

#### Boolean 네이밍

Boolean 변수는 `is`, `has`, `can`, `should`로 시작한다.

```ts
const isLoading = true;
const isConnected = false;
const hasPosition = true;
const canSubmitOrder = false;
const shouldReconnect = true;
```

```ts
// 잘못된 예시
const loading = true;
const connected = false;
```

변수 이름만 보고 Boolean 값이라는 사실과 값이 나타내는 상태나 권한을 판단할 수 있어야 한다.

### API 및 데이터 관리

#### API 요청 및 응답 타입

API 요청과 응답 타입은 `interface`로 작성한다. 요청 타입에는 `RequestBody`, 응답 타입에는
`ResponseBody` 접미사를 붙인다.

```ts
export interface GetMarketSummaryResponseBody {
  symbol: string;
  price: string;
  changeRate: number;
}

export interface CreateAnalysisRequestBody {
  symbol: string;
  question: string;
}
```

URL Parameter와 Query Parameter는 각각 `PathParams`, `QueryParams`로 구분한다.

```ts
export interface GetCandlesPathParams {
  symbol: string;
}

export interface GetCandlesQueryParams {
  interval: ChartInterval;
  limit: number;
}
```

접미사로 HTTP 요청의 각 위치를 구분하면 같은 필드 이름이 있더라도 값의 출처와 전달 방식을 빠르게
파악할 수 있다.

#### API 요청 함수

API 요청 함수는 `export async function`으로 선언한다. 함수 이름은 HTTP Method가 아니라 실제 동작을
나타내는 동사로 시작한다.

```ts
export async function getMarketSummary() {}

export async function getCandlesBySymbol(
  symbol: string,
  interval: ChartInterval,
) {}

export async function createMarketAnalysis(body: CreateAnalysisRequestBody) {}
```

```ts
// 잘못된 예시
export const fetchData = async () => {};
export const requestApi = async () => {};
```

`get`, `create`, `update`, `delete`처럼 동작이 명확한 이름을 사용하면 API 함수의 목적을 호출부에서
바로 파악할 수 있다.

#### API 파일의 응집도

하나의 API 기능에 해당하는 요청 함수, 타입, Query Hook을 같은 파일에 배치한다.

```text
entities/market/api/
├── getMarketSummary.ts
├── getCandlesBySymbol.ts
└── _keys.ts
```

```ts
export interface GetMarketSummaryResponseBody {
  symbol: string;
  price: string;
}

export async function getMarketSummary() {}

export const useGetMarketSummaryQuery = () => {
  return useQuery({
    queryKey: MarketQueryKeys.summary(),
    queryFn: getMarketSummary,
  });
};
```

API 명세가 변경될 때 함께 수정되는 코드를 같은 위치에 두면 변경 범위를 줄일 수 있다. 파일이
지나치게 커지는 경우에만 타입, API 함수, Query Hook 파일로 분리한다.

#### Query Key 관리

TanStack Query의 Query Key는 각 Slice의 `api/_keys.ts`에서 관리한다.

```ts
export const MarketQueryKeys = {
  all: () => ["MARKET"] as const,

  summary: () => [...MarketQueryKeys.all(), "SUMMARY"] as const,

  candles: (symbol: string, interval: ChartInterval) =>
    [...MarketQueryKeys.all(), "CANDLES", symbol, interval] as const,
};
```

Query Key를 계층형 객체로 관리하면 캐시 무효화 범위를 명확하게 지정할 수 있다.

```ts
queryClient.invalidateQueries({
  queryKey: MarketQueryKeys.all(),
});
```

컴포넌트 내부에서 Query Key 배열을 직접 작성하지 않는다.

```ts
// 잘못된 예시
useQuery({
  queryKey: ["market", symbol, interval],
});
```

Query Key 팩토리를 사용하면 문자열 오타와 키 구조 불일치를 막고 전체 Slice 또는 특정 리소스를
일관되게 무효화할 수 있다.

#### 금융 데이터 타입

가격, 주문 수량, 평균 매수가 등 정확성이 중요한 금융 데이터는 API에서 `string`으로 전달받는다.

```ts
export interface PositionResponseBody {
  symbol: string;
  quantity: string;
  averageEntryPrice: string;
  currentPrice: string;
}
```

JavaScript의 `number`는 부동소수점 방식이므로 소수 계산에서 오차가 발생할 수 있다. 차트 표시처럼
정밀 계산이 필요하지 않은 경계에서만 `number`로 변환한다. 최종 주문 금액과 손익 계산은 서버에서
다시 검증한다.

### 기타 네이밍 규칙

#### Zod Schema

Zod Schema는 `camelCase`로 작성하고 `Schema` 접미사를 붙인다. Zod Schema에서 추론한 타입은 일반적인
도메인 타입 이름을 사용한다.

```ts
export const signUpSchema = z.object({
  email: z.email(),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
```

```ts
// 지양하는 예시
export const SignUpSchema = z.object({});
export type SignUpSchemaType = z.infer<typeof SignUpSchema>;
```

변수는 JavaScript 관례에 따라 `camelCase`로 작성하고 타입 이름은 `PascalCase`로 구분한다. 타입
이름에는 Schema의 구현 방식보다 실제 도메인 의미를 담는다.

#### Custom Hook

Custom Hook은 반드시 `use`로 시작한다.

```ts
export const useMarketSocket = () => {};
export const useSelectedSymbol = () => {};
export const useCreateAnalysisMutation = () => {};
```

Query Hook은 `use + 동작 + 대상 + Query`, Mutation Hook은 `use + 동작 + 대상 + Mutation` 형식으로
작성한다.

```ts
useGetMarketSummaryQuery();
useGetCandlesBySymbolQuery();
useCreateMarketAnalysisMutation();
```

#### Widget 컴포넌트

FSD의 `widgets` 레이어에 위치하며 페이지의 주요 영역을 구성하는 컴포넌트에는 `Widget` 접미사를
붙인다.

```tsx
export const MarketOverviewWidget = () => {};
export const TradingChartWidget = () => {};
export const AiAnalysisWidget = () => {};
```

작은 공통 컴포넌트에는 `Widget`을 붙이지 않는다.

```tsx
export const Button = () => {};
export const PriceBadge = () => {};
```

접미사를 통해 페이지를 구성하는 큰 단위와 재사용 가능한 작은 UI 요소를 이름만으로 구분한다.

#### 상수

전역 또는 모듈 상수는 `UPPER_SNAKE_CASE`를 사용한다.

```ts
export const DEFAULT_SYMBOL = "BTCUSDT";
export const MAX_RECONNECT_COUNT = 5;
export const AI_MESSAGE_MAX_LENGTH = 1_000;
```

시간 값은 단위를 이름에 명시한다.

```ts
export const RECONNECT_DELAY_MS = 3_000;
export const MARKET_STALE_TIME_MS = 10_000;
```

단위가 없는 `delay`, `timeout`, `timestamp` 같은 이름은 사용하지 않는다. 값의 단위를 이름에 포함하면
호출부에서 잘못된 단위로 계산하거나 전달하는 실수를 줄일 수 있다.

### TypeScript

#### any 사용 금지

외부에서 들어오는 데이터는 `any`가 아니라 `unknown`으로 받은 후 검증한다.

```ts
export function parseSocketMessage(message: unknown) {
  return marketSocketMessageSchema.parse(message);
}
```

`any`는 TypeScript 검사를 우회하므로 API와 WebSocket 데이터 오류가 런타임까지 전달될 수 있다.
`unknown`은 데이터를 사용하기 전에 타입을 좁히거나 검증하도록 강제한다.

#### Enum 대신 Union Type

단순한 상태 값은 Enum보다 Union Type을 우선한다.

```ts
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
```

Union Type은 별도의 JavaScript 객체를 생성하지 않고 자동 완성과 Exhaustive Check를 적용하기 쉽다.

#### 타입 전용 Import

타입만 가져오는 경우 `import type`을 사용한다.

```ts
import type { ChartInterval } from "../model/chart.types";
```

해당 Import가 런타임에 필요하지 않음을 명확히 하고 불필요한 런타임 의존성과 순환 의존성을 줄일 수
있다.

### 자동화 규칙

코드 스타일은 개발자가 수동으로 맞추지 않고 ESLint와 Prettier에 맡긴다. VS Code에서는 저장 시
Prettier 포맷과 ESLint 자동 수정이 적용되도록 `.vscode/settings.json`을 공유한다.

다음 규칙을 필수로 적용한다.

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

컨벤션과 다른 구현이 꼭 필요한 경우 임의로 예외를 만들지 않고 먼저 기술적인 이유와 영향 범위를
설명한다.

## 4. 커밋 컨벤션

커밋 메시지는 `Type: 변경 내용` 형식을 사용한다. 한 커밋에는 하나의 논리적 변경을 담고 변경 내용은
짧고 구체적으로 작성한다.

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

## 5. 실행 및 검증 명령어

아래 명령은 루트에서 실행한다. 루트 스크립트는 현재 `@gazua/frontend` 패키지로 위임된다.

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

모든 작업 완료 전 다음 명령을 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

PowerShell 실행 정책으로 `pnpm`이 차단되는 환경에서는 `pnpm.cmd`를 사용한다.

## 6. 작업 방식

1. 변경 전 관련 코드, 설정, 테스트를 읽고 작업할 기능의 FSD 레이어와 Slice를 결정한다.
2. 다른 Slice를 사용할 때 Public API가 있는지 먼저 확인한다.
3. 기존 패턴을 우선하고 변경 범위를 작게 유지하며 불필요한 추상화를 추가하지 않는다.
4. 외부 데이터는 타입을 단정하지 않고 `unknown`으로 받은 뒤 Zod로 검증한다.
5. 서버 상태, 전역 UI 상태, 지역 상태, 실시간 데이터의 소유권을 구분한다.
6. 사용자 동작과 실패 경로를 기준으로 변경 위험도에 맞는 테스트를 작성한다.
7. `lint`, `typecheck`, `test`, `build`를 실행해 변경을 검증한다.
8. 컨벤션 예외가 필요하면 적용 전에 기술적인 이유와 영향 범위를 설명한다.
9. 구조나 공통 컨벤션을 바꿨다면 [README.md](../README.md)와 [AGENTS.md](../AGENTS.md)를 함께
   갱신한다.
