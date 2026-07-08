# Wanted Design System 도입 메모

## 목적

아맞다의 브랜드 인상은 `DESIGN.md`를 기준으로 유지하고, Wanted Design System(WDS)은 컴포넌트 규격과 상호작용 품질을 맞추는 참고 시스템으로 사용한다.

## 현재 연결 상태

- `@wanteddev/wds@3.11.0`, `@wanteddev/wds-icon@3.11.0`을 설치했다.
- `src/main.tsx`에서 `ThemeProvider`와 `@wanteddev/wds/global.css`를 연결했다.
- 액션 버튼은 WDS `Button`부터 적용한다.

## 설치 전제

WDS는 GitHub Packages에 배포되어 있으므로 `@wanteddev` scope registry 설정과 읽기 권한이 있는 GitHub Packages 토큰이 필요하다.

```sh
npm install @wanteddev/wds@3.11.0 @wanteddev/wds-icon@3.11.0
```

주의:

- `@wanteddev/wds-*` 패키지는 같은 버전으로 맞춘다.
- 토큰은 사용자 또는 CI 환경의 `.npmrc`/secret에만 둔다.
- 프로젝트에는 registry 설정만 커밋한다.

## React 연결

설치 후 `src/main.tsx`에서 WDS 전역 CSS와 `ThemeProvider`를 연결한다.

```tsx
import { ThemeProvider } from '@wanteddev/wds';
import '@wanteddev/wds/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
```

Pretendard는 WDS README의 CDN 링크 또는 자체 font-face로 로드한다.

## 컴포넌트 매핑

| 아맞다                 | WDS 참고                                   | 적용 방식                                                                           |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Button`               | `Button`, `TextButton`, `IconButton`       | 크기, loading, disabled, solid/outlined 구조를 따른다.                              |
| `TextInput`            | `TextField`                                | URL 입력, 메모 외 단일 입력에 사용한다.                                             |
| `SearchBand`           | `SearchField`                              | 보관함/꺼내보기 검색에 사용하되, 화면 레이아웃은 아맞다 기준으로 조정한다.          |
| `Chip`, `CategoryRail` | `Chip`, `CategoryList`, `CategoryListItem` | 카테고리 필터와 추천 상황 칩의 크기/선택 상태를 맞춘다.                             |
| `InsightCard`          | `Card`, `Thumbnail`                        | 카드 구조는 유지하고 썸네일 비율, 제목 말줄임, caption 규칙을 차용한다.             |
| `BottomNavigation`     | `BottomNavigation`                         | 탭 값/상태 관리와 접근성 패턴을 참고한다. floating 형태는 아맞다에서 별도 결정한다. |
| `EmptyState`           | `FallbackView`                             | 빈 상태의 중앙 정렬, 짧은 설명, 다음 행동 규칙을 따른다.                            |

## 차용할 수치

| 항목              |                             WDS 기준 | 아맞다 적용          |
| ----------------- | -----------------------------------: | -------------------- |
| Button small      |         radius 8px, padding 7px 14px | 작은 보조 액션       |
| Button medium     |        radius 10px, padding 9px 20px | 기본 버튼            |
| Button large      |       radius 12px, padding 12px 28px | 주요 CTA             |
| Chip small        |          radius 8px, padding 6px 8px | 카테고리 rail        |
| Chip medium       |         radius 8px, padding 7px 11px | 추천 상황            |
| Field/Search      |                          radius 12px | 입력, 검색           |
| Card thumbnail    | radius 12px, desktop 3:2, mobile 4:3 | 인사이트 카드 썸네일 |
| Bottom navigation |                          height 56px | 기본 높이 참고       |

## 도입 순서

1. WDS 패키지 설치와 `ThemeProvider` 연결.
2. 공통 `Button`, `Input`, `Search`, `Chip` 래퍼를 만든다.
3. 보관함의 `CategoryRail`과 `InsightCard`부터 WDS 규격에 맞춘다.
4. 저장 화면의 URL 입력과 액션 버튼을 WDS 기반으로 교체한다.
5. 하단 내비게이션은 Stashby식 floating 유지 여부를 먼저 확정한 뒤 교체한다.

## 유지할 아맞다 기준

- 색상 역할과 서비스 톤은 `DESIGN.md`를 우선한다.
- WDS primary 색상을 그대로 브랜드 색으로 고정하지 않는다.
- 원티드 제품처럼 보이는 레이아웃 복제는 피한다.
- `꺼내보기`, 보관함, 저장 흐름의 문구와 정보 구조는 `docs/plan.md`를 따른다.
