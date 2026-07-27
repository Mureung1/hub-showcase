# 프로젝트 작업 이력

구현 티켓을 종료할 때 다음 작업의 판단에 필요한 결과만 최신 항목이 위로 오도록 기록한다.

## 기록 형식

```markdown
## YYYY-MM-DD · TICKET-ID · 완료|부분 완료|차단

- 결과: 사용자가 확인할 수 있는 동작 변화
- 결정: 이후에도 유지할 구현 또는 정책 결정, 없으면 `없음`
- 시행착오: 실패한 접근과 선택한 대안, 없으면 `없음`
- 검증: 실제 실행한 명령과 결과
- 후속: 연결된 티켓 ID, 없으면 `없음`
- 반복 패턴: `pattern-key`, 없으면 `없음`
```

## 이력

## 2026-07-27 · FE-RECIPE-006 · 부분 완료

- 결과: `OWNED`, `EXTERNAL` 상세의 `⋯ 관리` 텍스트 목록에서 전용 원본 수정 화면을 열고, 서버 상세를 기존 초안 폼에 채워 편집 가능한 7개 필드 전체를 인증된 `PATCH`로 저장한 뒤 응답 ID의 상세로 돌아간다. 출처는 추가·수정·제거할 수 있고 실패 후 입력을 유지하며, `RECEIVED`는 상세 진입점과 직접 URL 폼을 모두 차단한다. `OWNED`의 기존 전달 공유는 관리 목록에서 열고 생성·복사 상태를 유지하며 삭제는 노출하지 않는다.
- 결정: 수정 폼을 복제하지 않고 `RecipeDraftForm`의 기본 AI 출처 읽기 전용 동작을 유지하는 출처 편집 모드만 추가했다. 상세 관리 동작은 유형별 텍스트 목록에 모으고 수정은 `/recipes/:recipeId/edit` 보호 경로를 사용한다.
- 시행착오: 집중 테스트에서 기존 47개는 통과하고 수정 API 함수, 출처 편집 모드, 수정 페이지와 관리 목록이 없는 신규 경계만 실패하는 Red를 확인했다. 로컬 Vite 서버는 실행했지만 연결 가능한 브라우저가 없어 실제 화면과 Firebase 세션 검증은 진행하지 못했다.
- 검증: 집중 4개 파일 60개 테스트, 전체 `npm test` 9개 파일 82개 테스트, `npm run lint`, `npm run build`, `git diff --check`를 통과했다. 실제 Firebase ID 토큰·Express·PostgreSQL을 사용한 두 유형 수정과 모바일·키보드 화면 확인은 수행하지 않아 티켓 검증과 상위 체크는 열어 두었다.
- 후속: 연결 가능한 브라우저와 실제 로컬 API로 `OWNED`, `EXTERNAL` 저장·실패·취소, `RECEIVED` 진입 차단과 관리 목록 키보드 동작을 확인한 뒤 `FE-RECIPE-006`을 완료한다.
- 반복 패턴: `authenticated-form-submit`

## 2026-07-27 · BE-RECIPE-005 · 완료

- 결과: 인증된 `PATCH /api/recipes/:recipeId`가 현재 사용자가 소유한 활성 `OWNED`, `EXTERNAL` 레시피의 편집 가능한 7개 필드와 하위 데이터를 전체 교체한다. 출처 유무로 유형을 다시 결정하고, `RECEIVED`는 `RECIPE_NOT_EDITABLE`, 없는·타인 소유·삭제·잘못된 ID는 `RECIPE_NOT_FOUND`로 처리한다.
- 결정: 생성 API의 전체 본문·안전한 URL 검증을 재사용하고, 소유권·활성 상태를 확인한 레시피 행을 잠근 뒤 부모·재료·단계·출처 교체와 수정 시각 갱신을 한 트랜잭션으로 처리한다. 개인 메모와 공유 상태는 변경하지 않는다.
- 시행착오: 집중 테스트가 업데이트 서비스 모듈 부재로 `ERR_MODULE_NOT_FOUND` Red를 반환하는 것을 확인한 뒤 최소 서비스와 라우트 구현으로 Green으로 전환했다.
- 검증: Red에서 기존 47개는 통과하고 신규 테스트 파일 1개가 모듈 부재로 실패했다. Green에서 `npm test -- src/services/recipeUpdate.service.test.ts`와 전체 `npm test` 54개 테스트, `npm run type-check`, `npm run build`, `git diff --check`를 통과했다. 실제 Firebase 토큰과 PostgreSQL을 사용한 HTTP 요청은 수행하지 않았다.
- 후속: `FE-RECIPE-006`
- 반복 패턴: `transactional-recipe-aggregate-write`

## 2026-07-27 · FE-AUTH-004 · 완료

- 결과: 데스크톱·태블릿 가죽 사이드바 하단과 모바일 가죽 헤더 우측에서 Firebase 로그아웃을 실행한다. 성공하면 로그인 화면으로 교체 이동하고, 처리 중에는 두 반응형 버튼의 중복 실행을 함께 막으며, 실패하면 현재 레시피북과 입력 상태를 유지한 채 접근 가능한 오류와 재시도를 제공한다.
- 결정: 별도 백엔드 API 없이 `signOut(firebaseAuth)`만 사용한다. 로그아웃 버튼은 기존 전달 코드 모달과 조리 중 보기의 `inert`·`aria-hidden` 경계 안에 두어 잠긴 상태를 우회하지 않는다.
- 시행착오: 구현 전 집중 테스트에서 기존 16개는 통과하고 새 성공·실패·중복 실행 3개가 로그아웃 버튼 부재로 실패하는 Red를 확인한 뒤 최소 구현으로 Green으로 전환했다.
- 검증: `npm test -- src/pages/RecipeListPlaceholderPage.test.jsx` 1개 파일·19개 테스트, 전체 `npm test` 8개 파일·68개 테스트, `npm run lint`, `npm run build`, `git diff --check`를 통과했다. `ProtectedRoute`의 비로그인 차단과 기존 `LoginPage`의 Google 로그인 후 목록 복귀 경로를 정적으로 대조했다. 연결된 Firebase 브라우저 세션에서 실제 로그아웃·재로그인과 700px 경계 화면은 확인하지 않았다.
- 후속: `FE-DESIGN-001`
- 반복 패턴: 없음

## 2026-07-27 · COMMON-DOCS-003 · 완료

- 결과: 발표 전 추가 구현 범위를 로그아웃, 저장된 레시피 원본 수정과 soft delete로 제한했다. 개인 메모와 휴지통·복원 티켓은 체크리스트 마지막의 발표 후 구현 후보로 옮기고, 열람 공유는 가치 재검토 후보로 유지했다.
- 결정: 연기는 기능 취소나 제품·API 정책 변경이 아니다. 발표 전 삭제 UX는 soft delete 성공·실패까지 독립적으로 완료하고, 삭제 직후 실행 취소와 휴지통·복원은 발표 후 `BE-RECIPE-008`·`FE-RECIPE-009`에서 연결한다.
- 시행착오: 기존 `FE-RECIPE-008`이 휴지통 API를 선행 조건으로 요구해 발표 전 삭제만 완료할 수 없었으므로, soft delete UX와 복원 UX의 완료 기준을 분리했다.
- 검증: 체크리스트의 티켓 ID·선행 참조·연기 티켓 위치, 프로젝트 컨텍스트와 문서 diff를 확인하고 `git diff --check`를 실행했다. 문서 정리 작업이므로 테스트·lint·build는 실행하지 않았다.
- 후속: `FE-AUTH-004`, `BE-RECIPE-005`, `FE-RECIPE-006`, `BE-RECIPE-007`, `FE-RECIPE-008`
- 반복 패턴: 없음

## 2026-07-27 · FE-RECIPE-005 · 부분 완료

- 결과: 레시피 상세에 시각적으로 구분되는 네이티브 체크박스 `switch`를 추가했다. 활성화하면 페이지 전체에서 switch와 상세 스크롤만 조작할 수 있고 모바일 헤더·사이드바·왼쪽 목록·목록 링크·출처 링크·전달 공유 동작은 접근성 탐색과 조작에서 제외된다. 레시피 본문·출처 텍스트·빈 상태·전달받은 기억과 메모는 시각 사용자와 스크린 리더가 계속 읽을 수 있으며, 종료하면 새 API 요청 없이 일반 상세와 기존 초대 링크·코드를 복원한다.
- 결정: 조리 중 보기 상태는 `RecipeListPlaceholderPage`에서 현재 상세 응답 객체와 연결해 관리하고 `RecipeDetailView` switch를 제어한다. 상세 변경·이탈 시 새 응답 객체와 일치하지 않아 별도 동기 effect 없이 해제된다. 상세 본문에는 `inert`를 적용하지 않고 바깥 형제 컨테이너에만 `inert`와 `aria-hidden`을 적용하며, 출처는 활성 중 일반 텍스트로 바꾸고 전달 공유 컴포넌트는 `hidden` 래퍼 안에 마운트한다.
- 시행착오: 첫 구현의 텍스트 버튼은 switch 형태와 조작 잠금 범위를 충분히 전달하지 못했고, switch로 바꾼 뒤에도 데스크톱 사이드바와 왼쪽 목록이 조작 가능한 범위 누락이 있었다. 최종 집중 테스트 16개 중 강화한 1개가 왼쪽 목록 링크 노출로 실패하는 Red를 확인한 뒤 페이지 수준의 형제 컨테이너 잠금으로 Green으로 전환했다. 첫 파생 상태 조건은 목록 경로의 `null` 상세와 `undefined` ID를 활성 상태로 잘못 판정했으나 전체 회귀 테스트가 탐지해 명시적인 상세 존재 가드를 추가했다. 연결 가능한 브라우저 세션이 없어 390px·실제 키보드·스크롤 검증은 수행하지 못했다.
- 검증: `npm test -- src/pages/RecipeListPlaceholderPage.test.jsx` 1개 파일·16개 테스트, 전체 `npm test` 8개 파일·65개 테스트, `npm run lint`, `npm run build`를 통과했다. 모바일·키보드 수동 검증은 미실행이므로 상위 티켓과 검증 체크는 열어 두었다.
- 후속: 390px에서 토글 전후 레이아웃·스크롤과 키보드 Enter·Space·Focus를 확인한 뒤 `FE-RECIPE-005` 검증과 상위 티켓을 완료한다.
- 반복 패턴: 없음

## 2026-07-27 · COMMON-API-002 · 완료

- 결과: 레시피 원본 수정, 세 유형의 soft delete, 30일 이내 휴지통 조회와 복원 API 계약을 요청·응답·권한·오류·route 순서까지 확정하고 API 명세, 기능 정책과 데이터 모델을 일치시켰다.
- 결정: 수정은 `PATCH`로 편집 가능한 본문과 출처 전체를 교체하며 개인 메모와 공유 상태는 전용 API로 분리한다. 삭제 후 30일이 되는 시점부터 복원을 금지하고 보존 중인 만료 레코드는 `RECIPE_RESTORE_EXPIRED`로 거부하며, MVP에는 영구 삭제와 자동 purge를 두지 않는다. 열람 공유 정책과 티켓은 취소하지 않고 P3 연기 후보로 이동했으며 전달 공유는 활성 범위로 유지한다.
- 시행착오: 기존 문서의 30일 뒤 영구 삭제 표현, 원본 수정에 포함된 메모·공유 상태, 열람 공유의 활성 P1·출시 선행 조건을 새 결정과 대조해 제거하거나 우선순위를 명시했다.
- 검증: 관련 문서에서 수정 필드와 오류 코드, `restoreUntil`·30일 경계, 열람 공유 티켓의 P3 위치와 활성 QA·출시 선행 조건을 `rg`로 교차 확인했고 `git diff --check`를 통과했다. 문서 계약 작업이므로 테스트·lint·build는 실행하지 않았다.
- 후속: `BE-RECIPE-005`, `BE-RECIPE-007`, `BE-RECIPE-008`
- 반복 패턴: 없음

## 2026-07-26 · FE-SHARE-004 · 완료

- 결과: `OWNED` 레시피 상세에서 인증된 전달 초대를 생성하고 현재 프론트엔드 Origin의 전체 링크와 초대 코드를 읽기 전용 입력으로 확인·복사할 수 있다. 생성 중 같은 틱의 중복 요청을 막고 API·클립보드 오류를 안내하면서 이미 받은 생성 결과를 유지하며, `EXTERNAL`과 `RECEIVED`에는 생성 동작을 표시하지 않는다.
- 결정: 기존 레시피 상세와 공통 API 클라이언트를 그대로 확장하고 별도 화면·의존성 없이 인라인 공유 영역을 제공한다. 링크와 코드가 같은 일회성 초대이고 한 명의 수락 또는 7일 뒤 사용할 수 없으며 원문은 생성 응답에서만 확인할 수 있음을 함께 안내한다.
- 시행착오: 생성 함수와 UI가 없는 상태에서 신규 집중 테스트 5개가 의도대로 Red였고 최소 구현 후 Green으로 전환했다. 전체 lint에서 상세 변경 시 공유 상태를 지우는 동기 effect가 금지되어, 기존 상세 조회 성공 경계에서 상태를 초기화하도록 수정했다.
- 검증: API 경로·Firebase 토큰, `OWNED` 생성, `EXTERNAL`·`RECEIVED` 차단, 같은 틱 중복 요청 차단, 전체 링크·코드와 안내, 권한·서버 오류 재시도, 복사 성공·실패와 결과 유지를 집중 테스트로 확인했다. 프론트엔드 전체 8개 파일·64개 테스트, `npm run lint`, `npm run build`, `git diff --check`를 통과했다. 사용자가 다른 Google 계정에서 링크·코드 미리보기, 수락과 관계 정보가 있는 상세 이동을 로컬에서 직접 확인했다.
- 후속: `QA-SHARE-001`, `FE-DESIGN-001`
- 반복 패턴: `authenticated-form-submit`

## 2026-07-26 · FE-SHARE-003 · 완료

- 결과: 전달 미리보기에서 수락을 선택하면 전해준 사람·관계 라벨·선택 메모를 입력할 수 있고, 필수값을 확인한 뒤 받은 레시피로 저장한다. 저장 중 중복 제출을 막고 성공하면 저장 안내와 관계·기억 정보가 있는 상세로 이동하며, 취소는 초대를 사용하지 않고 미리보기로 돌아간다.
- 결정: 사용자가 기억하는 호칭을 대신 추정하지 않고 전해준 사람과 관계 라벨의 초기값은 비워 둔다. 저장 요청에는 공백을 정리한 필수값과 빈 메모를 `null`로 전달하고, 서버가 반환한 레시피 ID의 기존 상세 경로를 재사용한다.
- 시행착오: 수락 폼과 받은 관계 상세가 없는 상태에서 집중 테스트 5개가 실패하는 Red를 확인한 뒤, 기존 전달 페이지·API 모듈·레시피 상세만 최소 확장해 Green으로 전환했다.
- 검증: 미리보기 전환, 필수 오류, 취소 무저장, 인증 헤더와 입력 정규화, 중복 제출 차단, 사용 완료·만료·자기 수락 오류 후 입력 유지, 성공 상세 이동과 받은 관계 표시를 집중 테스트로 확인했다. 프론트엔드 전체 7개 파일·56개 테스트, `npm run lint`, `npm run build`, `git diff --check`를 통과했다.
- 후속: `QA-SHARE-001`, `FE-DESIGN-001`
- 반복 패턴: `authenticated-form-submit`

## 2026-07-26 · FE-SHARE-002 · 완료

- 결과: 인증된 사용자가 레시피 추가 화면이나 사이드 메뉴에서 전달 코드 모달을 열어 빈·잘못된·사용·만료 코드를 구분하고, 유효한 코드 또는 전달 링크로 같은 레시피 미리보기를 확인할 수 있다. 거절과 모달 닫기는 초대 상태를 바꾸지 않고 레시피북으로 돌아간다.
- 결정: 코드 입력은 `/transfer-invitations` 경로를 유지한 채 기존 레시피북 위의 밝은 종이 모달로 제공하고, 외부 링크 `/transfer-invitations/:linkToken`은 로그인 복귀가 가능한 독립 화면으로 유지한다. 실제 수락·관계 입력·저장은 `FE-SHARE-003` 범위로 남겼다.
- 시행착오: 초기 독립 코드 화면은 넓은 빈 공간과 낮은 버튼 대비가 있어 모달로 변경했다. 테스트와 페이지가 서로 다른 대소문자의 인증 Context 경로를 사용해 런타임에서 Context가 `null`이 되던 문제와 백엔드 계약과 다른 사용 완료 오류 코드명을 수정했다.
- 검증: 링크·코드 API 경계, 중복 제출 차단, 입력 유지, 공통 미리보기, 빈·잘못된·사용·만료 오류, 모달 열기·닫기와 무상태 거절을 집중 테스트로 확인했다. 프론트엔드 전체 50개 테스트, `npm run lint`, `npm run build`, `git diff --check`를 통과했다. 로그인 후 전달 링크 복귀는 선행 티켓 `FE-AUTH-003`의 보호 라우트 검증을 재사용했다.
- 후속: `FE-SHARE-003`
- 반복 패턴: `authenticated-form-submit`

## 2026-07-26 · BE-SHARE-003 · 완료

- 결과: 인증된 사용자가 유효한 전달 초대를 수락하면 초대 시점 스냅샷을 `RECEIVED` 레시피와 재료·단계·출처로 복사하고, 원 저장자 표시·전해준 사람·관계·받은 날짜와 개인 메모를 자신의 레시피북에 저장한다. 목록과 상세는 소유자에게 `receivedInfo`를 반환하며 재공유 불가를 명시한다.
- 결정: 초대 행을 `FOR UPDATE`로 잠근 뒤 상태 검사, 수신 사용자 연결, 레시피·관계 저장과 `used_at` 갱신을 한 트랜잭션으로 처리한다. 시스템상 원 저장자와 수락자가 같으면 `TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED`로 거부하고, 동시 수락 중 잠금 후 사용 상태를 확인한 요청은 `TRANSFER_INVITATION_USED`로 반환한다.
- 시행착오: 집중 테스트에서 수락 서비스 부재와 상세의 `receivedInfo: null`을 Red로 확인했다. 실제 PostgreSQL 검증은 샌드박스 네트워크에서 `EACCES`가 발생해 승인된 네트워크 실행으로 다시 수행했다.
- 검증: 수락·상세 집중 테스트에서 정상 저장, 입력 정규화, 없는·사용·만료·자기 초대, 중간 실패 롤백과 관계 응답을 확인했다. 실제 PostgreSQL의 동일 초대 병렬 수락 두 건 중 하나만 성공하고 다른 하나가 사용 완료 오류가 되는 것을 확인했으며, 자기 수락 거부와 `RECEIVED` 목록·상세 재조회를 확인한 뒤 테스트 데이터를 삭제했다. 백엔드 전체 47개 테스트, `npm run type-check`, `npm run build`, `git diff --check`를 통과했다.
- 후속: `FE-SHARE-002`, `FE-SHARE-003`, `BE-RECIPE-006`
- 반복 패턴: 없음

## 2026-07-26 · BE-SHARE-002 · 완료

- 결과: 인증된 `OWNED` 레시피 소유자가 현재 레시피·출처·원 저장자 표시 정보의 불변 스냅샷으로 7일짜리 전달 초대를 생성할 수 있다. 링크 토큰과 초대 코드는 생성 응답에서만 원문으로 반환하고 DB에는 각각 SHA-256·HMAC-SHA-256 해시만 저장한다. 인증된 링크·코드 미리보기는 같은 안전한 계약을 반환하며 없는·사용·만료 상태를 404·409·410으로 구분한다.
- 결정: 사용자가 전달 미리보기도 로그인 후 제공하기로 확정했다. 비로그인 링크 접근은 프론트엔드가 로그인 후 같은 초대 경로로 복귀시키며, 초대 코드 HMAC에는 32자 이상의 백엔드 전용 `TRANSFER_INVITATION_CODE_SECRET`을 사용한다. 미리보기 스냅샷에는 개인 메모와 내부 사용자·레시피 식별자를 포함하지 않는다.
- 시행착오: 집중 테스트의 최초 실행은 서비스 모듈 부재로 예상대로 Red였고, Green 전환 중 날짜 필드의 테스트 matcher 표현을 실제 ISO 문자열 검증으로 수정했다. 실제 PostgreSQL 검증은 샌드박스 네트워크에서 `EACCES`가 발생해 승인된 네트워크 실행으로 재검증했다.
- 검증: 전달 초대 서비스 집중 테스트 5개와 백엔드 전체 테스트, `npm run type-check`, `npm run build`, `git diff --check`를 통과했다. 실제 PostgreSQL에 테스트 초대를 생성해 두 해시, 메모·내부 ID 제외 스냅샷, 링크·코드 동일 미리보기와 사용·만료 오류를 확인하고 테스트 행을 삭제했다.
- 후속: `BE-SHARE-003`, `FE-SHARE-002`
- 반복 패턴: 없음

## 2026-07-26 · DB-SHARE-002 · 완료

- 결과: 전달 초대의 링크·코드 해시, 불변 레시피 스냅샷, 생성·만료·사용 시각을 저장하는 `transfer_invitations`와 수락한 `RECEIVED` 레시피의 원 작성자·전달자 표시·관계 정보를 저장하는 `received_recipe_details`를 구축했다. 해시와 초대 수락 관계는 각각 UNIQUE로 제한하고 원본 레시피와 만료 시각 조회 인덱스를 추가했다.
- 결정: `RESTRICT`와 `CASCADE`를 비교한 뒤, 관계와 기억을 보존하는 제품 의도와 MVP의 soft delete 정책에 맞춰 감사·전달 공유 FK에 `ON DELETE RESTRICT`를 사용하기로 사용자가 결정했다. 원본이나 초대를 영구 삭제할 때 관계 정보가 자동 소실되지 않으며, 향후 영구 삭제가 필요하면 보존·정리 순서를 별도 정책과 트랜잭션으로 구현한다. 링크 토큰과 초대 코드 원문은 저장하지 않고 각각 64자 해시만 저장한다.
- 시행착오: 격리된 마이그레이션 테스트 DB가 없어 SQL 문자열 단위 테스트 대신 실제 PostgreSQL 적용과 카탈로그 검증을 사용했다. 샌드박스의 외부 DB 연결은 `EACCES`로 차단되어 승인된 네트워크 실행으로 검증했다.
- 검증: `backend npm run migrate`를 두 번 실행해 `003_transfer_sharing.sql` 최초 적용과 재실행 건너뛰기를 확인했다. PostgreSQL 카탈로그에서 두 테이블의 17개 컬럼, 4개 `ON DELETE RESTRICT` FK, 링크·코드·초대 수락 UNIQUE 제약과 원본·만료 조회 인덱스를 확인했다. 백엔드 37개 테스트와 `npm run type-check`, `npm run build`, `git diff --check`를 통과했다.
- 후속: `BE-SHARE-002`, `BE-SHARE-003`, `BE-RECIPE-007`
- 반복 패턴: `database-migration-validation`

## 2026-07-26 · DB-AUDIT-001 · 완료

- 결과: `recipe_audit_events`에 사용자, 레시피, `DELETED`·`RESTORED` 행위와 발생 시각만 저장하는 마이그레이션을 추가하고 레시피별 최신 감사 기록 조회 인덱스를 구축했다.
- 결정: 감사 기록 보존을 위해 사용자와 레시피 외래 키는 `ON DELETE RESTRICT`를 사용한다. 현재 확정된 감사 행위는 삭제와 복원으로 한정하고 토큰, credential, 레시피 본문 또는 범용 메타데이터 컬럼은 두지 않는다.
- 시행착오: 샌드박스의 외부 PostgreSQL 연결이 `EACCES`로 차단되어 승인된 네트워크 실행으로 검증했다. Windows 인라인 명령 인용 문제는 저장소에 남기지 않은 임시 읽기 전용 검사 스크립트로 우회했다.
- 검증: `backend npm run migrate`를 두 번 실행해 최초 적용과 재실행 건너뛰기를 확인했다. PostgreSQL 카탈로그에서 5개 컬럼, 기본 키, 두 외래 키, `action` CHECK 제약과 `idx_recipe_audits_recipe_time (recipe_id, occurred_at DESC)`를 확인했다. 백엔드 37개 테스트와 `npm run type-check`, `npm run build`, `git diff --check`를 통과했다.
- 후속: `DB-SHARE-002`, `DB-SHARE-001`, `BE-RECIPE-007`
- 반복 패턴: `database-migration-validation`

## 2026-07-26 · QA-CORE-001 · 완료

- 결과: 실제 Google 로그인 후 기존 레시피 2개를 조회하고, 직접 입력으로 만든 초안의 제목을 `QA 직접입력 달걀볶음밥 20260726`으로 수정해 Express API와 PostgreSQL에 저장한 뒤 같은 제목을 상세와 새로고침한 목록의 3번째 항목에서 확인했다. 일반 공개 King Arthur Baking URL, 공개 Maangchi YouTube URL과 일반 URL·직접 입력 혼합 요청이 각각 편집 가능한 초안을 반환했으며 혼합 요청에는 두유·식물성 오일 보완 정보와 원본 출처가 함께 반영됐다. 네이버 블로그 URL은 `422 URL_FETCH_FAILED`와 직접 입력 안내를 표시하고 URL을 유지했으며, 빈 입력과 제목 누락은 요청 전에 차단하고 작성값을 보존했다.
- 결정: 실제 제공자·DB 성공 경로는 수동 통합 QA로 확인하고, 운영 환경 장애를 강제로 만들지 않은 채 AI 제공자·응답 실패와 저장 서버·네트워크 실패는 일회성 mock과 기존 집중 테스트로 입력 유지·오류 코드·트랜잭션 롤백을 검증했다.
- 시행착오: 자동 제어 가능한 브라우저 세션이 없어 사용자가 guide 단계로 실제 브라우저 QA를 수행했다. 혼합 요청 첫 시도에서 `502`와 AI 응답 형식 오류가 표시됐지만 URL과 직접 입력은 유지됐고, 다시 시도한 응답은 보완 정보와 출처가 반영된 유효한 초안을 반환했다. 전체 회귀 검사 중 네이버 블로그 차단 코드가 잠시 주석 처리돼 관련 테스트가 Red였으나 사용자가 승인된 차단 로직을 복구한 뒤 집중 테스트와 전체 검증을 다시 통과했다.
- 검증: 실제 Google 로그인·목록 조회, 직접 입력 초안 수정·PostgreSQL 저장·상세·목록 재조회, 일반 URL·공개 YouTube·혼합 입력 초안, 네이버 블로그 422, 빈 입력과 저장 검증 실패를 확인했다. 무토큰 보호 API 3종은 `401 UNAUTHORIZED`를 반환했다. `frontend npm test -- src/components/RecipeInputForm.test.jsx src/pages/RecipeDraftPage.test.jsx`의 2개 파일·6개 테스트, `backend npx tsx --test src/services/recipeCreate.service.test.ts`의 5개 테스트와 일회성 AI 실패 harness의 `AI_REQUEST_FAILED`·`AI_RESPONSE_INVALID` 검증을 통과했다. 복구 후 네이버 집중 테스트 7개, 백엔드 전체 37개 테스트와 type-check·build, 프론트엔드 전체 6개 파일·42개 테스트와 lint·build를 통과했다.
- 후속: `FE-RECIPE-005`
- 반복 패턴: 없음

## 2026-07-26 · QA-CORE-001 · 차단

- 결과: 실제 백엔드가 PostgreSQL 연결을 확인한 뒤 `/api/health` 200을 반환했고, 목록·AI 구조화·레시피 저장 API의 무토큰 요청이 모두 `401 UNAUTHORIZED`와 공통 오류 형식으로 차단되는 것을 확인했다. 연결 가능한 브라우저 세션이 없어 실제 Google 로그인과 인증된 입력별 AI 초안·편집·저장·상세·목록 전체 흐름은 수행하지 못했으며 티켓과 세부 작업은 열어 두었다.
- 결정: 실제 Google 로그인과 브라우저 입력 유지 증거 없이 통합 QA 완료로 처리하지 않는다.
- 시행착오: 샌드박스 안에서 실행한 백엔드는 외부 PostgreSQL 연결이 `EACCES`로 차단되어 승인된 외부 네트워크 실행으로 다시 시작했다. Browser 런타임 연결 후 사용 가능한 브라우저를 조회했지만 목록이 비어 있었다.
- 검증: 실제 PostgreSQL 연결을 포함한 `GET /api/health` 200, 무토큰 `GET /api/recipes`·`POST /api/ai/recipes/structure`·`POST /api/recipes`의 `401 UNAUTHORIZED`, 백엔드 37개 테스트와 `npm run type-check`·`npm run build`, 프론트엔드 6개 파일·42개 테스트와 `npm run lint`·`npm run build`를 통과했다.
- 후속: 인앱 브라우저 또는 Chrome 세션을 연결한 뒤 Google 로그인하고 직접 입력·일반 공개 웹페이지·공개 YouTube·혼합 입력의 초안 편집·PostgreSQL 저장·상세·목록 재조회와 인증·입력·URL·AI·저장 실패를 실제 UI에서 기록한다.
- 반복 패턴: 없음

## 2026-07-25 · QA-CORE-001 · 부분 완료

- 결과: 네이버 블로그 성공 흐름을 제외한 현재 MVP/P0 지원 범위로 선행 티켓을 다시 확인했고, 프론트엔드와 백엔드 자동 회귀 검증을 통과했다. 실제 Google 로그인, 외부 AI·URL 제공자와 PostgreSQL을 연결한 전체 시나리오는 아직 수행하지 않아 티켓과 세부 작업은 완료 처리하지 않았다.
- 결정: 통합 QA의 URL 성공 대상은 직접 입력, 지원 가능한 일반 공개 웹페이지, 공개 YouTube와 URL·직접 입력 혼합 요청이다. 네이버 블로그 URL은 성공 대상이 아니라 `URL_FETCH_FAILED` 422와 직접 입력 안내를 확인하는 실패 경계다.
- 시행착오: 없음
- 검증: 백엔드 36개 테스트, `backend npm run type-check`, `backend npm run build`, 프론트엔드 6개 파일·42개 테스트, `frontend npm run lint`, `frontend npm run build`를 통과했다.
- 후속: 실제 Google 로그인, Express API, 외부 제공자와 PostgreSQL을 사용해 지원 입력별 초안 편집·저장·상세·목록 재조회와 인증·입력·URL·AI·저장 실패를 기록한다.
- 반복 패턴: 없음

## 2026-07-25 · BE-AI-004 · 완료 (범위 제외)

- 결과: 전용 구조화를 구현 완료한 것이 아니라 공개 네이버 블로그를 현재 MVP/P0 범위에서 제외하고, `blog.naver.com`과 하위 도메인을 외부 요청 전에 기존 `URL_FETCH_FAILED` 경계로 거부했다. 전용 API·브라우저 렌더링·스크래핑과 새 의존성은 추가하지 않았다.
- 결정: 일반 공개 웹페이지와 공개 YouTube 수집 경로는 유지하고, 네이버 블로그 입력은 기존 422 응답과 직접 입력 안내를 사용한다.
- 시행착오: 호스트 차단 구현 전에 네이버 블로그 URL이 일반 URL 파서에서 허용되는 Red 테스트를 확인한 뒤 최소 호스트 경계로 Green을 만들었다.
- 검증: 네이버 블로그 호스트와 모바일 하위 도메인 테스트를 포함한 백엔드 36개 테스트, `backend npm run type-check`, `backend npm run build`를 통과했다.
- 후속: `QA-CORE-001`에서 실제 API 실패 응답과 프론트엔드 직접 입력 안내를 확인한다.
- 반복 패턴: 없음

## 2026-07-25 · COMMON-AI-003 · 완료 (범위 제외 결정)

- 결과: 수집 기술이나 기능을 구현 완료한 것이 아니라 사용자 결정에 따라 공개 네이버 블로그 전용 URL 수집과 구조화를 현재 MVP/P0 입력 범위에서 제외하고 제품·기능·사용자 흐름·API 문서와 체크리스트의 지원 범위를 일치시켰다.
- 결정: 현재 URL 성공 범위는 지원 가능한 일반 공개 웹페이지와 공개 YouTube다. 네이버 블로그는 전용 수집 기술을 선택하거나 도입하지 않고 `URL_FETCH_FAILED` 422와 직접 입력 안내로 처리한다.
- 시행착오: 없음
- 검증: 관련 문서의 네이버 블로그 지원 표현을 제외 정책으로 정리하고 새 의존성이 추가되지 않았음을 확인했다.
- 후속: `QA-CORE-001` 통합 검증을 계속한다.
- 반복 패턴: 없음

## 2026-07-25 · FE-RECIPE-004 · 완료

- 결과: 인증된 `GET /api/recipes/:recipeId`를 기존 API 모듈에 연결하고 책형 목록 레이아웃의 오른쪽 페이지에 제목·설명·인분·시간·재료·조리 순서·출처를 표시한다. 목록 카드와 저장 성공은 같은 상세 URL로 이동하며, 로딩·오류·nullable·빈 배열과 목록 복귀를 처리한다.
- 결정: 별도 상세 페이지와 중복 레이아웃을 만들지 않고 기존 `RecipeListPlaceholderPage`를 `/recipes/:recipeId` 보호 라우트에서도 재사용한다. 데스크톱은 목록과 상세를 함께 표시하고 1100px 이하에서는 상세 단일 페이지로 전환한다.
- 시행착오: 최초 테스트 작성 중 상세 테스트가 기존 `createRecipe` 블록에 중첩되고 파일 끝 괄호가 누락된 문제를 교정했다. 별도 `RecipeDetailPage` 계획은 기존 책형 레이아웃을 중복하므로 기존 페이지의 상세 region 테스트로 변경했다.
- 검증: focused 3개 파일·14개 테스트와 프론트엔드 전체 6개 파일·42개 테스트, `frontend npm run lint`, `frontend npm run build`를 통과했다. 사용자가 데스크톱·태블릿·모바일 시각 QA 완료를 확인했다.
- 후속: `QA-CORE-001` 통합 흐름을 검증한다.
- 반복 패턴: 없음

## 2026-07-25 · BE-RECIPE-004 · 완료

- 결과: `GET /api/recipes/:recipeId`가 현재 Firebase 사용자가 소유한 활성 레시피를 PostgreSQL에서 조회해 `RecipeDetail` 계약으로 반환한다. 재료와 단계는 저장 순서로 정렬하고 출처가 없으면 `null`로 반환하며, 없는·타인 소유·삭제·잘못된 ID는 모두 같은 `RECIPE_NOT_FOUND`로 숨긴다.
- 결정: 부모 레시피 조회에서 Firebase UID 소유권과 `deleted_at IS NULL`을 함께 검사한 뒤에만 재료·단계를 별도 정렬 쿼리로 조회한다. 임의 경로 ID는 UUID 형식을 먼저 확인해 PostgreSQL cast 오류 없이 not-found로 처리한다.
- 시행착오: focused 테스트가 상세 서비스 모듈 부재로 실패하는 Red를 확인했다. 최초 type-check에서 Express 경로 변수가 `string | string[]`로 추론되어, 문자열이 아닌 값은 동일한 not-found 경계로 정규화했다.
- 검증: 백엔드 전체 35개 테스트, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. 정상 상세·출처 없음·없는 ID·타인 소유·삭제·잘못된 ID와 하위 조회 순서를 확인했다.
- 후속: `FE-RECIPE-004`, `BE-RECIPE-006`, `BE-RECIPE-005`, `QA-CORE-001`
- 반복 패턴: 없음

## 2026-07-24 · FE-RECIPE-003 · 완료

- 결과: 편집한 레시피 초안을 Firebase ID 토큰과 함께 실제 생성 API로 저장한다. 요청 중 저장·취소 버튼을 비활성화해 중복 제출을 막고, 서버 검증·네트워크 실패 메시지를 표시하면서 편집값을 유지한다. 성공하면 생성 ID를 Router state에 보존해 목록으로 이동하고 저장 완료 상태를 알린다.
- 결정: 상세 API·화면이 준비되기 전에는 `/recipes`로 이동하며 `location.state.createdRecipeId`를 `FE-RECIPE-004`의 상세 연결 경계로 사용한다. 초기 생성 요청의 개인 메모는 `null`로 보낸다.
- 시행착오: focused 테스트에서 저장 API 함수와 요청·성공·실패 UI가 없어 발생한 Red 5건을 확인한 뒤 최소 연결로 Green을 만들었다.
- 검증: focused 3개 파일·8개 테스트와 프론트엔드 전체 6개 파일·36개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다.
- 후속: `BE-RECIPE-004`, `FE-RECIPE-004`, `QA-CORE-001`
- 반복 패턴: `authenticated-form-submit`

## 2026-07-24 · BE-RECIPE-003 · 완료

- 결과: 인증 사용자가 수정한 전체 레시피 초안을 다시 검증하고, 출처 유무에 따라 `OWNED` 또는 `EXTERNAL`로 결정해 레시피·재료·단계·출처를 PostgreSQL 트랜잭션으로 저장한다. 위조한 소유자·유형과 안전하지 않은 URL은 저장 전에 거부한다.
- 결정: `/api/auth/me` 호출 여부와 무관하게 Firebase UID로 서비스 사용자를 upsert하며, 출처 URL은 콘텐츠를 다시 수집하지 않고 기존 URL 형식·공개 주소 검증을 재사용한다.
- 시행착오: focused 테스트가 생성 서비스 모듈 부재로 실패하는 Red를 확인한 뒤 최소 구현으로 Green을 만들었다.
- 검증: 백엔드 전체 29개 테스트, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. mock DB client로 두 유형 저장, 전체 입력 검증, 위조 필드 거부와 하위 INSERT 실패 시 롤백을 확인했다.
- 후속: `FE-RECIPE-003`, `BE-RECIPE-004`
- 반복 패턴: 없음

## 2026-07-24 · BE-AI-005 · 완료

- 결과: 공개 `youtube.com`, `youtu.be` URL을 검증해 YouTube Data API의 영상 제목·채널명을 출처로 사용하고, 공개 또는 자동 생성 자막을 우선 기존 OpenAI 레시피 구조화 흐름에 연결했다. 자막 조회 실패 시 `gemini-3.6-flash` 영상 분석으로 한 번 대체하며 전체 실패는 기존 `URL_FETCH_FAILED` 422와 직접 입력 안내를 유지한다.
- 결정: `youtube-transcript-api==1.2.4`를 고정하고 검증된 video ID만 shell 없는 Python 프로세스에 전달한다. 자막 프로세스와 메타데이터 요청은 10초, Gemini는 15초 후 중단하며 자동 재시도, 프록시, 쿠키, 계정 인증과 차단 우회를 사용하지 않는다. 영상·자막·썸네일과 제공자 응답 전문은 저장하거나 로그에 남기지 않는다.
- 시행착오: Python 테스트 파일의 초기 경로·들여쓰기 오류를 바로잡았고, stdout UTF-8 문자가 chunk 경계에서 깨지는 문제를 Red 테스트로 확인한 뒤 `StringDecoder`로 보완했다. 첫 병렬 전체 검증은 30초 제한에 걸려 백엔드와 프론트엔드 검증을 분리해 다시 실행했다.
- 검증: 백엔드 24개 테스트, `backend npm run type-check`, `backend npm run build`, Python 단위 테스트·문법 컴파일, 프론트엔드 31개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다.
- 후속: `QA-CORE-001`
- 반복 패턴: `external-provider-boundary`

## 2026-07-23 · FE-AI-002 · 완료

- 결과: AI 초안의 제목, 설명, 인원, 조리 시간, 재료와 조리 단계를 편집하고 배열 항목을 추가·삭제·재정렬할 수 있다. 필수값과 숫자 범위 오류는 관련 입력에 표시되고 초점이 이동하며, AI 경고와 읽기 전용 출처를 연결해 표시한다. 취소 시 레시피 입력 화면으로 돌아가고 모바일에서는 단일 종이 폼으로 사용할 수 있다.
- 결정: 초안 편집 폼은 정규화한 초안을 `onSubmit` 경계로 전달하고, 실제 저장 API 연결과 저장 성공·실패 UX는 `BE-RECIPE-003`, `FE-RECIPE-003`에서 구현한다.
- 시행착오: 자동 브라우저 화면 세션을 사용할 수 없어 390px 모바일 배치, 키보드 접근, 오류 초점과 취소 이동은 사용자가 수동으로 확인했다.
- 검증: 프론트엔드 전체 테스트 5개 파일·31개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 사용자가 390px 화면의 가로 넘침, 반복 항목 배치, 키보드 Focus, 경고·출처 계층과 취소 이동을 수동 확인했다.
- 후속: `BE-RECIPE-003`, `FE-RECIPE-003`
- 반복 패턴: 없음

## 2026-07-23 · COMMON-AI-002 · 완료

- 결과: 임의의 공개 제3자 YouTube 영상 자막 자동 수집을 MVP 지원 범위에서 제외하고, YouTube URL 수집 실패는 기존 `URL_FETCH_FAILED` 422와 직접 입력 안내로 처리하도록 문서를 정리했다. 이에 따라 자막 기반 구현 티켓 `BE-AI-003`은 범위 제외로 종료했다.
- 결정: 공식 YouTube Data API의 메타데이터만으로는 레시피 원문을 얻을 수 없고 자막에는 OAuth 및 영상 편집자 권한이 필요하다. 비공식 스크래핑이나 내부 엔드포인트는 채택하지 않으며 OAuth, API 키, 환경 변수, 의존성 및 새 오류 코드를 추가하지 않는다.
- 시행착오: 없음
- 검증: `git diff --check`와 관련 문서의 YouTube·`URL_FETCH_FAILED`·`BE-AI-003` 일관성 검색을 통과했다. 문서 전용 변경이므로 애플리케이션 테스트는 실행하지 않았다.
- 후속: 없음
- 반복 패턴: 없음

## 2026-07-23 · FE-AI-001 · 완료

- 결과: Firebase ID 토큰으로 AI 구조화 API를 호출하고 처리 중 중복 제출을 막으며, 실패 후 입력과 재시도를 유지한다. 검증된 초안은 `/recipes/draft`로 전달하고 새로고침·직접 접근 또는 빈 제목의 초안은 `/recipes/new`로 돌려보낸다.
- 결정: 초안은 저장 전 임시 데이터이므로 별도 영속화 없이 라우트 상태로 전달하고, 유효성 경계를 전용 Route 컴포넌트에서 적용한다.
- 시행착오: 테스트 격리와 기존 `onPrepare(null)` 호출이 Red 원인을 가려 명시적 cleanup과 제출 전 mock 설정으로 테스트 자체 문제를 제거했다. 일부 외부 URL은 수집 제한으로 422를 반환했고 비레시피 페이지는 AI 응답 검증에서 502로 거부됐으며, 지원 가능한 공개 페이지로 정상 흐름을 확인했다.
- 검증: 프론트엔드 테스트 3개 파일·7개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 실제 API로 직접 입력, URL 단독, URL·직접 입력 혼합 성공과 인증 실패 401, URL 수집 실패 422, AI 응답 실패 502 및 실패 후 재시도를 확인했다.
- 후속: `FE-AI-002`
- 반복 패턴: 없음

## 2026-07-23 · BE-AI-002 · 완료

- 결과: 인증된 사용자의 URL 단독 및 URL·직접 입력 혼합 요청을 안전하게 수집해 AI 구조화에 연결하고, 검증된 제출 URL과 수집한 제목·작성자를 편집용 초안의 출처로 반환한다. 수집 실패는 직접 입력을 안내하는 `URL_FETCH_FAILED`로 반환하며 결과는 자동 저장하지 않는다.
- 결정: `http`와 `https`만 허용하고 DNS 결과를 실제 연결 주소로 고정해 localhost, 사설·링크 로컬·예약 IP를 차단한다. DNS 조회와 각 HTTP 요청은 10초, Redirect는 3회, 응답은 1,048,576바이트, 추출 본문은 20,000자로 제한하며 Redirect 목적지를 매번 재검증한다. HTML은 Schema.org `Recipe`, `article`, `main` 순서로 범위를 제한하고 실행 콘텐츠를 제거한다.
- 시행착오: 최초 구현은 HTTP 연결 전에 수행하는 DNS 조회에 Timeout이 적용되지 않았고 전체 `body`를 추출하는 폴백이 남아 있어 각각 DNS Timeout과 레시피 본문 영역 필수화로 보완했다. 반복 공개 URL 검증 중 IANA가 일시적으로 2xx가 아닌 응답을 반환해 URL 수집과 AI 혼합 구조화를 분리해 확인했다.
- 검증: `backend npm test`의 5개 테스트, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. IANA 공개 URL과 HTTP→HTTPS Redirect 수집, 100바이트 응답 제한, 1ms Timeout, 차단 주소와 20,000자 본문 제한을 확인했고 실제 OpenAI 요청으로 URL 단독 및 혼합 입력의 제목·재료·단계와 서버 출처 주입을 확인했다.
- 후속: `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-22 · BE-AI-001 · 완료

- 결과: 인증된 사용자의 직접 입력을 `POST /api/ai/recipes/structure`에서 OpenAI Responses API로 구조화해 편집용 `RecipeDraft`와 `RecipeWarning`을 반환한다. URL 입력은 후속 티켓까지 거부하고 성공 결과는 데이터베이스에 저장하지 않는다.
- 결정: 요청 원문은 20,000자로 제한하고 사용자별 10분당 10회 제한과 15초 제공자 timeout을 적용한다. OpenAI strict JSON Schema 결과도 서버에서 필수 필드·타입·null·연속 순서와 경고 필드 경로 및 배열 범위를 다시 검증한다.
- 시행착오: OpenAI API 크레딧 부족으로 429 응답이 발생해 상태와 요청 ID만 기록하는 안전한 진단 로그로 원인을 확인했다. TypeScript가 콜백 안에서 `draft` 속성의 타입 좁히기를 유지하지 않아 검증된 배열 길이를 지역 변수로 보존해 경고 인덱스 검사에 전달했다.
- 검증: 실제 OpenAI 요청의 정상 구조화 결과를 확인했다. 빈 입력·20,000자 초과·URL 입력 400, 비인증 401, 사용자 제한 초과 429, 제공자 실패·timeout 502, 잘못된 JSON·응답 구조·경고 경로 502를 확인하고 `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다.
- 후속: `BE-AI-002`, `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-22 · COMMON-AI-001 · 완료

- 결과: 사용자가 승인한 OpenAI Responses API와 `gpt-5.6-luna`를 MVP AI 제공자·모델로 확정하고 백엔드 환경 변수, 요청 제한, 실패 정책과 AI 출력 검증 경계를 문서화했다.
- 결정: 구조화 출력에 `RecipeDraft`와 `RecipeWarning` 스키마를 적용하되 서버가 형식·업무 규칙을 다시 검증한다. AI 결과는 자동 저장하지 않고 사용자가 수정한 저장 요청을 별도로 검증한다.
- 시행착오: 공식 OpenAI 문서 MCP가 현재 세션에 없어 전역 MCP 서버를 등록했고, 이번 결정 근거는 공식 OpenAI 개발자 문서를 직접 확인했다.
- 검증: `git diff --check`, `backend npm run type-check`, `backend npm run build`를 실행했다. 의존성 변경이 없는지 `package.json` diff를 확인했다.
- 후속: `BE-AI-001`, `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-21 · FE-RECIPE-002 · 완료

- 결과: `/recipes/new` 보호 경로와 레시피 입력 폼을 구현했다. 데스크톱에서는 기존 목록 오른쪽 종이에 폼을 표시하고, 1100px 이하에서는 폼을 단일 종이 화면으로 전환한다. URL과 직접 입력은 둘 중 하나 이상과 `http`·`https` URL을 검증하며 `{ sourceUrl, rawText }` 형태로 다음 AI 연결 경계에 전달한다.
- 결정: 기존 목록·인증·책형 레이아웃을 재사용하고 AI API 호출과 저장은 `FE-AI-001` 이후 범위로 남겼다. 전달 초대 코드 진입은 일반 레시피 추가 폼과 분리한다.
- 시행착오: 없음
- 검증: `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 사용자가 데스크톱, 1100px 이하와 390px 화면, 추가·취소 이동, 빈 입력·URL만·직접 입력만·혼합 입력·잘못된 URL, 입력값 유지와 키보드 접근성을 수동 확인했다.
- 후속: `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-20 · FE-RECIPE-001 · 부분 완료

- 결과: 레퍼런스의 `rb-book`, `rb-sidebar`, 두 종이 페이지와 반응형 구조 안에 현재 목록 API 조회, 필터, 카드, 로딩·오류·빈 상태를 구현했다. 책 프레임은 10px 패딩 내부의 명시적인 Grid 행을 채우며, 9-slice 가죽 프레임과 금박 책 엠블럼을 포함한 레퍼런스 스타일을 Tailwind 유틸리티로 관리한다.
- 결정: 오른쪽 종이는 상세와 추가 기능이 준비될 때까지 비워 둔다. 레퍼런스에 배치 규칙이 없는 금박 장식과 아직 없는 음식 이미지·아이콘은 연결하지 않는다.
- 시행착오: 없음
- 검증: `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 인증된 실제 API 응답은 로컬 Firebase·백엔드 연결이 필요해 수동 확인하지 못했다.
- 후속: `DB-SHARE-001`, `FE-RECIPE-002`, `BE-RECIPE-004`, `FE-RECIPE-004`, `FE-RECIPE-001`
- 반복 패턴: 없음

## 2026-07-20 · BE-RECIPE-002 · 부분 완료

- 결과: `GET /api/recipes`가 Firebase UID로 현재 서비스 사용자를 식별해 PostgreSQL의 활성 `OWNED`, `EXTERNAL` 레시피를 생성일 내림차순으로 조회하고, 출처와 `RecipeSummary` 필드를 반환한다.
- 결정: 공유 관계 테이블이 `DB-SHARE-001` 범위이므로, 사용자 결정에 따라 해당 기능 전까지 `RECEIVED` 레시피를 목록에서 제외한다. 공유 구현 시 `receivedInfo` 조회를 추가해 티켓의 남은 완료 조건을 처리한다.
- 시행착오: 없음
- 검증: `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. 자동 테스트 스크립트는 없다.
- 후속: `DB-SHARE-001`, `BE-RECIPE-002`
- 반복 패턴: 없음

## 2026-07-20 · FE-AUTH-003 · 완료

- 결과: Firebase 인증 확인 중 상태를 제공하고, 비로그인 사용자의 보호 경로 접근을 로그인 화면으로 보내며, 로그인 성공 후 원래 레시피 목록 또는 전달 링크 경로로 복귀한다.
- 결정: 프론트엔드 인증 상태는 `AuthProvider`에서 Firebase `onAuthStateChanged`로 관리한다. 복귀 경로는 Router state의 앱 내부 상대 경로만 허용한다.
- 시행착오: Provider와 hook을 분리해 Fast Refresh lint 규칙을 지켰고, 로그인 이동 경로의 중복 import와 경로 오타를 수정했다.
- 검증: 로그아웃 상태의 `/recipes`, `/transfer-invitations/test-token` 접근 후 로그인 복귀와 인증 확인 중 로딩 상태를 수동 확인했고, `frontend npm run lint`, `frontend npm run build`, `git diff --check` 성공을 확인했다.
- 후속: `FE-RECIPE-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-19 · FE-AUTH-002 · 완료

- 결과: Google 로그인 처리 중 중복 클릭을 막고, 실패 메시지와 재시도를 제공하며, `/api/auth/me` 확인 뒤 레시피 목록 경로로 이동한다.
- 결정: 실제 레시피 목록 UI가 구현되기 전까지 `/recipes`에는 최소 임시 화면을 제공하고, `FE-RECIPE-001`에서 교체한다.
- 시행착오: 로그인 화면에 남아 있던 `setRecipes` 미정의 호출과 표시되지 않던 오류 상태를 제거했다.
- 검증: Google 로그인 시도부터 `/recipes` 임시 화면 이동까지 수동 확인, `frontend npm run lint`, `frontend npm run build`, `git diff --check` 성공을 확인했다.
- 후속: `FE-AUTH-003`, `FE-RECIPE-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-18 · BE-AUTH-002 · 완료

- 결과: Firebase ID 토큰으로 식별한 사용자를 PostgreSQL `users`에 생성하거나 갱신하고, `/api/auth/me`가 내부 사용자 ID를 포함한 `CurrentUser`를 반환한다.
- 결정: Firebase는 인증과 UID 검증만 담당하며, 서비스 데이터와 레시피 소유권은 내부 `users.id`로 관리한다. Firebase UID는 연결 키로만 사용하고 이메일은 식별 키로 사용하지 않는다.
- 시행착오: 없음
- 검증: 무토큰 `/api/auth/me` 요청의 `401 UNAUTHORIZED`, 첫 Google 로그인 시 사용자 생성, 같은 계정 재로그인 시 동일 내부 ID 유지, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 확인했다.
- 후속: `FE-AUTH-002`, `BE-RECIPE-002`, `BE-AI-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-18 · DB-CORE-001 · 완료

- 결과: `pg` 기반 PostgreSQL 연결, 순차 SQL 마이그레이션과 핵심 레시피 테이블·제약·인덱스를 추가했다.
- 결정: 현재 규모에서는 ORM 없이 `pg` Pool과 매개변수화한 SQL을 사용한다. 사용자 삭제는 `RESTRICT`, 레시피 하위 데이터와 출처 삭제는 `CASCADE`로 처리한다. 로컬 IPv6 제약에서는 Supabase IPv4 호환 pooler URL을 사용한다.
- 시행착오: Supabase 직접 연결 URL이 IPv6 주소로 해석되어 `ETIMEDOUT`이 발생했고, IPv4 호환 pooler URL로 전환해 해결했다.
- 검증: `backend npm run migrate`를 두 번 실행해 최초 적용과 재실행 건너뛰기를 확인했고, `backend npm run type-check`, `backend npm run build`, 실제 DB 연결 서버 기동, `git diff --check`를 확인했다.
- 후속: `BE-AUTH-002`, `BE-RECIPE-002`, `BE-RECIPE-003`, `DB-SHARE-001`
- 반복 패턴: 없음

## 2026-07-16 · BE-SETUP-002 · 완료

- 결과: 단일 환경 변수 기반 CORS 정책과 100KB JSON 본문 제한을 Express 공통 경계에 적용했다.
- 결정: `CORS_ALLOWED_ORIGIN`이 요청 Origin과 정확히 일치할 때만 교차 출처를 허용하며, 쿠키 credentials는 사용하지 않는다.
- 시행착오: 없음
- 검증: `backend npm run type-check`, `backend npm run build`, 허용·비허용 Origin preflight, 잘못된 JSON 400, 본문 초과 413, `git diff --check`를 확인했다.
- 후속: `DB-CORE-001`, `BE-AUTH-002`, `BE-AI-001`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-API-001 · 완료

- 결과: 프론트엔드 요청을 공통 API 모듈로 통일하고 health·레시피·공통 오류 응답을 `{ data }`와 `{ error }` 계약으로 정리했다.
- 결정: 일반 API 경로의 404는 `API_NOT_FOUND` 코드로 반환하며 API 명세와 데이터 모델의 주요 오류 코드에 함께 기록한다.
- 시행착오: 프론트엔드 lint에는 `setRecipes` 미정의와 화면에 표시되지 않는 오류 상태가 남아 있어 `FE-AUTH-002`로 유지했다.
- 검증: `frontend npm run build`, `backend npm run type-check`, `backend npm run build`, health·404 HTTP envelope 확인, 직접 `fetch` 제거, `git diff --check`를 확인했다.
- 후속: `FE-AUTH-002`, `BE-AUTH-002`, `BE-AI-001`, `BE-RECIPE-003`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-ASSET-001 · 완료

- 결과: 로그인 버튼이 참조하는 공개 경로에 가죽 질감 PNG를 추가해 프로덕션 빌드의 에셋 경고를 해소했다.
- 결정: 기존 `/design-assets/cookbook/leather-texture-tile.png` 참조와 사용자 제공 원본 이미지를 그대로 유지한다.
- 시행착오: 없음
- 검증: PNG 서명·크기 확인과 `frontend npm run build`를 실행했고 에셋 경고 없이 성공했다.
- 후속: `COMMON-API-001`, `FE-AUTH-002`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-SETUP-002 · 완료

- 결과: README에 프론트엔드·백엔드 의존성 설치, Firebase 환경 변수, 로컬 실행과 검증 명령을 기록했다.
- 결정: 로컬 프론트엔드는 Vite proxy를 사용하므로 `VITE_API_BASE_URL`을 생략하고, 분리 배포에서만 백엔드 origin을 설정한다.
- 시행착오: 프론트엔드 lint는 기존 `apiClient`와 로그인 화면 오류로 실패해 관련 티켓 범위로 남겼다.
- 검증: `.env` 파일의 Git 제외 규칙과 미추적 상태를 확인했고, `frontend npm run build`, `backend npm run type-check`, `backend npm run build`가 성공했다.
- 후속: `COMMON-API-001`, `FE-AUTH-002`, `COMMON-ASSET-001`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-DOCS-002 · 완료

- 결과: 온보딩과 입력 범위를 Google 로그인 및 URL·직접 입력 정책에 맞추고, 조리 팁을 후속 범위로 통일했으며 세 데이터 문서의 테이블과 관계를 일치시켰다.
- 결정: Firebase ID 토큰은 요청마다 검증하고 서버 세션을 저장하지 않으며, 서비스 사용자는 `users.firebase_uid`로 식별한다.
- 시행착오: ERD 문서 목록에서 빠진 `sessions` 엔터티와 관련 컬럼·관계·인덱스가 JSON 컬렉션에 남아 있어 참조 단위로 함께 제거했다.
- 검증: ERD JSON 파싱·참조 무결성·canonical 테이블 목록, 과거 명칭과 제외 기능 검색, 체크리스트 상태 및 `git diff --check`를 확인했다.
- 후속: `DB-CORE-001`
- 반복 패턴: 없음

## 2026-07-15 · COMMON-SETUP-003 · 완료

- 결과: 44개 고유 티켓과 완료 조건, 프로젝트 컨텍스트·이력·스킬 후보 문서, `run-project-ticket` 스킬을 연결했다.
- 결정: 티켓은 안정적인 영역·기능 ID를 사용하고, 모든 구현 결과를 기록하며 같은 절차가 두 번째 반복될 때만 스킬화를 제안한다.
- 시행착오: Windows에서 스킬 초기화 시 한글 UI 메타데이터 인코딩과 보호된 `.agents` 쓰기 권한 문제가 발생해 UTF-8 스테이징 파일을 승인된 경로에 복사했다.
- 검증: 티켓 ID 중복·선행 참조·순환 의존성·완료 상태 검사를 통과했고 `quick_validate.py`가 `Skill is valid!`를 반환했다.
- 후속: `COMMON-DOCS-002`, `COMMON-API-001`
- 반복 패턴: 없음
