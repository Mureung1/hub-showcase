# 문제 해결과 포트폴리오 문서화 표준

## 목적

문서는 결과를 꾸미기 위한 산출물이 아니라, 문제를 어떻게 정의하고 어떤 기준으로
결정했으며 결과를 어떻게 검증했는지 제3자가 재현하게 하는 증거다. 구현과 문서를
같은 작업 단위에서 갱신하고 검증되지 않은 성과는 기록하지 않는다.

## 문서 선택 기준

| 질문 | 문서 |
| --- | --- |
| 이 작업의 문제·목표·과정·결과는 무엇인가? | Work Record |
| 이후 구현을 제약하는 선택과 대안은 무엇인가? | ADR |
| 예상하기 어려웠고 다시 발생할 수 있는 실패인가? | Troubleshooting |
| 가설을 수치나 반복 실행으로 비교하는가? | Experiment |
| 다른 사람이 같은 진단·복구를 수행해야 하는가? | Runbook |
| 완결된 문제 해결을 포트폴리오 관점에서 설명할 증거가 있는가? | Case Study |

하나의 작업이 여러 조건을 만족하면 Work Record를 중심으로 전문 문서를 링크한다.
PR 설명만으로 장기 결정이나 재발 장애 기록을 대체하지 않는다.

## 공통 frontmatter

템플릿 기반 문서는 `id`, `title`, `type`, `status`, `date`, `owners`, `related`를
가진다. Work Record에는 변경 추적을 위한 `paths`도 필요하다.

| type | ID | 허용 상태 |
| --- | --- | --- |
| `work-record` | `WI-0001` | `planned`, `in-progress`, `blocked`, `done` |
| `adr` | `ADR-0001` | `proposed`, `accepted`, `superseded`, `rejected` |
| `troubleshooting` | `TS-0001` | `draft`, `verified`, `retired` |
| `experiment` | `EXP-0001` | `planned`, `running`, `completed`, `invalidated` |
| `runbook` | `RUN-0001` | `draft`, `verified`, `retired` |
| `case-study` | `CASE-0001` | `draft`, `verified`, `retired` |

날짜는 `YYYY-MM-DD`, owners·related·paths는 YAML 배열로 작성한다. 새 ID는 같은
종류의 최댓값 다음 번호를 사용하고 파일명은 `ID-kebab-case.md`로 시작한다.

## Work Record 최소 내용

1. 관찰 가능한 문제와 근거
2. 목적, 성공 기준, 범위·비범위, 제약과 위험
3. 판단 기준, 검토한 대안, 선택과 트레이드오프
4. 관찰·가설·검증·결과·다음 결정으로 이어지는 문제 해결 기록
5. 구현 결과와 명령·로그·측정값·스크린샷 같은 검증 증거
6. AI 위임 범위, 채택·거절 결과, 사람이 확인한 내용
7. 남은 위험, 재검토 조건과 배운 점

내부 사고 과정이나 전체 프롬프트를 복사하지 않는다. 검토 가능한 가설과 외부화된
판단 근거만 기록한다. 비밀값, 개인정보, 운영 endpoint는 반드시 제거한다.

## 변경 추적

Work Record의 `paths`는 해당 작업이 바꿀 수 있는 경로를 glob으로 선언한다.
PR에서 바뀐 구현·설정·문서는 같은 PR에서 추가 또는 수정된 Work Record 하나
이상에 매핑되어야 한다. 자동 검사는 main과의 diff 또는 로컬 working tree를
기준으로 이 관계를 확인한다. 순환을 피하기 위해 Work Record 파일 자체와 생성된
lockfile은 추적 대상에서 제외한다.

PR은 Issue, Work Record, 관련 ADR·TS·EXP, 검증 명령과 결과를 링크한다. Issue
번호가 아직 없는 bootstrap 작업은 로컬 WI ID를 먼저 사용하고 후에 링크를 추가할
수 있다.

## 완료와 품질 규칙

- 빈 섹션, 임시 placeholder, 중복 ID, 깨진 내부 링크를 남기지 않는다.
- `done`, `accepted`, `verified`, `completed`는 검증 증거가 있을 때만 사용한다.
- 외부 링크 검사는 네트워크 장애 때문에 필수 CI와 분리한다.
- credential처럼 보이는 예시도 실제 값과 혼동되지 않도록 명백한 placeholder를 쓴다.
- 변경 후 `npm run docs:check`와 `npm run docs:test`를 실행한다.
