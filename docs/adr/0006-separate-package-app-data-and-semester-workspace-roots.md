# 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다

상태: 채택

현재 Runtime Harness가 저장소 작업공간의 `.ay-ple/runtime-*`를 사용하는 것은 개발 중 실행 상태를 프로젝트별로 격리하기 위한 의도적인 기본값이다. 지금 이 경로를 이전할 필요는 없다. 다만 `npx ay-ple` 같은 제품 실행에서는 패키지 설치 위치, 기기별 앱 데이터, 사용자가 소유한 학기 작업공간의 수명과 백업 정책이 서로 다르므로 하나의 `.ay-ple/` 루트나 `process.cwd()`에 묶지 않는다.

## 결정

- `packageRoot`는 AY-PLE 소스와 버전을 고정한 Codex 실행 파일을 담는 읽기 전용 또는 일시적인 설치 영역이다. 사용자 상태를 저장하지 않는다.
- `appDataRoot`는 운영체제 사용자별 앱 데이터 영역이다. `CODEX_HOME`, `CODEX_SQLITE_HOME`, Codex 인증·세션·로그, 작업공간 등록 정보와 기기별 runtime 연결 정보를 둔다.
- `workspaceRoot`는 사용자가 선택하고 소유하는 학기 작업공간이다. RawMaterial과 `.ay-ple/semester.sqlite`, Agent context, ModelingRun 기록, WorkspaceHistory 같은 제품 상태를 두며 Codex 작업의 `cwd`로 사용한다.
- 하나의 경로 배치 모듈이 세 루트의 기본값과 불변 조건을 소유한다. 제품 경로는 UI 또는 `--workspace`로 선택한 작업공간을 기준으로 계산하고, 호출 당시의 `process.cwd()`를 암묵적인 제품 기본값으로 사용하지 않는다.
- 환경 변수는 경로 모델을 대신하지 않고 명시적인 재정의 수단으로만 사용한다. 제품화할 때 `AY_PLE_DATA_DIR` 같은 앱 데이터 재정의를 제공하고, 앱이 계산한 값을 `CODEX_HOME`과 `CODEX_SQLITE_HOME`으로 주입한다. 기존 `CODEX_BIN_PATH`와 `RUNTIME_HISTORY_DIR`는 개발·테스트 재정의로 유지한다.
- Codex `thread` 참조와 세션은 기기별 실행 연결 정보다. SemesterModel이나 WorkspaceHistory의 source of truth가 아니며, `appDataRoot`를 잃어도 `workspaceRoot`의 제품 상태는 다시 열 수 있어야 한다.

## 결과

이 결정은 현재 Runtime Harness의 경로를 결함으로 만들거나 즉시 데이터 이전을 요구하지 않는다. 제품용 경로 배치 모듈과 이전·재정의 정책은 `npx ay-ple` 배포 흐름 또는 실제 사용자 학기 작업공간을 활성화하는 기능을 구현할 때 함께 만든다. 운영체제별 `appDataRoot` 기본 위치, 작업공간 선택 UX, 기존 제품 데이터의 이전 UX는 그 시점에 확정할 후속 결정으로 남긴다.

이 ADR은 [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)의 개발자용 Runtime Diagnostic History 위치를 바꾸지 않는다. 구체적인 격리 조건과 후속 구현 항목은 [Codex Runtime Isolation](../architecture/codex-runtime-isolation.md)에서 관리한다.
