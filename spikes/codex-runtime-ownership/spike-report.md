# AY-PLE Runtime Ownership Spike Report

작성일: 2026. 7. 7. PM 3:02:38
상태: 성공

## 실행 환경

| 항목 | 값 |
| --- | --- |
| OS | darwin 25.5.0 |
| Node | v22.22.3 |
| @openai/codex pin | 0.142.5 |
| local Codex version | codex-cli 0.142.5 |
| local Codex binary | `<spike-root>/node_modules/.bin/codex` |
| CODEX_HOME | `<spike-root>/runtime/codex-home` |
| CODEX_SQLITE_HOME | `<spike-root>/runtime/sqlite` |
| 실행 명령 | spike |

## 결과 요약

| 기준 | 결과 | 관찰 |
| --- | --- | --- |
| Binary ownership | PASS | bare codex resolved to fake global trap and failed as expected |
| Version ownership | PASS | codex-cli 0.142.5 |
| State ownership | PASS | app-managed CODEX_HOME과 CODEX_SQLITE_HOME을 child env에 지정 |
| Subscription auth proof | PASS | auth.json exists in app-managed CODEX_HOME |
| App-server lifecycle | PASS | initialize succeeded; result keys: codexHome, platformFamily, platformOs, userAgent |
| Global operation safety | PASS | 전역 `~/.codex`에 rename/delete/chmod/reset 수행 없음 |
| Global snapshot comparison | OBSERVED_CHANGE | 변화 감지됨. 현재 Codex 세션 등 외부 요인 가능성이 있어 원인 단정 안 함 |

## 전역 상태 확인

| 구분 | exists | item count | skipped | hash | newest mtime |
| --- | --- | ---: | ---: | --- | --- |
| before | true | 18011 | 0 | 87262d29ac4e6179 | 2026-07-07T06:02:37.545Z |
| after | true | 18011 | 0 | bb58a08ff11bcff9 | 2026-07-07T06:02:37.884Z |

전역 `~/.codex`는 rename, delete, chmod, reset하지 않았고 파일 내용도 읽지 않았다. Snapshot은 파일명/크기/mtime 기반 aggregate hash만 사용했다.

## 민감정보 처리

| 항목 | 처리 |
| --- | --- |
| `auth.json` 내용 | 읽거나 기록하지 않음 |
| OAuth URL | report 또는 runtime summary에 저장하지 않음 |
| raw login log | 저장하지 않음 |
| token 계열 환경변수 | child env에서 제거 |

## 남은 리스크

- app-server는 공식 문서상 experimental이므로 pinned version별 smoke test가 계속 필요하다.
- macOS desktop packaging에서 native optional dependency가 누락되지 않는지 별도 packaging spike가 필요하다.
- file auth store는 격리 증명을 위해 선택한 방식이며, 제품 UX에서는 keychain 기반 운영과 비교해야 한다.
- 전역 snapshot 변화가 감지될 경우 현재 실행 중인 Codex app 자체의 로그 갱신과 spike 영향을 구분하기 어렵다.

## 다음 단계

- 성공 결과를 바탕으로 AY-PLE runtime adapter 인터페이스를 설계한다.
- 다음 spike에서는 실제 학기 task가 아니라 `thread/start`와 취소/approval 흐름 같은 runtime lifecycle만 확장 검증한다.
