# 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다

분류: 활성

성숙도: 채택

Developer-only Runtime Harness 상태와 제품 실행 상태는 수명과 복구 책임이 다르다. 제품 실행에서는 설치, 기기별 runtime 상태, 사용자 소유 학기 자료의 수명과 백업 정책도 서로 다르므로 하나의 root나 호출 당시의 `process.cwd()`에 묶지 않는다.

## 결정

| Root | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `packageRoot` | AY-PLE 코드와 버전을 고정한 Codex 실행 파일 | 사용자 상태와 학기 자료 |
| `appDataRoot` | 하나의 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair, 기기별 runtime 연결 정보와 workspace registry | 확인된 학업 사실과 사용자 원본 |
| `workspaceRoot` | 사용자가 선택한 `N학년 N학기` 폴더, RawMaterial과 확인된 AY-PLE 학기 상태, Codex 작업 `cwd` | 인증, Codex native session·log·memory 상태 |

- 하나의 제품 경로 배치 seam이 세 root와 그 불변 조건을 검증한다. `CODEX_HOME`과 `CODEX_SQLITE_HOME`은 분리할 수 없는 pair로 주입하고, `workspaceRoot`는 사용자가 명시적으로 선택한다.
- 호출 당시의 `process.cwd()`를 암묵적인 제품 workspace로 사용하지 않는다. 환경 변수는 경로 모델을 대신하지 않고 명시적인 재정의 수단으로만 사용한다.
- `appDataRoot`를 잃어도 사용자가 소유한 자료와 확인된 제품 상태는 `workspaceRoot`에서 다시 열 수 있어야 한다. Codex thread와 session은 학기·과목·ModelingRun의 정체성이 아니다.
- 이 결정은 developer-only Runtime Harness의 기존 저장 경로를 제품 layout으로 이전하거나 재배치하도록 요구하지 않는다.

## 결과

첫 제품 연결은 테스트나 명시적 설정으로 주입한 세 root를 받는 최소 layout seam을 구현해야 한다. 운영체제별 기본 경로, override·migration, packaged entrypoint와 여러 학기 사이의 runtime-home 수명 정책은 이 불변 조건 뒤에서 결정한다.

이 ADR은 [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)의 developer-only Runtime Diagnostic History 위치를 바꾸지 않는다. 현재 구현, 채택한 제품 목표와 후속 기술 항목은 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 구분해 관리하고, 우선순위는 [4주 개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
