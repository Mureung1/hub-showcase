<!--
PR 제목: [N123_이규민] 데모 핵심 수직슬라이스와 Showcase 완성
권장 라벨: feature, documentation
-->

## 주요 작업 리스트

- 데모 핵심 시나리오를 `QANDA 공고 선택 → 개발자 CV → Minimal Clean 생성 → Supabase 저장·재조회`로 확정
- 월요일 완료 기능과 이후 기능, 화면·서버·DB별 점검 결과를
  [데모 핵심 흐름 문서](https://github.com/dolphin1404/NaverConnect_wm/blob/codex/week3-job-targeted-portfolio/cv-to-portfolio/docs/monday-demo-core-flow-2026-07-27.md)에 기록
- 원격 Supabase에 `is_favorite` migration이 아직 없어도 핵심 저장·목록·상세 조회가 멈추지
  않도록 PostgREST `42703` 구버전 스키마 호환 경로 추가
- 구버전 스키마에서 저장·목록·상세 조회가 모두 동작하는 서버 회귀 테스트 추가
- 공식 Showcase 가이드에 맞춘 `showcase/showcase.json`, 썸네일, 화면 캡처 2장 추가
- README에서 데모 완료 기록과 Showcase로 이동할 수 있도록 연결

### 동작 화면

![기업·공고 선택](https://raw.githubusercontent.com/dolphin1404/NaverConnect_wm/codex/week3-job-targeted-portfolio/cv-to-portfolio/showcase/screenshots/target-selection.webp)

![생성 결과](https://raw.githubusercontent.com/dolphin1404/NaverConnect_wm/codex/week3-job-targeted-portfolio/cv-to-portfolio/showcase/screenshots/generated-result.webp)

### 확인 결과

- [x] Client tests 17개 통과
- [x] Server tests 14개 통과
- [x] ESLint 통과
- [x] Vite production build 통과
- [x] 실제 브라우저에서 QANDA → CV → 디자인 → 생성 흐름 확인
- [x] React 저장 버튼 → Express → Supabase INSERT 성공
- [x] 브라우저 새로고침 뒤 최신 UUID의 목록·상세 HTML 재조회 성공
- [x] 공식 가이드의 `showcase.json` 형식 검사 통과

## 내가 설명할 수 있는 부분

`server/src/services/portfolios.service.js`의 구버전 DB 스키마 호환 처리를 설명할 수 있습니다.

원격 DB에는 즐겨찾기 migration이 아직 적용되지 않아 `is_favorite`를 SELECT하는 목록 API가
`42703`으로 실패했습니다. 즐겨찾기는 데모 이후 기능이지만 이 선택 컬럼 때문에 핵심 저장·
조회까지 멈추고 있었습니다. 그래서 먼저 최신 컬럼으로 요청하고, Supabase가 정확히
`42703`과 `is_favorite` 누락을 반환한 경우에만 기존 컬럼 목록으로 한 번 더 요청합니다.
다른 DB 오류는 숨기지 않고 그대로 전달합니다.

이 방식으로 최신 DB에서는 즐겨찾기 값을 함께 읽고, 기존 DB에서는 `isFavorite: false`를
기본값으로 사용해 핵심 수직슬라이스를 유지합니다. 저장·목록·상세 세 경로에 같은 호환 함수를
적용하고 회귀 테스트에서 총 6번의 요청과 반환 값을 확인했습니다.

## 아직 이해 못 한 부분

- Anthropic 환경 변수는 서버에서 인식하지만 실제 생성 요청은 실패하고 있습니다. 모델 이름,
  API 키 권한, 외부 API 오류 본문 중 어느 것이 원인인지 추가 진단이 필요합니다.
- 원격 Supabase migration을 CLI로 자동 배포하는 환경은 아직 구성하지 않았습니다. 현재는
  SQL Editor에서 migration을 적용해야 즐겨찾기 PATCH까지 실제 DB에서 동작합니다.
- Showcase의 실제 서비스 URL과 데모 영상 URL은 아직 별도 배포·업로드가 필요합니다. 현재
  JSON에는 저장소와 발표 자료 경로를 연결했습니다.

## 새로 알게 된 것

- 기능의 우선순위가 낮아도 선택 컬럼 하나가 공통 SELECT에 들어가면 핵심 흐름 전체를 막을 수
  있으므로, migration 시점과 하위 호환 범위를 함께 설계해야 합니다.
- 외부 DB를 stub한 통합 테스트가 통과해도 실제 원격 스키마와 다르면 E2E는 실패할 수
  있습니다. 브라우저 저장과 새로고침 후 재조회가 별도로 필요합니다.
- Supabase PostgREST 오류 코드 `42703`은 존재하지 않는 컬럼을 구분하는 근거로 사용할 수
  있지만, 이 코드에만 좁게 반응해야 다른 장애를 숨기지 않습니다.
- Showcase는 JSON만 추가하는 것이 아니라 프로젝트 최상위 `showcase/` 안에 WebP 썸네일과
  스크린샷을 함께 두고 공식 검사기까지 통과해야 합니다.
