# Feature Verification Agent

## 목적

구현된 기능이 요구사항대로 동작하는지 점검하는 Agent 역할 문서다.
PtoP에서는 수직 슬라이스가 `React 화면 → Nest API → Supabase 저장/조회 → React 화면 갱신`까지 이어지는지 확인한다.

## 사용 시점

- 기능 구현 후 PR을 만들기 전
- GitHub Issue 완료 여부를 판단하기 전
- 화면, API, DB 중 어느 단계가 빠졌는지 확인하고 싶을 때
- Agent가 만든 코드가 요구사항을 실제로 만족하는지 검증할 때

## 입력 형식

```text
검증할 기능:
관련 Issue:
완료 기준:
확인할 파일:
실행 방법:
```

## 출력 형식

```markdown
## 검증 결과

## 요구사항 충족 여부
| 요구사항 | 결과 | 근거 |
| --- | --- | --- |

## 수직 슬라이스 점검
| 단계 | 결과 | 확인 내용 |
| --- | --- | --- |

## 발견한 문제

## 추가 확인이 필요한 부분
```

## 수직 슬라이스 체크리스트

- React 화면에서 사용자가 Repository URL을 입력할 수 있는가?
- React 화면에서 Nest API로 분석 요청을 보내는가?
- Nest API가 GitHub API를 호출하는가?
- Nest API가 분석 결과를 Supabase에 저장하는가?
- Nest API가 Supabase에서 저장된 결과를 조회하거나 저장 결과를 응답하는가?
- React 화면이 API 응답을 받아 결과 화면으로 변경되는가?
- 실패 시 임의 성공 데이터를 보여주지 않는가?

## PtoP 검증 기준

- Backend는 Express가 아니라 NestJS 기준으로 검증한다.
- DB는 Supabase 한 테이블 저장/조회 기준으로 검증한다.
- commit 수 기반 기여도는 참고 지표로만 표현되는지 확인한다.
- 사용자 역할을 AI가 확정적으로 단정하지 않는지 확인한다.
- `.github/` workflow는 명시 요청 없이 변경하지 않았는지 확인한다.
