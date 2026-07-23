# 검증 보고서: T26 — 결정적 템플릿 엔진·fallback

> 상태: 통과
>
> 검증일: 2026-07-22
>
> 관련 계획: `plan.md`
>
> 검증 대상: T26 구현 통합 미커밋 작업트리

## 1. 변경·범위 요약

- 목표 대비 결과: 24개 의미 프레임을 12개 말투×톤 규칙으로 결정적 컴파일해 96세트·288문구 Git 산출물과 approved manifest를 만들었다. 앱은 이 산출물만 동기 조회하며 질문 없는 초안과 guided 장애 fallback을 네트워크 없이 제공한다.
- 주요 변경: `templateCompiler` 저작 프레임·규칙·컴파일러·serializer·generated 산출물, `templates:generate/check`, 런타임 조회 어댑터, approved manifest의 DB metadata-only 등록 경계와 자동 테스트.
- 변경하지 않은 경계: 288개 승인 문구, 화면·카피, AI provider·프롬프트·retrieval, 이메일 템플릿, 실제 DB 행 쓰기, 의존성, 배포.
- 시작 시 기존 변경 보존: 발자국, CatStage 깜빡임, 600자 표시, 좌측 장식 칩 제거 피드백 diff와 사용자 소유 미추적 파일을 그대로 보존했다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | 프레임 전수 단위 테스트 | 통과 | 허용 관계×상황 정본 순서 24개, facts·intent·slot realization 확인 |
| AC-2 | T25 검수지와 전수 byte 비교 | 통과 | 96세트·288문구·tone 1→2→3, 승인 원문 동일 |
| AC-3 | provenance·ID 전수 검사 | 통과 | 288개 고유 `templateId`, 존재하는 `ruleId`, 승인 version, 빈 override 차단 |
| AC-4 | manifest snapshot·결정성 테스트 | 통과 | `approved`, 24/96/288, 소문자 SHA-256 `4ac4ea33750c42164fac4b14d6b43071de122fccf3c5136868beb7ba6261c69f`, 동일 소스→동일 직렬화 |
| AC-5 | generate/check·1-byte 변조 테스트 | 통과 | Git TypeScript·JSON 산출물 재생성, 1 byte drift 실패 확인 |
| AC-6 | 엔티티·App 회귀·fetch spy | 통과 | generated artifact 전용 `Candidate[] | null`, 원문·순서·새 객체 보존, `template_fallback` fetch 0회 |
| AC-7 | App 라우팅·실패 회귀 | 통과 | guided timeout·429·500은 같은 관계×상황×말투 fallback과 세부 답 미반영 안내, manual 실패·취소는 강제 fallback 없음 |
| AC-8 | API DB 경계 단위 테스트 | 통과 | approved+유효 검수 시각만 active metadata 입력, 본문·사용자 원문 제외 |
| AC-9 | 전체 게이트·정본 마감 | 통과 | 43파일 365테스트, typecheck:api, lint, build, templates:check, diff-check 통과·CHECKLIST/LOG 갱신 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 산출물 재생성 | `npm run templates:generate` | 통과 | generated TS·manifest 재생성 |
| 템플릿 drift | `npm run templates:check` | 통과 | 저작 소스·Git 산출물 byte 일치 |
| T26 관련 테스트 | compiler·drift·DB·entity·App Vitest | 통과 | 5파일 110테스트 |
| 전체 테스트 | `npm test` | 통과 | 43파일 365테스트 |
| API 타입검사 | `npm run typecheck:api` | 통과 | NodeNext API·공유 타입 통과 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 0 |
| 생산 빌드 | `npm run build` | 통과 | Vite build 완료; 기존 CatCanvas 500 kB 경고만 비차단 |
| `any` 금지 | T26 대상 `rg` | 통과 | 신규 `any`·`as any`·`<any>` 0건 |
| 변경 형식 | `git diff --check` | 통과 | whitespace 오류 0 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 신규 시각·카피 회귀 | 해당 없음 | 화면·카피·레이아웃 변경 없음 | 제품 UI diff 없음, 기존 App 흐름 80테스트 통과 | 통과·신규 실화면 검증 비적용 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: CHECKLIST T26, SPEC 2·4장, SCREENS S2-d·S3, EDGE_CASES 2-1·2-5·2-6의 조회·실패·DB 경계를 코드와 테스트에 연결했다.
- 말투·톤 규칙: 12개 규칙이 말끝·문장부호, intent 화행, tone 2 완화, tone 3 간결성 경계를 명시하고 컴파일 단계에서 검사한다.
- MVP 범위 준수: 신규 UI·provider·retrieval·DB 본문 저장·의존성·실제 운영 DB write를 추가하지 않았다.
- 실제 T25 검수 시각은 정본에 없어 임의로 만들지 않았다. DB 등록은 고정 fixture 날짜의 메타데이터 allowlist 단위 테스트로만 검증했다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예.
- 적용되는 자동·수동 검증 전부 통과: 예. 신규 UI가 없어 실화면 수동 검증은 비적용으로 판정했다.
- 미해결 차단사항 없음: 예.
- `docs/CHECKLIST.md` 갱신 여부와 근거: T26을 완료로 갱신했고 24/96/288, approved manifest, checksum, drift, DB 경계와 전체 검증 근거를 기록했다.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-22 T26 종료 기록에 연결했다.
- 완료 후 남은 별도 gate: T22 외부 참여자 5명 과업·실기기·배포 검증은 T26 범위 밖 기존 보류를 유지한다.

위 근거로 T26을 `통과`로 판정한다.
