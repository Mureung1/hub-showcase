# 전체 개발 일정 및 백로그 계획

## 목표

2주차부터 PtoP를 본격적으로 개발하기 위해, 4주간의 개발 작업을 백로그 형태로 정리한다.  
이번 문서는 개발 중 방향이 흔들리지 않도록 "무엇을, 어떤 우선순위로, 언제까지" 진행할지 정하는 기준 문서다.

## 백로그란?

백로그(backlog)는 앞으로 해야 할 작업을 우선순위와 함께 모아둔 작업 목록이다.

단순한 TODO와 다른 점은 다음과 같다.

- 작업의 목적과 우선순위가 함께 적혀 있다.
- 지금 당장 할 일과 나중에 할 일을 구분한다.
- 기능, 버그, 개선, 문서, 기술 부채를 한 곳에서 관리한다.
- 개발 중 새로운 아이디어가 생겨도 바로 구현하지 않고 백로그에 넣어 비교한다.

## 백로그가 필요한 이유

PtoP는 Repository 분석, 회고 초안 생성, 사용자 입력, 백엔드 API, 배포 등으로 확장될 수 있는 방향이 많다.  
백로그가 없으면 기능 욕심이 커져 핵심 기능 2개가 흐려질 수 있다.

따라서 이번 프로젝트에서는 백로그를 통해 다음 기준을 유지한다.

- 문제 정의를 직접 해결하는 기능부터 개발한다.
- UI보다 데이터 흐름과 분석 결과의 신뢰도를 우선한다.
- AI가 만든 결과를 그대로 믿지 않고 사용자가 검증할 수 있게 한다.
- 4주 안에 완료 가능한 MVP 범위를 유지한다.

## 우선순위 기준

| 우선순위 | 의미 | 기준 |
| --- | --- | --- |
| P0 | 반드시 해야 함 | 이 작업이 없으면 MVP가 동작하지 않음 |
| P1 | 중요함 | MVP의 완성도와 사용성을 높임 |
| P2 | 있으면 좋음 | 시간이 남으면 진행할 확장 작업 |

## Task 상태 기준

| 상태 | 의미 |
| --- | --- |
| Todo | 아직 시작하지 않음 |
| In Progress | 작업 중 |
| Review | 구현 후 직접 검증 또는 피드백 대기 |
| Done | 구현과 검증 완료 |
| Later | 이번 MVP 범위에서는 보류 |

## 4주 개발 로드맵

| 주차 | 목표 | 완료 기준 |
| --- | --- | --- |
| 1주차 | 기획, 프로토타입, Agent 문서, 디자인 시스템 정리 | 문제 정의, 핵심 기능, 프로토타입, 디자인 기준 문서 완료 |
| 2주차 | Repository URL 입력 이후의 핵심 분석 흐름 구현 | URL 검증, GitHub API 요청, 분석 결과 데이터 가공, 결과 화면 연결 완료 |
| 3주차 | 분석 결과 기반 회고 초안 흐름 구현 | 사용자가 분석 결과와 회고 질문 답변을 바탕으로 회고 초안과 Markdown 결과를 확인할 수 있음 |
| 4주차 | 최적화, UX 개선, 사용자 테스트, 직접 만든 내부 라이브러리 적용 | 사용자가 테스트 가능한 배포본과 개선된 UX, 재사용 가능한 내부 라이브러리 확보 |

### 3주차 확장 후보

Repository 분석이 끝나기 전까지의 대기 시간을 활용해, AI가 사용자에게 프로젝트 의도와 문제 해결 과정을 묻는 짧은 질문을 던진다.
사용자는 채팅 또는 간단한 입력 형태로 답변을 남기고, PtoP는 `repo 분석 결과 + 사용자 답변`을 함께 사용해 더 개인적인 회고/포트폴리오 초안을 만든다.

이 기능은 repo 분석 결과가 안정적으로 저장되고 조회되는 흐름이 먼저 완성된 뒤 도입한다.

## 다음 주까지 끝낼 작업

2주차에는 이미 도입한 모노레포 구조와 기본 UI를 바탕으로, 사용자가 GitHub Repository URL을 입력한 다음 실제로 어떤 결과를 받는지 구현하는 데 집중한다.

다음 주 완료 목표:

- GitHub Repository URL 파싱과 유효성 검증 구현
- 분석 시작 시 로딩, 실패, 성공 상태를 명확히 분리
- GitHub API로 repository 기본 정보, 참여자, 최근 commit 정보를 가져오기
- API 응답을 PtoP 결과 화면에 맞는 데이터 구조로 변환
- 참여자별 commit 수 기반 기여도 퍼센트 계산
- 사용자가 입력한 GitHub ID 또는 Repository owner 기준으로 주요 작업 단서 추출
- 분석 결과 화면에 프로젝트 개요, 참여자, 기여도, 주요 작업을 표시
- 비공개 repository, 잘못된 URL, API rate limit 상황의 오류 안내 구현
- 동일 URL 재분석 시 중복 요청을 줄이기 위한 간단한 캐싱 전략 검토
- 3주차 회고 초안 생성 기능에 넘길 분석 결과 타입 확정

## 개발 Task 목록

| ID | Week | 우선순위 | 상태 | 작업 | 완료 기준 |
| --- | --- | --- | --- | --- | --- |
| T-01 | Week2 | P0 | Todo | Repository URL parser 구현 | `https://github.com/owner/repo`, trailing slash, `.git` suffix를 owner/repo로 변환한다. |
| T-02 | Week2 | P0 | Todo | Repository URL 유효성 검증 | GitHub repository 형식이 아니면 API 요청 전에 오류 문구를 보여준다. |
| T-03 | Week2 | P0 | Todo | 분석 상태 모델 정리 | idle, loading, success, error 상태와 각 상태에서 보여줄 UI가 명확히 분리된다. |
| T-04 | Week2 | P0 | Todo | Repository 기본 정보 조회 | GitHub API로 repository 이름, 설명, 언어, star, fork, 원문 링크를 가져온다. |
| T-05 | Week2 | P0 | Todo | 참여자 정보 조회 | contributors API로 참여자 login, avatar, commit 수를 가져온다. |
| T-06 | Week2 | P0 | Todo | 최근 commit 정보 조회 | commits API로 최근 commit message, author, date, url을 가져온다. |
| T-07 | Week2 | P0 | Todo | 분석 결과 데이터 변환 | GitHub API 응답을 프로젝트 개요, 참여자, 기여도, 주요 작업 단서 형태로 가공한다. |
| T-08 | Week2 | P0 | Todo | 기여도 퍼센트 계산 | 참여자 commit 수 합계를 기준으로 각 참여자의 기여도 비율을 계산한다. |
| T-09 | Week2 | P0 | Todo | 주요 작업 단서 추출 | 사용자가 입력한 GitHub ID 또는 repository owner의 최근 commit message를 주요 작업 후보로 묶는다. |
| T-10 | Week2 | P0 | Todo | 분석 결과 화면 연결 | URL 입력 후 성공 시 프로젝트 개요, 참여자, 기여도, 주요 작업 단서를 한 화면에 표시한다. |
| T-11 | Week2 | P0 | Todo | 오류 처리 구현 | 존재하지 않는 repository, private repository, rate limit, 네트워크 오류를 구분해 안내한다. |
| T-12 | Week2 | P0 | Todo | 다시 분석하기 흐름 구현 | 결과 또는 오류 상태에서 URL을 수정하고 다시 분석할 수 있다. |
| T-13 | Week2 | P1 | Todo | GitHub ID 입력 옵션 추가 | 비워두면 owner 기준, 입력하면 해당 사용자의 commit 단서를 우선 표시한다. |
| T-14 | Week2 | P1 | Todo | 분석 결과 신뢰도 표시 | commit 수 기반 지표라는 한계와 사용자가 직접 확인해야 할 내용을 결과 화면에 표시한다. |
| T-15 | Week2 | P1 | Todo | API 응답 캐싱 전략 검토 | 같은 URL을 반복 분석할 때 중복 요청을 줄일 수 있는 간단한 캐싱 기준을 정한다. |
| T-16 | Week2 | P1 | Todo | 분석 결과 타입 문서화 | 3주차 회고 초안 생성에 넘길 result object 구조를 문서로 남긴다. |
| T-17 | Week2 | P1 | Todo | 사용자 피드백 수집 질문 작성 | 분석 결과가 포트폴리오 정리에 충분한지 확인할 질문을 작성한다. |
| T-18 | Week2 | P1 | Todo | Week3 회고 초안 Task 재정리 | 실제 분석 결과 구조를 바탕으로 회고 초안 구현 Task를 다시 쪼갠다. |
| T-19 | Week3 | P0 | Later | 회고 초안 생성 입력값 구성 | 분석 결과에서 회고 초안에 필요한 프로젝트 개요, 역할 단서, 주요 작업을 추출한다. |
| T-20 | Week3 | P0 | Later | 회고 초안 생성 UI 구현 | 사용자가 분석 결과를 확인한 뒤 회고 초안을 생성할 수 있다. |
| T-21 | Week3 | P0 | Later | 회고 초안 편집 흐름 구현 | 자동 생성된 문장을 사용자가 직접 수정할 수 있다. |
| T-22 | Week3 | P1 | Later | Markdown 내보내기 | 결과를 포트폴리오용 Markdown으로 복사하거나 저장한다. |
| T-23 | Week3 | P1 | Later | 분석 결과 저장 구조 검토 | DB에 저장할 분석 결과와 회고 초안의 최소 데이터 구조를 확정한다. |
| T-24 | Week3 | P1 | Later | 분석 중 회고 질문 기록 | 분석 대기 시간에 AI가 프로젝트 의도, 해결한 문제, 협업 경험을 묻고 사용자가 짧게 답변할 수 있다. |
| T-25 | Week4 | P0 | Later | 사용자 테스트 및 피드백 반영 | 실제 사용자 피드백을 받아 우선순위가 높은 개선점을 반영한다. |
| T-26 | Week4 | P0 | Later | UX 개선 | 입력, 로딩, 결과, 오류, 빈 상태 흐름이 더 자연스럽게 개선된다. |
| T-27 | Week4 | P0 | Later | 성능 최적화 | 이미지, 번들 크기, API 요청, 로딩 상태를 점검하고 개선한다. |
| T-28 | Week4 | P1 | Later | 내부 UI 유틸 라이브러리 제작 | 버튼, 카드, 상태 배지, 로딩 UI를 직접 만든 재사용 컴포넌트로 정리한다. |
| T-29 | Week4 | P1 | Later | 내부 분석 유틸 라이브러리 제작 | Repository URL 파싱, 기여도 계산, commit message 정규화 로직을 직접 만든 유틸로 분리한다. |
| T-30 | Week4 | P1 | Later | 접근성 점검 | 키보드 접근, aria label, 색상 대비, 오류 안내 문구를 점검한다. |
| T-31 | Week4 | P2 | Later | 최종 배포와 발표 자료 갱신 | 데모 링크, README, 발표 자료, 회고 문서를 최신 상태로 정리한다. |

## GitHub Project 입력용 백로그

GitHub Project를 만들 때 아래 필드를 사용한다.

| Field | 값 |
| --- | --- |
| Status | Todo, In Progress, Review, Done, Later |
| Priority | P0, P1, P2 |
| Week | Week2, Week3, Week4 |
| Type | Research, Design, Backend, Frontend, Docs, Agent |
| Task ID | T-01 형식 |

2주차에 Project에 먼저 등록할 백로그:

| Task ID | Title | Priority | Week | Type | Status |
| --- | --- | --- | --- | --- | --- |
| T-01 | Repository URL parser 구현 | P0 | Week2 | Frontend | Todo |
| T-02 | Repository URL 유효성 검증 | P0 | Week2 | Frontend | Todo |
| T-03 | 분석 상태 모델 정리 | P0 | Week2 | Frontend | Todo |
| T-04 | Repository 기본 정보 조회 | P0 | Week2 | Backend | Todo |
| T-05 | 참여자 정보 조회 | P0 | Week2 | Backend | Todo |
| T-06 | 최근 commit 정보 조회 | P0 | Week2 | Backend | Todo |
| T-07 | 분석 결과 데이터 변환 | P0 | Week2 | Backend | Todo |
| T-08 | 기여도 퍼센트 계산 | P0 | Week2 | Backend | Todo |
| T-09 | 주요 작업 단서 추출 | P0 | Week2 | Backend | Todo |
| T-10 | 분석 결과 화면 연결 | P0 | Week2 | Frontend | Todo |
| T-11 | 오류 처리 구현 | P0 | Week2 | Frontend | Todo |
| T-12 | 다시 분석하기 흐름 구현 | P0 | Week2 | Frontend | Todo |
| T-13 | GitHub ID 입력 옵션 추가 | P1 | Week2 | Frontend | Todo |
| T-14 | 분석 결과 신뢰도 표시 | P1 | Week2 | Frontend | Todo |
| T-15 | API 응답 캐싱 전략 검토 | P1 | Week2 | Backend | Todo |
| T-16 | 분석 결과 타입 문서화 | P1 | Week2 | Docs | Todo |
| T-17 | 사용자 피드백 수집 질문 작성 | P1 | Week2 | Research | Todo |
| T-18 | Week3 회고 초안 Task 재정리 | P1 | Week2 | Docs | Todo |

## 2주차 상세 작업 순서

1. Repository URL parser와 유효성 검증을 먼저 구현한다.
2. 입력값이 잘못됐을 때 API 요청 없이 오류 상태를 보여준다.
3. 분석 상태를 `idle`, `loading`, `success`, `error`로 분리한다.
4. GitHub repository 기본 정보 API를 연결한다.
5. contributors API를 연결하고 참여자 목록을 만든다.
6. commits API를 연결하고 최근 작업 단서를 만든다.
7. commit 수 합계 기준으로 기여도 퍼센트를 계산한다.
8. API 응답을 PtoP 결과 화면용 데이터 구조로 변환한다.
9. 성공 결과를 프로젝트 개요, 참여자, 기여도, 주요 작업 단서로 표시한다.
10. private repository, 존재하지 않는 repository, rate limit 오류를 분리해 안내한다.
11. GitHub ID 입력 옵션을 붙여 owner 기준 분석의 한계를 줄인다.
12. 분석 결과 타입을 문서화해 3주차 회고 초안 생성 작업의 입력값으로 사용한다.
13. 사용자 피드백 질문은 구현 흐름을 방해하지 않는 범위에서 작성한다.

## 4주차 최적화 및 직접 제작 라이브러리 계획

4주차에는 기능을 단순히 추가하기보다, 실제 사용자가 테스트할 수 있는 품질로 다듬는 데 집중한다.  
또한 외부 라이브러리를 무분별하게 도입하기보다, 작은 범위의 내부 라이브러리를 직접 만들어보며 재사용성과 구조를 학습한다.

### UX 개선 목표

- 첫 화면에서 Repository 입력 목적이 더 명확하게 보이게 한다.
- 분석 중 상태가 지루하지 않고, 현재 어떤 작업을 하는지 알려준다.
- 오류가 발생했을 때 사용자가 다음 행동을 알 수 있게 한다.
- 분석 결과에서 "참고 지표"와 "사용자가 직접 확인해야 하는 내용"을 구분한다.
- 모바일 화면에서도 입력, 결과, 복사 버튼이 자연스럽게 동작한다.

### 최적화 목표

- 이미지 용량과 사용 위치 점검
- Vite 번들 크기 확인
- 불필요한 렌더링과 상태 업데이트 제거
- GitHub API 요청 중복 방지
- 로딩/실패 상태에서 화면이 크게 흔들리지 않도록 레이아웃 안정화
- Lighthouse 또는 브라우저 개발자 도구 기준으로 기본 성능 확인

### 직접 만들어볼 내부 라이브러리 후보

| 라이브러리 | 목적 | 포함할 기능 |
| --- | --- | --- |
| `packages/ui` | PtoP 전용 UI 컴포넌트 | Button, Card, Badge, Spinner, EmptyState, ErrorMessage |
| `packages/repo-utils` | Repository 분석 공통 유틸 | GitHub URL parser, contribution percent calculator, commit message normalizer |
| `packages/markdown` | 결과 내보내기 유틸 | 분석 결과를 Markdown 문자열로 변환 |

초기에는 별도 npm 배포까지 하지 않고, 모노레포 내부에서만 사용하는 작은 라이브러리로 만든다.  
외부 UI 라이브러리 도입은 최소화하고, PtoP에서 반복되는 UI와 분석 로직만 직접 추출한다.

### 내부 라이브러리 작성 기준

- 2곳 이상에서 반복될 때만 라이브러리로 분리한다.
- 비즈니스 로직과 UI 컴포넌트를 섞지 않는다.
- 과한 추상화보다 현재 프로젝트에서 읽기 쉬운 구조를 우선한다.
- 테스트하기 쉬운 순수 함수부터 `packages/repo-utils`로 분리한다.
- 디자인 시스템과 맞지 않는 범용 컴포넌트는 만들지 않는다.

## 관리 방식

이번 프로젝트에서는 별도 도구 없이 markdown 백로그로 시작한다.  
작업이 커지거나 협업자가 늘어나면 GitHub Issues 또는 Project Board로 옮긴다.

관리 규칙:

- 새로운 아이디어는 바로 구현하지 않고 백로그에 먼저 추가한다.
- P0 작업이 끝나기 전에는 P2 작업을 시작하지 않는다.
- 작업 완료 시 완료 기준을 기준으로 직접 검증한다.
- Agent에게 작업을 맡길 때는 Task ID 단위로 작게 요청한다.
- 설계 Task와 개발 Task를 병행하되, 개발 속도가 느려지면 P0 구현 Task를 우선한다.
- 내부 라이브러리는 학습 목적이 있지만, MVP 기능보다 앞서지 않는다.

## 보류할 확장 아이디어

아래 기능은 서비스 방향에는 맞지만, 2주차 MVP 개발 중에는 바로 구현하지 않는다.

- 여러 Repository 비교
- Notion 내보내기
- GitHub Pages 포트폴리오 자동 생성
- 기업 JD 기반 포트폴리오 맞춤 생성
- AI 기반 역할 추론 자동화
- 대용량 Repository 전체 코드 분석

## 전체 개발 일정 체크리스트

- [x] 백로그의 의미와 필요성 정리
- [x] 우선순위 기준 정의
- [x] 4주 개발 로드맵 작성
- [x] 다음 주 완료 목표 작성
- [x] 2주차 Repository URL 이후 구현 Task 목록 작성
- [x] GitHub Project 입력용 백로그 작성
- [x] 4주차 최적화 및 UX 개선 계획 작성
- [x] 직접 제작할 내부 라이브러리 후보 정리
- [x] README에 문서 링크 추가
