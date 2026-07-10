# context

이번 작업에 필요한 파일만 읽고, 불필요한 파일은 제외한다.

## 기본으로 읽을 파일

모든 제품 관련 작업:

- `docs/PRD.md`
- `HARNESS/README.md`

## 작업별 추가 컨텍스트

| 작업 | 추가로 읽을 파일 |
|---|---|
| 아키텍처·도메인 설계 | `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, `docs/GOTCHAS.md` |
| UI·문구·프로토타입 수정 | `docs/UI_GUIDE.md`, `docs/CODE_MAP.md`, `prototype/index.html`, `prototype/styles.css` |
| 테스트·검증 | `docs/TEST_PLAN.md`, `docs/CODE_MAP.md` |
| ADR 작성 | `docs/adr/README.md`, 관련 기존 ADR |
| 블랙컨슈머 대응 | `docs/PRD.md` 2.5, `docs/GOTCHAS.md`, `docs/UI_GUIDE.md` |
| README·사용자 안내 | `README.md`, `docs/PRD.md`, `docs/CODE_MAP.md` |

## 보통 읽지 않을 파일

- `.git/`
- `.agents/`
- `.github/` — CI나 PR 템플릿 작업이 아니면 읽지 않는다.
- 생성물, 캐시, 빌드 산출물

## 참고용 파일

- `docs/stitch_design_PRD.md`는 초기 디자인 프롬프트 기록용 파일이다.
- 현재 제품 기준은 `docs/PRD.md`이므로, 두 문서가 다르면 `docs/PRD.md`를 따른다.

## 컨텍스트 선택 원칙

- 먼저 `rg --files`로 현재 구조를 확인한다.
- 관련 파일을 읽기 전에는 추측으로 수정하지 않는다.
- 문서와 코드가 다르면 PRD 기준으로 판단하고, 필요한 경우 문서·코드 중 무엇을 맞출지 보고한다.
