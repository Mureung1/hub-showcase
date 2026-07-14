# MVP-05A 저장·보관함 환경별 QA

- 실행일: 2026-07-14
- 대상 브랜치: `codex/local-first-mvp-flow`
- 대상 URL: `http://localhost:5173/`
- 범위: #4 URL 저장, #5 보관함 수정·삭제·원문 열기
- 브라우저: Codex in-app browser, Chrome
- 최종 상태: 통과

## 환경별 핵심 흐름

| CSS viewport | 저장 | 새로고침 복원 | 편집 | 삭제 취소·확정 | 원문 실제 열기 | 가로 넘침 | 콘솔 오류 |
| ------------ | ---- | ------------- | ---- | -------------- | -------------- | --------- | --------- |
| 390 × 844    | 통과 | 통과          | 통과 | 통과           | 통과           | 없음      | 없음      |
| 768 × 773    | 통과 | 통과          | 통과 | 통과           | 통과           | 없음      | 없음      |
| 1280 × 900   | 통과 | 통과          | 통과 | 통과           | 통과           | 없음      | 없음      |

각 viewport에서 URL 저장 → 앱 새로고침 → 랜딩·로그인 재진입 → 보관함 복원 → 제목·메모·카테고리 편집 → 삭제 취소 → 삭제 확정 순서로 실행했다. 삭제 뒤 다시 진입했을 때 카드가 복원되지 않는 것도 다음 viewport 시작 시 확인했다.

원문 링크는 세 환경 모두 사용자가 입력한 `originalUrl`을 유지했고, `target="_blank"`와 `rel="noreferrer"`를 사용했다. Chrome에서 각 화면 폭으로 맞춘 뒤 키보드 Enter로 링크를 활성화해 다음 주소가 실제 새 탭에서 열린 것도 확인했다.

- 390px: `https://example.com/qa-keyboard-390?utm_source=chrome&keep=1#source`
- 768px: `https://example.org/qa-source-breakpoints?screen=768#open`
- 1280px: `https://example.org/qa-source-breakpoints?screen=768#open`

## 빈 상태와 오류 상태

| 상태             | 확인 결과                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| 빈 보관함        | `링크 저장` 행동으로 저장 화면에 진입함                                                                       |
| 잘못된 URL       | `notaurl` 입력을 유지하고 `role="alert"`, `aria-invalid="true"`, `aria-describedby="save-url-error"`를 제공함 |
| URL 저장 성공    | 먼저 URL을 영속화한 뒤 선택 개인 맥락 단계를 표시함                                                           |
| 편집 실패        | 기존 카드·입력·`updatedAt` 보존과 재시도 흐름을 통합 테스트로 확인함                                          |
| 삭제 실패        | 카드를 유지하고 재시도·취소 행동을 제공하는 통합 테스트를 확인함                                              |
| 저장소 읽기 실패 | `read-failed` 복구 안내를 통합 테스트로 확인함                                                                |
| 전체/일부 손상   | `corrupted-store`, `corrupted-entry`를 구분하고 정상 항목을 유지하는 저장소·통합 테스트를 확인함              |
| 저장소 쓰기 실패 | 입력과 기존 목록을 보존하는 저장소·통합 테스트를 확인함                                                       |

브라우저 저장소의 예외·손상 주입은 브라우저 제어 표면에서 직접 만들 수 없어 `local_storage_insight_repository.test.ts`, `use_insight_workspace.test.tsx`, `authenticated_workspace.test.tsx`의 실제 오류 분기 테스트로 보완했다.

## 접근성과 키보드

- 주요 입력은 모두 화면에 보이는 `<label>`과 연결돼 있다.
- 측정된 모든 보이는 버튼과 링크의 높이·너비는 최소 44px 이상이다.
- 현재 화면은 `aria-current="page"`, 카테고리 필터는 `aria-pressed`로 선택 상태를 함께 전달한다.
- 편집 진입 시 제목 입력으로, 편집 저장·취소 시 원래 수정 버튼으로 포커스가 이동한다.
- 삭제 확인 진입 시 `삭제 확정`으로, 취소 시 원래 삭제 버튼으로, 마지막 카드 삭제 시 보관함 검색으로 포커스가 이동한다.
- Chrome 390px 환경에서 실제 키보드 입력으로 `서비스 경험하기` → 로그인 → 저장 화면 → URL·제목·메모·카테고리 입력 → 맥락 저장 → 보관함 → 원문 새 탭 열기 → 편집 → 삭제 확인 → 삭제 취소 → 삭제 재진입 → 삭제 확정을 완주했다.
- 버튼과 링크는 Enter로, 삭제 버튼은 Space로 활성화했다. 삭제 취소 뒤 원래 삭제 버튼, 최종 삭제 뒤 보관함 검색으로 포커스가 돌아오는 것도 실제 DOM 상태로 확인했다.
- `insight_grid.test.tsx`, `authenticated_workspace.test.tsx`, `app_navigation.test.tsx`도 같은 포커스 복원과 네이티브 버튼 의미론을 회귀 검증한다.

## 서비스 포트 중단·자동 오프라인 검증

브라우저 앱을 먼저 로드한 상태에서 이 QA가 띄운 정적 개발 서버 `:5173`과 API 개발 서버 `:3001`을 모두 종료하고 포트가 닫힌 것을 확인했다. 운영체제와 Chrome의 외부 네트워크는 끄지 않았으며, 이미 로드된 앱에서 다음 흐름을 계속 완료했다.

1. 새 URL 저장
2. 보관함 카드 확인
3. 제목 수정
4. 삭제 취소
5. 삭제 확정

이 브라우저 검증은 서비스 포트 의존성이 없다는 증거다. 브라우저가 오프라인을 보고하고 네트워크 요청이 실패하는 조건은 `authenticated_workspace_offline.test.tsx`에서 `navigator.onLine=false`와 호출 시 reject하는 fetch를 주입해 보완했다. 자동 테스트는 URL 저장 → 메모·카테고리 저장 → 보관함 검색 → 홈 꺼내보기 작업팩을 완주하고 fetch 호출이 0회임을 확인한다. 서버 재시작 뒤 페이지가 다시 로드됐을 때 삭제된 카드도 복원되지 않았다.

외부 원문을 실제 새 탭에서 여는 검증은 네트워크가 켜진 Chrome에서 별도로 수행했으며, 이를 인터넷 단절 증거로 사용하지 않는다.

## 발견·수정한 결함

### ISSUE-001 — Windows에서 전체 Prettier 검사가 87개 파일을 실패 처리함

- 심각도: Medium
- 재현: `npm run format:check`
- 원인: 실제 유효 설정인 `.prettierrc`가 플랫폼별 줄바꿈을 허용하지 않아 기존 CRLF 파일을 전부 스타일 오류로 판정함
- 수정: `.prettierrc`에 `"endOfLine": "auto"` 추가
- 변경: 파일 1개, 설정 1줄
- 커밋: `f1a932d fix: Windows 환경 Prettier 줄바꿈 검사 보완`
- 재검증: format check, lint, build, 36 files / 184 tests, `git diff --check` 통과

## 콘솔과 시각 증거

- 앱 콘솔 error: 0
- Chrome 실제 키보드·원문 열기 재검증에서도 앱 콘솔 error: 0
- 개발 도구 warning: Vite `@vite/client`의 `Invalid scope` 2건. 앱 소스나 production build 오류가 아니며 사용자 흐름에는 영향이 없었다.
- `documentElement.scrollWidth > innerWidth`: 세 viewport 모두 `false`
- 로컬 스크린샷: `.gstack/qa-reports/screenshots/`

## 최종 품질 명령

```text
npm test -- --maxWorkers=1  # 36 files / 184 tests
npm run lint                # pass
npm run format:check        # pass
npm run build               # pass, 기존 500kB chunk warning만 존재
git diff --check            # pass
```

## 결론

#15의 저장·보관함 핵심 흐름은 세 화면 폭, 앱 로드 후 서비스 포트 중단 상태, 자동 `navigator.onLine=false`·fetch 실패 환경에서 완료됐다. 발견된 Windows 포맷 검사 결함도 수정·재검증했다. 브라우저 저장소 강제 오류는 자동화 회귀 테스트로 보완했다. Chrome 390px에서 키보드만으로 전체 흐름을 완주했고, 네트워크가 켜진 Chrome의 세 화면 폭 모두 원문 링크가 보존된 주소로 실제 새 탭에서 열리는 것을 확인했다.
