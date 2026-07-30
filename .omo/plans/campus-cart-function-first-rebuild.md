# CampusCart Function-First Rebuild

## TL;DR
> **Summary**: 랜딩페이지형 UI를 제거하고 Express CRUD 시연에 최적화된 작업형 앱으로 재구성한다.
> **Deliverables**: 공동구매 CRUD, 수령 장소 선택, API 검증 패널, 독립 URL
> **Effort**: Medium
> **Critical Path**: API CRUD → React 상태/폼 → 장소 전달 → 브라우저 QA

## Work Objectives

### Definition of Done
- `/group-buys`에서 서버 목록 조회, 생성, 수정, 삭제가 동작한다.
- `/pickup`에서 선택한 장소가 공동구매 폼에 반영된다.
- 마지막 API 동작과 저장소 상태가 화면에 표시된다.
- `npm run lint`와 `npm run build`가 통과한다.
- Git 커밋과 푸시를 실행하지 않는다.

### Must NOT Have
- 가짜 사용자 수/절약률 통계
- 실제 기능이 없는 AI 추천 문구
- 카트와 참여처럼 CRUD 시연을 방해하는 중복 액션
- Supabase 미연결 상태를 Supabase 저장 성공으로 표현하는 문구

## Verification Strategy
- API: GET/POST/PATCH/DELETE를 실제 Express 서버에 호출한다.
- UI: 브라우저에서 생성 → 수정 → 삭제 → 새로고침 시나리오를 수행한다.
- Quality: ESLint와 Vite production build를 실행한다.

## TODOs

- [ ] 1. Express CRUD 계약 완성
  - GET/POST/PATCH/DELETE `/api/group-buys`와 Zod 경계 검증을 구현한다.
  - 404/400 응답을 명확한 한국어 오류로 반환한다.

- [ ] 2. API 클라이언트 완성
  - 조회, 생성, 수정, 삭제 함수를 한 서비스 모듈에 제공한다.
  - 응답 오류를 화면에서 처리 가능한 Error로 변환한다.

- [ ] 3. 작업형 앱 셸 재구성
  - 로고, 공동구매, 수령 장소 두 탭만 유지한다.
  - `/`는 `/group-buys`와 같은 기본 작업 화면으로 취급한다.

- [ ] 4. 공동구매 CRUD 화면 구현
  - 목록, 검색, 로딩/빈/오류 상태, 생성/수정 패널, 삭제 확인을 제공한다.
  - API 성공 후 화면 목록을 서버 응답으로 갱신한다.

- [ ] 5. 수령 장소 선택 화면 구현
  - 장소 카드의 선택 액션으로 `/group-buys` 폼에 장소를 전달한다.

- [ ] 6. 검증 패널 구현
  - 연결 저장소, 마지막 REST 동작, 성공/실패 상태를 표시한다.

- [ ] 7. 최종 검증
  - lint/build/API CRUD/UI 시나리오를 모두 실행한다.
  - 브라우저에 발표 시작 화면을 열어 둔다.

## Final Verification Wave
- [ ] 기능 범위 준수
- [ ] 코드 품질 및 파일 책임 검토
- [ ] 실제 브라우저 CRUD QA
- [ ] Git 미반영 확인
