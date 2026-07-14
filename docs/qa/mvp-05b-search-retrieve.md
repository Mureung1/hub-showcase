# MVP-05B 검색·꺼내보기 환경별 QA

- 실행일: 2026-07-14
- 대상 브랜치: `codex/local-first-mvp-flow`
- 대상 URL: `http://localhost:5173/`
- 범위: #6 보관함 결정적 검색, #7 현재 상황 기반 꺼내보기
- 브라우저: Chrome
- 최종 상태: 통과

## 환경별 핵심 흐름

| CSS viewport | 메모 검색 | 도메인 검색 | 검색 원문 새 탭 | 상황 입력·추천 | 작업팩 원문 새 탭 | 결과 없음 복구 | 가로 넘침 | 콘솔 오류 |
| ------------ | --------- | ----------- | ---------------- | -------------- | ------------------ | -------------- | --------- | --------- |
| 390 × 844    | 통과      | 통과        | 통과             | 통과           | 통과               | 통과           | 없음      | 없음      |
| 768 × 900    | 통과      | 통과        | 통과             | 통과           | 통과               | 통과           | 없음      | 없음      |
| 1280 × 900   | 통과      | 통과        | 통과             | 통과           | 통과               | 통과           | 없음      | 없음      |

Chrome viewport override를 적용한 뒤 `window.innerWidth`가 각각 390, 768, 1280인지 확인했다. 세 환경 모두 검색어 입력 → 결과 확인 → 원문 열기와 현재 상황 입력 또는 추천 상황 선택 → 작업팩 확인 → 원문 열기를 실제 사용자 흐름으로 실행했다.

## 검색과 원문 열기

- 메모 단서 `팀 프로젝트`, `포트폴리오`, `포트폴리오 UI`가 기대 카드로 좁혀졌다.
- 도메인 단서 `example.com`, `react.dev`가 해당 도메인 카드를 포함한 결과를 만들었다. 공유 토큰이 있는 다른 카드도 함께 노출될 수 있으며 이는 `docs/retrieve.md`의 여러 토큰 점수 합산 계약과 일치한다.
- 검색 결과 원문 링크를 Enter로 활성화해 다음 `originalUrl`이 실제 새 탭에서 열린 것을 확인했다.
  - 390px: `https://example.com/qa-search-domain?utm_source=qa`
  - 768px: `https://react.dev/learn/forms`
  - 1280px: `https://example.org/qa-ui-reference`
- 768px의 외부 `react.dev/learn/forms` 페이지는 새 탭에서 정확한 주소를 열었지만 외부 사이트가 `Not Found` 제목을 반환했다. 사용자가 저장한 원문 주소를 그대로 여는 앱 동작은 정상이며 외부 콘텐츠 상태는 이 이슈의 제품 결함으로 분류하지 않았다.

## 꺼내보기와 작업팩

- 직접 입력 `팀 프로젝트 앱 로그인`, `개발 공부 폼 상태`가 관련 인사이트를 작업팩으로 만들었다.
- 추천 상황 `팀 프로젝트`, `개발 공부`, `UI 레퍼런스`를 Space로 선택했다. 선택 즉시 입력이 추천 문구로 바뀌고 선택 버튼에 `aria-pressed="true"`가 설정됐다.
- 작업팩 연결 단서는 실제 일치 필드만 사용했다. 브라우저에서 `메모의 “팀” 단서가 겹쳐요.`, `메모의 “UI” 단서가 겹쳐요.`, `“개발” 카테고리에 저장했어요.`를 확인했다.
- 작업팩 원문 링크를 Enter로 활성화해 다음 `originalUrl`이 실제 새 탭에서 열린 것을 확인했다.
  - 390px: `https://example.com/qa-search-domain?utm_source=qa`
  - 768px: `https://react.dev/learn/forms`
  - 1280px: `https://example.com/qa-search-domain?utm_source=qa`

## 결과 없음과 실제 다음 행동

| 상태 | 입력 보존 | 실행한 다음 행동 | 결과 |
| ---- | --------- | ---------------- | ---- |
| 검색 결과 없음 | `존재하지않는단서390`, `발견불가단서1280` 유지 | `검색어 지우기`, `링크 저장` | 전체 목록 복원, 저장 화면 진입 |
| 꺼내보기 결과 없음 | `양자역학 실험실 장비 구매`, `항공 우주 재료 실험`, `심해 생물 관찰 장비` 유지 | 추천 상황 선택, `보관함 보기` | 새 작업팩 생성, 보관함 진입 |

검색 결과 없음은 입력을 지우지 않고 검색어를 줄이거나 다른 단서를 쓰도록 안내했다. 꺼내보기 결과 없음도 입력 문장을 안내에 그대로 포함했다. 안내만 확인하지 않고 각 화면의 다음 행동을 키보드로 실제 실행했다.

## 접근성과 키보드

- 검색과 현재 상황 입력은 화면에 보이는 `<label>`과 연결돼 있다.
- 현재 화면은 `aria-current="page"`, 카테고리와 추천 상황은 `aria-pressed`로 선택 상태를 전달한다.
- 서비스 진입, 로그인, 화면 이동, 검색 입력, 추천 상황 선택, 작업팩 생성, 원문 열기, 빈 상태 복구를 키보드 입력과 Enter·Space로 실행했다.
- 세 viewport 모두 검색 결과와 작업팩에서 원문 링크를 키보드로 열어 실제 새 탭 생성을 확인했다.

## reduced-motion

- Chrome QA 환경의 실제 미디어 값은 `prefers-reduced-motion: no-preference`였다. 선택한 브라우저 제어 표면은 미디어 선호도 override를 제공하지 않아 브라우저에서 강제로 `reduce`를 만들지는 않았다.
- `onboarding_motion_preview.test.tsx`의 `keeps the final work pack visible without creating a timeline for reduced motion` 회귀 테스트를 별도로 실행했다.
- 결과: reduced-motion에서 GSAP timeline을 만들지 않고 최종 작업팩을 정적으로 표시하는 테스트 2개가 통과했다.

## 오프라인 검증

앱을 로드한 뒤 개발 서버 `:5173`과 API 서버 `:3001`의 listening process를 모두 종료하고 포트가 닫힌 것을 확인했다. 열린 앱에서 다음 흐름을 계속 완료했다.

1. 보관함에서 `포트폴리오 UI` 검색
2. 검색 결과 카드 확인
3. 홈으로 이동
4. `개발 공부 폼 상태` 입력
5. 작업팩 2개와 연결 단서 확인

검색과 꺼내보기는 원격 fetch 없이 브라우저 로컬 상태에서 동작했고 콘솔 error가 발생하지 않았다. 검증 뒤 `npm run dev`를 다시 실행해 `:5173`과 `:3001`이 모두 listening 상태로 돌아온 것을 확인했다.

## 콘솔과 시각 증거

- 앱 콘솔 error: 0
- `documentElement.scrollWidth > innerWidth`: 390·768·1280px 모두 `false`
- 로컬 스크린샷:
  - `.gstack/qa-reports/screenshots/mvp05b-390-retrieve.png`
  - `.gstack/qa-reports/screenshots/mvp05b-768-search.png`
  - `.gstack/qa-reports/screenshots/mvp05b-1280-retrieve.png`
- `.gstack` 산출물은 로컬 exclude 상태이며 커밋에 포함하지 않는다.

## 발견·수정한 결함

재현되는 제품 결함이 없었다. 제품 소스와 기존 테스트는 변경하지 않았으며 결함별 TDD 수정 사이클도 열지 않았다.

## 최종 품질 명령

```text
npm test -- --maxWorkers=1  # 36 files / 184 tests
npm run lint                # pass
npm run format:check        # pass
npm run build               # pass, 기존 500kB chunk warning만 존재
git diff --check            # pass
```

## 결론

#16의 검색·꺼내보기 핵심 흐름은 세 화면 폭, 키보드 전용 조작, 로컬 오프라인 상태에서 완료됐다. 검색과 작업팩의 원문은 세 화면 폭 모두 실제 새 탭에서 사용자가 저장한 주소로 열렸다. 빈 상태는 입력을 보존했고 제시된 다음 행동도 실제로 복구 흐름을 이어갔다. reduced-motion은 브라우저 override 제약을 자동 회귀 테스트로 보완했다.
