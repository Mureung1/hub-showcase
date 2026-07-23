# 검증 보고서: T34 — 구조화 카드 맥락·guided AI 흐름

> 상태: 통과
>
> 검증일: 2026-07-22
>
> 관련 계획: [`plan.md`](plan.md)
>
> 판정: T34 완료

## 1. 검증 범위

- 4관계×6카드 질문 24개와 질문당 option 3개, 총 72개 stable ID 카탈로그
- `template_fallback | guided_ai | manual_ai` 요청 계약과 서버 정본 ID 해석
- 카드→질문→guided AI, 질문 없는 기본 초안, 직접 설명 AI 병렬 경로
- 기본 초안의 S3 인라인 질문, guided answer 변경·재생성, 같은 카드 결정적 fallback
- 원문·UI transcript·수정문·영구 사용자 ID를 새 요청·로그·DB에 저장하지 않는 경계
- 직접 설명·교수 이메일·복사·세션·T36 결과 다듬기 회귀

## 2. 완료조건별 결과

| 완료조건 | 결과 | 근거 |
| --- | --- | --- |
| AC-1 질문·option coverage | 통과 | 24카드, 질문 24개, option 72개, stable ID·순서·관계/상황 일치 전수 테스트 |
| AC-2 사실·추측 경계 | 통과 | option 의도와 금지 추론을 typed catalog에 분리했고 정본과 동기화된 `guided-context-review-draft.md`의 24질문·72옵션을 사용자가 확인 |
| AC-3 request discriminated union | 통과 | 세 route의 필수·금지·unknown 필드와 잘못된 card/question/option 조합 거절 |
| AC-4 세 경로·연속 동선 | 통과 | option 탭=`guided_ai` 1회, 질문 없는 초안=API 0회, 직접 설명=`manual_ai`. S3 인라인 질문·같은 answer 재시도·기존 후보 보존 확인 |
| AC-5 서버 신뢰 경계 | 통과 | stable ID만 받고 서버 카탈로그에서 purpose·prompt fact 복원. UI label·transcript·클라이언트 의미 문장은 prompt에 미포함 |
| AC-6 생성·fallback | 통과 | fake provider 성공·timeout·429·500·취소 경계 자동 검증. Production 합성 `guided_ai` 1회가 HTTP 200·tone 1/2/3 반환 |
| AC-7 결과 신뢰 카피 | 통과 | 결과 요약은 provider가 아닌 UI 카탈로그 label로 구성. 기본 초안·guided 실패는 option 미반영을 명시하며 사용자가 실화면 확인 |
| AC-8 비저장 경계 | 통과 | schema·metric·repository allowlist에 받은 원문·상황·후보·UI transcript·영구 사용자 ID 없음 |
| AC-9 기존 흐름·접근성 | 통과 | 직접 설명 AI·이메일·복사·세션·초점·live status 회귀 통과. 사용자가 320/375·키보드·스크린리더 확인 완료 |
| AC-10 전체 품질 gate | 통과 | 43파일 369테스트, 프론트·API 타입, template drift, DB check, lint, build 통과 |

## 3. Production `guided_ai` 증거

- URL: Production `/api/generate`
- 요청: `initiate + groupwork + schedule + haeyo + co.groupwork.schedule.ask_availability`의 합성 stable ID 조합. 실제 사용자 원문·식별자는 사용하지 않음.
- 결과: HTTP 200, `source=ai`, toneLevel 1·2·3와 정본 톤 label 반환.
- 사실 경계: 세 후보는 팀원이 가능한 시간을 묻고 조율하는 행위만 포함하며 임의의 날짜·시간을 만들지 않음.
- `situationSummary`·`warning`은 SPEC 2장의 허용된 선택 메타데이터로 런타임 길이 검증을 통과했다. 화면의 `선택한 내용`은 이 메타데이터를 신뢰하지 않고 로컬 label로 구성한다.

## 4. 자동 검증

| 항목 | 결과 | 근거·관찰 |
| --- | --- | --- |
| T34 관련 기준선 | 통과 | 7파일 165개. 검토표 동기화 테스트 추가 전 기준선 |
| 검토표 동기화 | 통과 | `guidedContext.test.ts` 4개. 24질문·72옵션의 질문·label·prompt fact가 검토표와 일치 |
| 전체 테스트 | 통과 | `npm test`: 43파일 369개. jsdom `Window.scrollTo` 미구현 로그만 존재 |
| 프론트 타입 | 통과 | `npx tsc -b --pretty false` |
| API 타입 | 통과 | `npm run typecheck:api` |
| 템플릿 무결성 | 통과 | `npm run templates:check` |
| DB 스키마 | 통과 | `npm run db:check` |
| 린트 | 통과 | `npm run lint` |
| 생산 빌드 | 통과 | `npm run build`; main 351.09 kB/87.87 kB gzip, CatCanvas 882.64 kB/234.53 kB gzip. 기존 500 kB 경고만 존재 |

## 5. 수동 검증

| 시나리오 | 기대 결과 | 현재 결과 | 상태 |
| --- | --- | --- | --- |
| 24질문·72옵션 문구 | 관계·카드에 맞고 세 option이 구분되며 선택 외 사실을 추측하지 않음 | 사용자가 24질문·72옵션 전수 확인 | 통과 |
| 320×568·375×667 | guided option이 한 열 전체 폭으로 보이고 가로 넘침 없음 | 사용자가 두 viewport 실화면 확인 | 통과 |
| 키보드·스크린리더 | 질문 heading 초점, 세 option·기본 초안·직접 설명 순회, 선택 후 live 생성 안내와 결과 heading 전환 인지 | 자동 속성·초점 검증과 사용자 실화면 확인 완료 | 통과 |

## 6. 완료 판정

- 필수 AC 전부 통과: 예.
- 코드·서버·Production API 차단사항: 없음.
- CHECKLIST: T34 완료.
- 후속: 없음. T35 retrieval offline 실험은 별도 항목으로 진행한다.
