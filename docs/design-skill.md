# UI 작업 절차

Agent(사람이든 AI든)가 GAZUA 프런트엔드에서 화면/컴포넌트를 새로 만들거나 수정할 때 따르는 절차다.
디자인 토큰 자체의 목록과 값 위치는 [design-system.md](./design-system.md)를 참고한다.

## 절차

1. **관련 화면과 디자인 시스템을 먼저 확인한다.** 어떤 화면/기능인지
   [project-overview.md의 화면 구조](./project-overview.md)를 보고, 사용할 토큰은
   [design-system.md](./design-system.md)에서 확인한다.
2. **기존 컴포넌트 재사용 여부를 확인한다.** 여러 Slice에서 재사용하는 UI 프리미티브는
   `frontend/src/shared/ui`에 있는지 먼저 찾는다. 특정 기능에만 쓰이는 컴포넌트는 해당 Slice의 `ui`
   세그먼트를 확인한다. FSD 세그먼트/Import 규칙은
   [development-guide.md](./development-guide.md#feature-sliced-design)를 참고한다.
3. **토큰을 사용한다.** hex 색상, px 간격, box-shadow 문자열을 직접 쓰지 않는다.
   `theme.palette.*`(원시값)가 아니라 `theme.colors.*`(semantic 토큰)를 사용한다. 반복되는
   버튼/인풋/카드 등의 스타일은 `theme.components.*`를 먼저 확인한다.
4. **반응형을 확인한다.** `theme.breakpoint.*`를 기준으로 좁은 화면에서 레이아웃이 깨지지 않는지
   확인한다.
5. **접근성을 확인한다.** 키보드 포커스가 `:focus-visible`로 보이는지, 인터랙션 요소에 적절한 역할/
   레이블이 있는지 확인한다. 색만으로 상태를 구분하지 않는다(예: market 등락은 텍스트/아이콘도 함께
   고려한다).
6. **임의 색상과 임의 간격을 사용하지 않는다.** 토큰에 맞는 값이 없다고 판단되면 값을 새로 지어내지
   말고, 먼저 사용자에게 확인하거나 `theme.ts`에 토큰을 추가하는 방향을 제안한다.
7. **작업 후 검증한다.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 실행해 컨벤션과
   타입, 빌드가 깨지지 않았는지 확인한다.

## 코드 컨벤션과의 연결

스타일링 작업에서 특히 자주 걸리는 규칙만 요약한다. 전체 규칙은
[development-guide.md](./development-guide.md)를 따른다.

- 컴포넌트: `PascalCase`, Arrow Function + Named Export (페이지 컴포넌트만 예외: 함수 선언문 +
  Default Export)
- Props: `interface 컴포넌트명Props`, `React.FC` 사용 금지
- Widget 레이어 컴포넌트는 이름 끝에 `Widget`을 붙인다
- Boolean prop/변수는 `is`, `has`, `can`, `should`로 시작 (예: `isRise`, `hasError`)
- 아이콘은 가능하면 Lucide React 사용, 크기는 `theme.size.icon.*`에 맞춘다
