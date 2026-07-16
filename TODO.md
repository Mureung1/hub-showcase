# TODO

## 현재 작업

- PRD 기준으로 실제 제품 구현 범위를 MVP와 Phase 2로 분리한다.
- 정적 프로토타입(`prototype/index.html`, `prototype/styles.css`)을 기준으로 화면·도메인·검증 문서를 맞춘다.
- 다음 구현 전에 생산용 기술 스택과 데이터 저장 방식을 확정한다.

## 완료된 기반 작업

- `HARNESS/`에 `00` 탐색부터 `08` 프로덕션 인계까지 이어지는 Phase 계약과 Provider-independent Controller를 구성했다.
- Worker의 완료 선언과 분리된 인수 기준 검증, 정확한 경로의 Git 체크포인트, 재시도·승인·실행 잠금·서명된 상태 및 이벤트 기록을 추가했다.
- 실패의 현상, 원인 가설, 증거, 조치, 재검증, 다음 처분을 Attempt·Failure 단위로 보존하도록 구성했다.
- 안전 기본값으로 Worker 명령, 네트워크, 외부 부작용, 프로덕션 권한을 비활성화했다.
- `HARNESS/tests/test_prototype.py`로 필수 화면·링크, 리뷰 수동 게시 흐름, 악성 대응 안전 문구, Phase 2 비활성 경계와 접근성·반응형·인쇄 기본값을 자동 검증한다.

## 다음 작업

1. 실제 앱 스택을 결정하고 ADR을 추가한다.
   - 후보 예시: Next.js/React, FastAPI, SQLite/PostgreSQL, LLM API 연동 방식
   - 결정 전에는 `src/`, `app/`, `server/` 같은 구현 폴더를 만들지 않는다.
2. MVP 도메인 모델을 정의한다.
   - Review, ReplyDraft, StoreProfile, AnalysisReport, ResponseCase
3. 리뷰 분류·답글 생성의 입출력 계약을 먼저 문서화한다.
4. 실제 브라우저에서 HTML·CSS 프로토타입의 시각 품질과 클릭 흐름을 검증한다.
   - 큰 글자와 색 대비, 모바일 배치, 화면 이동, 인쇄 결과
   - 자동 정적 회귀 테스트는 통과했지만 브라우저 검증을 대체하지 않는다.
5. 하네스 로컬 실행 설정을 확정한다.
   - `HARNESS/config.local.json`: 사용할 Agent Provider의 비대화형 명령과 환경변수 allowlist/redaction
   - staging/production 전용 배포 adapter 실행 파일, 불변 ID와 실제 SHA-256
   - Provider·OS에서 실제 강제한 sandbox profile 식별자
   - 실행 환경: 32바이트 이상의 `HARNESS_JOURNAL_KEY`
   - `HARNESS/inputs.local.json`: LLM, 스테이징, 프로덕션 대상과 비밀 환경변수 참조
   - 필요한 단계에 한해서만 network, external side effects, production capability 활성화
6. 스테이징·프로덕션 배포 대상, 도메인, 모니터링·헬스체크와 롤백 책임을 결정한다.
7. Provider 자체의 파일·명령·네트워크 sandbox를 적용하고 하네스 보안 회귀 테스트를 통과시킨다.
8. 선택한 배포 플랫폼용 adapter와 signed deployment receipt 발급·검증을 구현한다.

하네스는 위 결정을 순서대로 실행할 기반이며, 실제 앱·API·DB·AI 연동과 서비스 배포는 아직 구현되지 않았다.
