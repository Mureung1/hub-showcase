# 스킬 목록

이 프로젝트(`.claude/skills/`)에 있는 스킬들을 한눈에 보는 인덱스입니다. 각 스킬의 상세 규칙은 해당 폴더의 `SKILL.md`에, 실제 적용 규칙은 대부분 `docs/*.md`에 있습니다 — 여기는 "언제 뭘 쓰는지"만 빠르게 찾기 위한 문서입니다. `CLAUDE.md`에도 각 스킬이 관련 섹션마다 연결돼 있으니, 스킬 자체를 고치면 `CLAUDE.md`의 해당 줄도 같이 갱신하세요.

| 스킬 | 언제 쓰나 | 근거 문서 |
| --- | --- | --- |
| [`code-convention`](code-convention/SKILL.md) | 코드를 작성·수정·리뷰할 때 (새 파일·컴포넌트·라우트·서비스·모델 포함) 항상 먼저 | [docs/conventions.md](../../docs/conventions.md) |
| [`security-convention`](security-convention/SKILL.md) | 새 라우트/컨트롤러 작성·수정, 배포 설정(환경변수·CORS·헤더) 다룰 때 | [docs/security.md](../../docs/security.md) |
| [`backend-testing`](backend-testing/SKILL.md) | 새 서비스 함수·라우트 추가 또는 회귀 테스트가 필요할 때 (유닛/통합테스트 작성) | [docs/testing.md](../../docs/testing.md) |
| [`firstpr-ui`](firstpr-ui/SKILL.md) | 랜딩·화면·컴포넌트 등 UI를 만들거나 정리할 때 | [docs/design.md](../../docs/design.md) |
| [`api-smoke-test`](api-smoke-test/SKILL.md) | 새 API 라우트 구현·수정 후 실제 기동·요청으로 검증할 때 | [docs/openapi.yaml](../../docs/openapi.yaml) |
| [`pr-draft`](pr-draft/SKILL.md) | 업스트림(connect-AIAgentChallenge-26-1/hub)에 PR 올리기 전 초안 작성 | `.github/pull_request_template.md` |
| [`commit-message`](commit-message/SKILL.md) | 커밋 메시지를 작성할 때 (`<type>: <한글 설명>` 컨벤션) | — |
| [`explain-work`](explain-work/SKILL.md) | 작업 내용을 "자세히"·"하나하나" 설명해달라는 요청 | — |

## 스킬 추가 시 체크리스트

새 스킬을 만들 때는 보통 다음 조합을 같이 만듭니다 (`security-convention`/`backend-testing`이 이 패턴의 예시):

1. `docs/<주제>.md` — 규칙을 "이미 코드에 있는 실제 패턴"에서 뽑아 문서화 (지어내지 않기)
2. `.claude/skills/<이름>/SKILL.md` — 그 문서를 단일 진실 소스로 적용하는 스킬
3. `CLAUDE.md`에 문서·스킬 링크 추가 (관련 섹션에 — 새 섹션이 필요하면 새로 만들어도 됨)
4. 이 파일(`README.md`)의 표에 한 줄 추가
5. `docs/log.md`에 오늘 날짜로 추가 기록
