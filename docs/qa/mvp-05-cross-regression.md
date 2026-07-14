# MVP-05 핵심 흐름 교차 회귀

- 실행일: 2026-07-14
- 대상 브랜치: `codex/local-first-mvp-flow`
- 대상 URL: `http://localhost:5173/`
- 범위: 백로그 #8, URL 저장 → 메모 추가 → 검색 → 꺼내보기 → 원문 열기
- 브라우저: Chrome
- 최종 기능 상태: 통과
- 시각 품질 평가: Design B, AI-slop B-

## 전체 사용자 여정

세 viewport에서 새 URL을 저장하고 제목·메모·카테고리를 입력한 뒤, 보관함의
메모·도메인 검색과 홈의 꺼내보기를 거쳐 작업 팩의 원문을 실제 새 탭에서
열었다. 이어서 수정, 삭제 취소, 삭제 확정을 실행했다. 서비스 포트 중단
환경에서는 외부 원문 열기를 제외한 로컬 흐름을 같은 순서로 검증했다.

| 환경                        | 저장·메타데이터 | 검색 | 꺼내보기·작업 팩 | 실제 원문 열기 | 수정 | 삭제 취소·확정 | 결과 |
| --------------------------- | --------------- | ---- | ---------------- | -------------- | ---- | -------------- | ---- |
| 390 × 844                   | 통과            | 통과 | 통과             | 통과           | 통과 | 통과           | 통과 |
| 768 × 900                   | 통과            | 통과 | 통과             | 통과           | 통과 | 통과           | 통과 |
| 1280 × 900                  | 통과            | 통과 | 통과             | 통과           | 통과 | 통과           | 통과 |
| 서비스 포트 중단, 390 × 844 | 통과            | 통과 | 통과             | 별도 검증      | 통과 | 통과           | 통과 |

원문 링크는 앱이 보관한 `originalUrl`을 변경하지 않고 새 탭으로 열었다.
외부 원문 새 탭은 모두 네트워크가 켜진 Chrome에서 검증했으며, 서비스 포트
중단과 인터넷 단절의 증거로 섞지 않는다. Chrome 탭의 최종 주소는 다음과
같이 직접 확인했다.

- 390px: `https://example.com/mvp05-390?utm_source=qa&keep=1#section`
- 768px:
  `https://developer.mozilla.org/en-US/docs/Web/Accessibility?view=qa768#keyboard`
- 1280px: `https://www.w3.org/WAI/tutorials/forms/?qa=1280#labels`
- 서비스 포트 중단 중, 외부 네트워크 연결 유지:
  `https://example.com/mvp05-offline?mode=local#evidence`

## 상태별 회귀

| 상태             | 확인 결과                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 잘못된 URL       | `notaurl-390` 입력을 보존하고 `role="alert"`, `aria-invalid="true"`, `aria-describedby="save-url-error"`를 제공했다. 유효한 URL로 고친 뒤 정상 저장했다. |
| 검색 결과 없음   | `zzzz-no-results-2026`에서 `검색 결과 없음`을 표시하고 `검색어 지우기`, `링크 저장`을 제공했다. 두 행동으로 실제 복구했다.                               |
| 성공             | 저장 완료 상태와 다음 행동을 390·768·1280px에서 확인했다.                                                                                                |
| 저장소 읽기 실패 | `authenticated_workspace.test.tsx`의 브라우저 저장소 접근 차단 계약으로 화면 유지와 오류 처리를 확인했다.                                                |
| 손상된 저장소    | `local_storage_insight_repository.test.ts`에서 전체 손상과 항목 단위 손상을 분리하고 정상 항목을 보존하는 계약을 확인했다.                               |
| 저장소 쓰기 실패 | `local_storage_insight_repository.test.ts`에서 `write-failed` 반환과 기존 저장값 보존을 확인했다.                                                        |
| 재마운트         | `authenticated_workspace.test.tsx`에서 수정·삭제 및 기본 브라우저 저장값 복원을 확인했다.                                                                |

## 키보드·접근성·반응형

- 저장, 검색, 꺼내보기, 원문 열기, 수정, 삭제 취소·확정을 실제 Enter와
  Space 입력으로 수행했다.
- 화면 전환은 `aria-current="page"`, 카테고리와 추천 상황은
  `aria-pressed`로 현재 상태를 전달했다.
- 잘못된 URL의 보이는 오류 문구와 입력의 오류 속성이 연결되어 있었다.
- 모든 주요 입력은 보이는 레이블과 연결되어 있었다.
- 390·768·1280px에서
  `document.documentElement.scrollWidth > window.innerWidth`는 모두
  `false`였다.
- 모든 여정에서 애플리케이션 console error는 0건이었다. 개발 서버의
  `Invalid scope` 경고 2건은 Vite 클라이언트에서만 발생했고 제품 동작과
  production build에는 영향을 주지 않았다.
- 실환경의 `prefers-reduced-motion`은 기본값인 `no-preference`였다.
  `onboarding_motion_preview.test.tsx`의 reduce 분기는 GSAP timeline을 만들지
  않고 최종 작업 팩을 정적으로 노출하는지 검증한다.

## 서비스 포트 중단·자동 오프라인 검증

브라우저 앱을 먼저 로드한 뒤 개발 서버 `:5173`과 API 서버 `:3001`을 모두
종료하고 두 포트가 닫힌 것을 확인했다. 운영체제와 Chrome의 외부 네트워크는
끄지 않았으며, 이미 로드된 앱에서 저장·검색·꺼내보기·수정·삭제 취소·확정을
완주했다. 이는 핵심 흐름이 서비스 포트에 의존하지 않는다는 증거다. 검증 후
두 서버를 재시작해 모두 listening 상태로 복구했다.

브라우저가 오프라인을 보고하고 네트워크 요청이 실패하는 조건은
`authenticated_workspace_offline.test.tsx`로 직접 보완했다. 테스트는
`navigator.onLine=false`와 호출 시 reject하는 fetch를 주입한 뒤 URL 저장 →
메모·카테고리 저장 → 보관함 검색 → 홈 꺼내보기 작업팩을 완주하고 fetch 호출이
0회임을 확인한다. 제품 코드는 변경하지 않았으며 커밋은
`49b6bb3 test: 오프라인 핵심 흐름 회귀 고정`이다.

## 발견하고 수정한 결함

### FINDING-001 검색 초기화 버튼 터치 영역

- 심각도: High
- 재현: 390·768·1280px에서 검색 초기화 버튼이 22 × 22px였다.
- 수정: 최소 너비·높이를 44px로 보장했다.
- TDD: `text_field_contract.test.ts` 실패를 먼저 확인한 뒤 CSS를 수정했다.
- 재검증: Chrome 계산값 44 × 44px, 터치와 키보드 초기화 모두 통과했다.
- 커밋: `dacfd3e fix: 검색 초기화 터치 영역 보완`
- 증거:
  `.gstack/qa-reports/screenshots/mvp05-cross-390-search-clear-after.png`

### FINDING-002 보조·성공 상태 텍스트 대비

- 심각도: High
- 재현: 흰 배경 기준 도메인 메타 텍스트 3.74:1, 성공 설명 3.77:1이었다.
- 수정: `Smoke`를 `#667085`, `Signal Green`을 `#047857`로 조정했다.
- TDD: 디자인 토큰 대비 계약을 먼저 실패시킨 뒤 토큰을 수정했다.
- 재검증: 각각 4.97:1, 5.48:1로 WCAG AA 일반 텍스트 기준을 충족했다.
- 커밋: `88c7ad2 fix: 상태 텍스트 대비 보완`
- 증거:
  `.gstack/qa-reports/screenshots/mvp05-cross-390-domain-contrast-after.png`,
  `.gstack/qa-reports/screenshots/mvp05-cross-390-success-contrast-after.png`

### FINDING-003 랜딩 헤더 터치 영역

- 심각도: High
- 재현: 랜딩 브랜드는 24px, 데스크톱 내비게이션 링크는 20px 높이였다.
- 수정: 브랜드와 내비게이션 링크의 최소 높이를 44px로 보장했다.
- TDD: `landing_page_contract.test.ts` 실패를 먼저 확인한 뒤 CSS를 수정했다.
- 재검증: 390px의 브랜드, 768·1280px의 브랜드와 링크가 모두 44px였다.
- 커밋: `ae42e5f fix: 랜딩 헤더 터치 영역 보완`
- 증거:
  `.gstack/qa-reports/screenshots/mvp05-cross-final-390-landing-after-touch.png`,
  `.gstack/qa-reports/screenshots/mvp05-cross-final-768-landing-after-touch.png`,
  `.gstack/qa-reports/screenshots/mvp05-cross-final-1280-landing-after-touch.png`

### FINDING-004 방문한 원문 링크 상태

- 심각도: High
- 재현: 방문 전·후 `원문 열기`의 시각 상태가 같았다.
- 수정: 방문한 링크에 기존 `Smoke` 토큰을 적용해 미방문 링크와 구분했다.
- 재검증: 실제 링크를 새 탭에서 연 뒤 동일 카드에서 방문 상태 차이를
  캡처했다. 브라우저 privacy 정책상 visited 계산 스타일은 읽지 않고 CSS
  규칙과 실제 화면 차이로 검증했다.
- 자동 회귀: `insight_grid_contract.test.ts`가
  `.insight-card__source:visited`와 `var(--color-smoke)`를 계약으로 고정한다.
  현재 규칙에서 PASS → 규칙을 임시 제거해 1건 RED → 복원 후 GREEN 순서로
  회귀 보호를 확인했다.
- 커밋: `ab63f94 fix: 방문한 원문 링크 상태 구분`
- 회귀 테스트 커밋: `898fafc test: 방문한 원문 링크 상태 계약 고정`
- 증거:
  `.gstack/qa-reports/screenshots/mvp05-cross-1280-visited-link-before.png`,
  `.gstack/qa-reports/screenshots/mvp05-cross-1280-visited-link-after.png`

### FINDING-005 녹색 인라인 라벨 대비

- 심각도: High
- 발견 화면: 1280px 랜딩 Hero의 `다시 꺼내보세요` 녹색 인라인 라벨
- 재현: `Signal Green` 토큰을 텍스트 용도로 어둡게 조정한 뒤 녹색 배경과
  기존 `Ink` 글자의 대비가 3.30:1로 떨어졌다.
- TDD RED: `inline_label_contract.test.ts` 단독 실행에서 녹색 tone 1건이
  실패하고 나머지 4건이 통과했다.
- 수정: 녹색 인라인 라벨의 글자색만 기존 `Canvas` 토큰으로 변경했다.
- TDD GREEN: 녹색 조합은 5.48:1이 되었고 관련 2개 파일의 6개 테스트가
  통과했다. 1280px 랜딩 Hero에서도 흰 글자를 직접 확인했다.
- 커밋: `a466755 fix: 녹색 인라인 라벨 대비 보완`
- 증거:
  `.gstack/qa-reports/screenshots/mvp05-cross-1280-inline-green-after.png`

## 시각 감사와 보류 항목

High 심각도 결함은 모두 수정했다. 다음 항목은 핵심 흐름을 막지 않는 Medium
또는 polish 수준이며, 이번 백로그의 제한된 교차 회귀 범위에서는 별도 디자인
작업으로 보류한다.

- EX·RE 썸네일 영역이 전달 정보에 비해 커 카드 밀도를 낮춘다.
- 데스크톱에서도 모바일형 하단 내비게이션을 사용한다.
- 랜딩의 반복 카드와 이모지가 제품 고유성을 약하게 만든다.
- 카테고리 가로 스크롤의 끝 힌트와 실제 기기 safe-area 확인은 추가 polish가
  필요하다.

전체 페이지 캡처에서 랜딩 꺼내보기 영역이 비어 보이거나 고정 하단
내비게이션이 콘텐츠를 덮는 것처럼 보이는 현상은 런타임 결함으로 재현되지
않았다. 실제 viewport에서 해당 영역과 작업 팩이 보였고, 페이지 하단의
상호작용 요소와 내비게이션 DOM rect도 겹치지 않았다. Chrome full-page
스크린샷의 고정 요소 합성 artifact로 분류했다.

## 시각 증거

최종 홈·보관함·저장 화면은 다음 로컬 산출물에 있다. `.gstack`은 저장소의
local exclude 대상이므로 커밋에는 포함하지 않는다.

- 390px:
  `mvp05-cross-final-390-home.png`,
  `mvp05-cross-final-390-library.png`,
  `mvp05-cross-final-390-save.png`
- 768px:
  `mvp05-cross-final-768-home.png`,
  `mvp05-cross-final-768-library.png`,
  `mvp05-cross-final-768-save-verified.png`
- 1280px:
  `mvp05-cross-final-1280-home.png`,
  `mvp05-cross-final-1280-library.png`,
  `mvp05-cross-final-1280-save-verified.png`

모든 파일의 경로 접두사는
`.gstack/qa-reports/screenshots/`이다.

## 포맷·전체 품질 게이트

Windows CRLF/LF 환경 차이는 기존 `.prettierrc`의
`"endOfLine": "auto"` 설정으로 흡수한다. 제품 파일 전체를 다시 쓰지 않고,
이번 수정 파일만 포맷했다.

정확한 `npm test`를 두 번 실행했을 때
`recomputes the same submitted workpack after edits, saves, and deletions`가
각각 5.022초와 5.094초에 기본 5초 제한을 넘어 동일하게 실패했다. 이
테스트만 실행하면 3.36초, 해당 파일 전체는 23개 테스트가 모두 통과했고,
`--maxWorkers=1` 전체 실행도 37개 파일·187개 테스트가 통과했다. 테스트는
18개의 직렬 `userEvent`로 수정·저장·삭제 뒤 동일 작업 팩 재계산을 검증해
격리 실행에서도 기본 제한의 67%를 사용한다. 이번 제품 수정과 무관한 파일
병렬 실행 자원 경합으로 확정하고, 전역 설정이나 제품 코드를 바꾸지 않은 채
이 장기 통합 테스트 한 건에만 `10_000ms` 제한을 명시했다. 커밋은
`940dfe6 test: 장기 통합 흐름 타임아웃 안정화`이다.

최종 실행 결과는 다음과 같다.

```text
npm test             # 39 files / 189 tests 통과, 42.30s
npm test -- src/entities/insight/ui/insight_grid_contract.test.ts src/app/authenticated_workspace_offline.test.tsx # 2 files / 2 tests 통과
npm run lint         # 통과
npm run format:check # 통과
npm run build        # 통과, 기존 500kB 청크 경고만 존재
git diff --check     # 통과
```

## 결론

MVP-05의 저장·보관함·검색·꺼내보기·원문 열기 핵심 흐름은 세 viewport와
키보드, 앱 로드 후 서비스 포트 중단 상태에서 통과했다. 네트워크 독립성은
자동 `navigator.onLine=false`·fetch 실패 환경에서 별도로 통과했고, 외부 원문
새 탭은 네트워크가 켜진 Chrome에서 검증했다. empty, error, success와
navigation, reduced-motion 및 저장소 실패 계약까지 교차 확인했다. GitHub
이슈와 프로젝트 상태는 변경하지 않았다.
