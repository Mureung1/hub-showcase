# 보안 리포트 최종 구조

> 13일차 (7/27) SECURITY 세션에서 확립한 보안 리포트 구조.
> `security-docs/security-report.md`의 섹션별 내용 가이드.

## 섹션 구성

1. **보안 아키텍처 요약** — 데이터 모델, 격리 방식 (ownerUid 기반)
2. **Firestore Security Rules 구조** — helper function, 컬렉션별 규칙 테이블, 허용값 검증
3. **침투 테스트 결과** — 시나리오별 PASS/FAIL 테이블, 테스트 파일 경로, 실행 명령
4. **전화번호 마스킹** — 마스킹 방식, 서비스 함수, FE 검색 결과, 원본 phone 사용 경로
5. **riskStats 쓰기 보호** — 현재 상태 (Spark 허용 / Blaze 차단), 보안 영향 평가
6. **법무 체크리스트** — 처리방침, 약관, 용어 검사, 동의 체크박스, 사건 메모 가이드
7. **알려진 이슈** — cascade 삭제 미구현, Cloud Functions 미배포, 기타
8. **규칙 성능** — get() 호출 통합, 캐싱, 비용
9. **프로덕션 배포 상태** — 배포 완료일, 배포 명령
10. **보안 산출물 목록** — 파일별 내용 요약 테이블

## 보안 산출물 파일 목록

| 파일 | 내용 |
|------|------|
| `security-docs/security-report.md` | 보안 리포트 최종 |
| `security-docs/penetration-test.md` | 침투 테스트 시나리오 정의 |
| `security-docs/riskstats-exception.md` | riskStats 클라이언트 갱신 예외 정책 |
| `security-docs/privacy-draft.md` | 개인정보 처리방침 초안 |
| `security-docs/terms-draft.md` | 이용약관 초안 |
| `security/smoke-test.mjs` | 프로덕션 최종 스모크 테스트 (14개 시나리오) |
| `firestore.rules` | Firestore Security Rules |
| `firestore.indexes.json` | Firestore 복합 인덱스 |

## 업데이트 시점

- 매 보안 세션 작업 종료 시
- 규칙 변경 시
- 침투 테스트 재실행 시
- 프로덕션 배포 시

## "블랙리스트" 용어 검사 기준

- 코드/화면/UI 텍스트: **0건** (허용)
- 보안 문서 내 금지 규정 언급: **허용** (정책 설명이므로)
- 검색 명령: `search_files`로 `blacklist` 패턴 검색, 경로별로 결과 확인