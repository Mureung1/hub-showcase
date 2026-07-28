# ShowUp Security Test Scenarios

> 기준일: 2026-07-28. 실행 가능한 원본은 `security/smoke-test.mjs`다.

## 자동화된 Rules 시나리오

1. 비로그인 접근 차단
2. 타 가게 store 접근 차단
3. ownerUid 위조 생성 차단
4. ownerUid 변경·store 직접 삭제 차단
5. 타 가게 고객 CRUD 차단
6. 고객 필수 필드·전화번호 형식 검증
7. phoneLast4 단독 변경 차단
8. riskStats 완전한 스키마 검증
9. 타 가게 사건 CRUD 차단
10. 사건 type·memo 길이 검증
11. 사건 임의 필드 차단
12. 타 가게 예약 CRUD 차단
13. 예약 status·customerId 불변 검증
14. 정상 owner CRUD 허용
15. 예약 고객 존재·상태 역행 차단
16. 존재하지 않는 고객 사건 생성 차단
17. 고객 삭제 후 orphan 예약·사건 직접 read 차단 및 목록 필터 기준 확인
18. 전화번호·예약 날짜·시간 형식 검증

## 코드·운영 확인

- UI가 `phoneMasked`만 렌더링하는지 검색
- Firebase CLI로 Functions 배포 목록 확인
- Hosting `/`, `/privacy`, `/terms` HTTP·화면 확인
- 고객 삭제 시 고객·예약·사건을 서비스가 함께 삭제하는지 별도 통합 테스트 권장
- 서비스 코드/화면에 낙인 표현이 없는지 확인
- 데모 계정 공개 범위와 초기화 정책 확인

## 현재 예외

- Cloud Functions가 미배포라 owner의 완전한 `riskStats` 갱신을 허용한다.
- 이 허용은 보안 PASS가 아니라 MVP 기술 부채다. Blaze 이관 시 차단 테스트로 바꿔야 한다.
