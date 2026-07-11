# 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다

상태: 채택

현재 Runtime Harness가 저장소 작업공간의 `.ay-ple/runtime-*`를 사용하는 것은 개발 중 실행 상태를 프로젝트별로 격리하기 위한 의도적인 기본값이다. 지금 이 경로를 이전할 필요는 없다. 다만 `npx ay-ple` 같은 제품 실행에서는 패키지 설치 위치, 기기별 앱 데이터, 사용자가 소유한 학기 작업공간의 수명과 백업 정책이 서로 다르므로 하나의 `.ay-ple/` 루트나 호출 당시의 `process.cwd()`에 묶지 않는다.

## 결정

- `packageRoot`는 AY-PLE 소스와 버전을 고정한 Codex 실행 파일을 담는 읽기 전용 또는 일시적인 설치 영역이다. 사용자 상태를 저장하지 않는다.
- `appDataRoot`는 운영체제 사용자별 앱 데이터 영역이다. MVP는 이 안에 하나의 app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 두고 Codex config, 인증, native session·log·memory 상태와 앱의 작업공간 등록 정보를 전역 `~/.codex`에서 분리한다.
- `workspaceRoot`는 사용자가 선택하고 소유하는 `N학년 N학기` 폴더이며 Codex 작업의 `cwd`다. 과목 폴더와 기존 학업 자료 구조를 그대로 수용하고, AY-PLE가 확인한 학업 상태가 필요하면 이 루트에 앱 전용 상태로 둔다. 모든 자료를 미리 정한 `sources/` 구조로 옮기거나 과목마다 별도 runtime home을 만들지 않는다.
- `AGENTS.md`와 Skills는 Codex의 native 탐색·로딩 규칙을 따른다. workspace-local 지시문과 Skill, app-managed `CODEX_HOME`의 개인화 설정을 앱이 별도 상속 체계로 복제하지 않는다.
- built-in Memories는 app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME` pair에서 Codex가 소유한다. 4주 MVP는 한 번에 하나의 현재 학기 작업공간을 주로 사용한다는 전제에서 `[features] memories = true`, `[memories] generate_memories = true`, `use_memories = true`를 명시하고 eligibility·auth를 smoke로 확인한 뒤 사용한다. 현재 launcher는 아직 이를 활성화하지 않으며, 설정 뒤에도 모든 작업이 memory를 생성한다고 보장하지 않는다. memory는 편의 맥락이며 `SemesterModel`의 source of truth가 아니다. 학기 전환 시 두 root를 함께 다루는 초기화·보관·분류 정책은 후속 제품 결정으로 남긴다.
- 하나의 경로 배치 seam이 세 루트의 불변 조건과 명시적으로 주입된 값을 검증한다. 운영체제 기본값은 패키징 단계에서 이 seam 뒤에 추가하고, 호출 당시의 `process.cwd()`를 암묵적인 제품 기본값으로 사용하지 않는다.
- 환경 변수는 경로 모델을 대신하지 않고 명시적인 재정의 수단으로만 사용한다. 제품화할 때 `AY_PLE_DATA_DIR` 같은 앱 데이터 재정의를 제공하고, 앱이 계산한 값을 `CODEX_HOME`과 `CODEX_SQLITE_HOME`으로 주입한다. 기존 `CODEX_BIN_PATH`와 `RUNTIME_HISTORY_DIR`는 개발·테스트 재정의로 유지한다.
- Codex `thread` 참조와 session은 기기별 실행 연결 정보다. 학기·과목·`ModelingRun`의 정체성이 아니고 `SemesterModel`이나 `WorkspaceHistory`의 source of truth도 아니다. `appDataRoot`를 잃어도 사용자가 소유한 자료와 확인된 제품 상태는 `workspaceRoot`에서 다시 열 수 있어야 한다.

## 격리 한계

- app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair는 사용자의 일반 Codex 환경과 AY-PLE 환경 사이의 설정·인증·session·memory 오염을 줄이지만 OS process나 파일 권한을 격리하지 않는다.
- 하나의 app-managed runtime-home pair는 학기별 memory 격리를 자동으로 보장하지 않는다. MVP에서는 현재 학기 하나를 지속해서 사용하는 단순한 운영 가정을 택하고, 여러 학기 동시 사용과 학기 rollover는 별도 정책이 생길 때 다룬다.
- `CODEX_HOME`만 바꿔도 inherited host `HOME`의 `.agents/skills`나 개인 plugin discovery까지 사라진다고 가정하지 않는다. 제품 실행의 child environment와 실제 discovery 결과를 검증하기 전에는 완전한 Skill 격리를 주장하지 않는다.
- Codex sandbox와 approval policy는 에이전트 동작 범위를 제한하지만 container, VM 또는 별도 OS user의 보안 경계를 대신하지 않는다.

## 결과

이 결정은 현재 Runtime Harness의 경로를 결함으로 만들거나 즉시 데이터 이전을 요구하지 않는다. W2/W3의 첫 제품 연결은 테스트나 명시적 설정으로 주입한 세 root를 받는 최소 layout seam부터 검증한다. 운영체제별 `appDataRoot` 기본값, override·migration, `npx ay-ple` 진입점과 완성된 workspace 선택 UX는 패키징 시점의 후속 결정으로 남긴다. 여러 학기 사이의 memory rollover도 같은 시점에 별도로 정한다.

이 ADR은 [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)의 개발자용 Runtime Diagnostic History 위치를 바꾸지 않는다. 구체적인 격리 조건과 후속 구현 항목은 [Codex Runtime Isolation](../architecture/codex-runtime-isolation.md)에서 관리한다.
