# 작업 계획: T23 — 기술 배포·실기기 확인

> 상태: 종료
>
> 작성일: 2026-07-23
>
> 최종 갱신일: 2026-07-23
>
> 현재 단계: 자동·Production HTTP/API와 실제 모바일·카카오톡 수동 gate 모두 통과
>
> 다음 행동: 없음 — T31 기술 MVP 통합 DoD로 인계
>
> CHECKLIST 항목: T23

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 로컬 테스트와 이전 기능별 검증만으로는 현재 공개 Production의 카드·실 AI·fallback·결과 다듬기·복사가 같은 배포 버전에서 함께 동작하는지, 실제 모바일·카카오톡 인앱 브라우저에서도 완료 가능한지 보장할 수 없다.
- 목표 결과: 하나의 Production deployment SHA를 고정해 공개 접근, 두 AI route, 로컬 template fallback, 결과 수정·복원·복사, server-only 비밀, 모바일·인앱 호환을 재검증한다. T22는 `Pending`으로 분리하고 기술 검증을 사용자 효과 근거로 표현하지 않는다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | T17·T20·T21·T29·T32·T33·T34·T36이 완료 상태이고 검증 전후 Production deployment ID·SHA가 같다. | CHECKLIST·GitHub deployment 재조회 | 필수 |
| AC-2 | 공개 Production이 HTTP 200으로 S0 HTML·클라이언트 자산을 제공하고 기본 문서 title이 답냥이와 일치한다. | HTTP 응답·HTML·asset 요청 | 필수 |
| AC-3 | 합성 `guided_ai`와 `manual_ai` 요청이 Production `/api/generate`에서 `source=ai`, tone 1·2·3 정확히 3개를 반환한다. | 개인정보 없는 고정 요청 각 1회·응답 구조 검사 | 필수 |
| AC-4 | `template_fallback`은 API를 호출하지 않고, guided 실패는 같은 카드 template을 보존하며 manual 실패는 입력·기존 후보를 보존한다. | App·generation 회귀 테스트 | 필수 |
| AC-5 | S3의 새 초안 생성·이전 1세트 보기/복원·직접 수정·원문 복원·복사가 stale 응답과 실패에서 기존 후보를 잃지 않는다. | App RTL과 실제 브라우저 흐름 | 필수 |
| AC-6 | provider·DB·Voyage 비밀이 클라이언트 산출물에 없고 T22 `Pending`·사용자 검증/경쟁 우위 주장 금지가 배포 기록에 명시된다. | dist 문자열 검사·정본 대조 | 필수 |
| AC-7 | 320×568·375×667 모바일에서 가로 넘침 없이 카드·guided/manual·이메일 결과와 키보드 흐름을 완료한다. | 실제 브라우저/실기기 수동 검증 | 필수 |
| AC-8 | 카카오톡 인앱 브라우저에서 성공 복사 또는 텍스트 자동 선택 fallback과 접근 가능한 안내를 확인한다. | 실제 모바일 카카오톡 인앱 수동 검증 | 필수 |
| AC-9 | 전체 테스트·API 타입검사·템플릿/DB drift·lint·production build·하네스·diff 검사가 통과한다. | 최종 자동 품질 gate | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T17·T20·T21·T29·T32·T33·T34·T36 모두 CHECKLIST 완료. T22는 사용자 결정으로 `Pending`인 후속 외부 가치 검증이며 T23 의존성이 아니다.
- CHECKLIST 본문이 직접 가리키는 문서·구간: `docs/MVP.md` 기술 DoD, `docs/CICD.md` Vercel 배포, `docs/SPEC.md` 2장 생성 route, `docs/UX.md` 복사 피드백.
- 추가로 확인한 정본: `docs/EDGE_CASES.md` API·클립보드·세션 실패, T29·T32~T36 검증 보고서.
- 이번 작업에서 바꾸지 않는 계약·범위: 제품 UI·API·DB schema, 템플릿·프롬프트·모델, Production 설정, T22 기준, retrieval 운영 비활성 상태.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: ORCH-2·T22/T23 구조 문서·하네스 변경이 미커밋이고 제품 `src/`·`api/` 코드는 현재 Production SHA와 같다. 사용자 소유 CSV·`tmp/`·`continue-dabnyangi-task` 초안은 미추적 상태다.
- 기존 변경 중 반드시 보존할 파일·의도: ORCH-2와 T22 분리 변경 전체, 사용자 소유 미추적 파일, 로컬 전용 `.github/workflows/ci.yml`.
- 이번 작업이 소유하는 경로: `harness/tasks/T23-technical-deployment-device/`, T23 관련 `docs/LOG.md`·완료 시 `docs/CHECKLIST.md`.
- 검증 대상 후보: GitHub Production deployment `5564774983`, SHA `b9d6b2563d666b57a39894d74c106090dc301329`, 공개 도메인 `https://dabnyang.vercel.app/`.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React+TypeScript/Vite와 Vercel `/api`의 현재 Production을 검증한다. 새 기능·라이브러리·배포 설정을 추가하지 않고 T22 사용자 효과와 분리된 기술 호환만 판정한다. |
| 구체성 | 제품 코드는 변경하지 않는다. T23 plan/verification과 LOG에 배포 ID·SHA, HTTP/API 관찰값, 자동·수동 gate를 연결한다. 결함이 발견될 때만 별도 수정 범위를 제안한다. |
| 역할·예시 | `guided_ai`는 `groupwork/schedule/ask_availability`, `manual_ai`는 `professor/initiate/ask` 합성 사실만 전송해 tone 1·2·3을 확인한다. 실제 사용자 원문·식별자는 쓰지 않는다. |
| 단계화 | ① 정본·SHA 동결 ② 전체 자동 회귀 ③ 공개 HTML·asset·API·bundle 비밀 검사 ④ 실제 브라우저 320/375·키보드 ⑤ 모바일·카카오톡 인앱 복사 순서로 진행한다. |
| 검증 | AC별 자동 관찰값과 수동 환경을 검증 보고서에 연결한다. 실제 브라우저·실기기 증거가 없으면 T23을 체크하지 않고 `보류`로 남긴다. |

## 5. 변경 경계와 위험

- 허용된 변경: 정본 승인 반영, T23 계획·검증·LOG, 검증 중 발견한 결함은 별도 제안 후 승인된 최소 수정.
- 명시적으로 제외한 변경: T22 결과 생성, 새 분석·피드백 기능, Vercel 보호 설정 변경, 유료 기능, retrieval 운영 활성화, 커밋·push.
- 구조·계약·의존성 승인이 필요한 지점: T22/T23 분리는 2026-07-23 승인 완료. 검증 중 제품 계약 변경이 필요하면 즉시 중단하고 별도 승인받는다.
- 예상 위험과 대응: 공개 Production 도메인은 push로 바뀔 수 있으므로 검증 전후 deployment ID·SHA를 대조한다. 고유 deployment URL은 Vercel 로그인 대상이라 공개 도메인을 쓰되 검증 중 push하지 않는다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-23 | 승인됨 | T22를 후속 외부 가치 검증으로 분리하고 T23 기술 배포·실기기 검증 진행 | 사용자 “승인 진행” |

범위나 완료조건이 바뀌면 구현을 중단하고 이 표와 관련 항목을 갱신한 뒤 재승인받는다.

## 7. 진행·인계

- 마지막으로 끝낸 단계: 사용자가 [`manual-checklist.md`](manual-checklist.md)의 네 수동 시나리오를 모두 통과했다고 확인해 AC-5·AC-7·AC-8을 마감했다.
- 현재 작업 중인 단계: 없음. T23 필수 AC와 자동·수동 검증을 모두 통과했다.
- 다음 행동: T31 기술 MVP 통합 DoD를 시작한다.
- 보류 사유와 재개 조건: 없음. 기기·OS·브라우저 버전과 원시 캡처는 별도로 수집하지 않았으며, 수동 결과는 사용자의 2026-07-23 완료 확인을 근거로 한다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-23 | T23 착수 | 승인된 구조에서 새 직접 의존 8개가 모두 완료 |
| 2026-07-23 | PM 단독 실행 | 하나의 배포 버전을 순차 검증하는 작업이라 독립 writer가 없고 위임 인계비가 더 큼 |
| 2026-07-23 | 자동·Production 검증 통과 | 44파일 375테스트·집중 2파일 111테스트, 타입·템플릿·DB·lint·build, 공개 asset, guided/manual 실 API, secret marker 0건 |
| 2026-07-23 | 수동 gate에서 보류 | Browser 연결 결과 사용 가능한 backend가 없어 실제 320/375·모바일·카카오톡 인앱 증거는 생성하지 않음 |
| 2026-07-23 | T23 종료 | 사용자가 네 수동 시나리오를 모두 통과했다고 확인. 환경 메타데이터·원시 캡처는 별도 보관하지 않음 |
