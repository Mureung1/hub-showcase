# 사이사이 프론트엔드 작업 문서

## 1. 목표와 현재 상태

- 프론트엔드는 `src/`의 React + JavaScript(Vite) 앱이다.
- 현재 구현은 서비스 소개형 단일 화면이며 인증, 온보딩, 앱 탭과 API 연동은 없다.
- 남은 3주 동안 소개 화면을 실제 회원가입 진입점으로 교체하고 다섯 필수 기능을 `HttpSaisaiRepository`로 연결한다.
- 구현 기준은 실제 코드, 이 문서, `docs/product-plan.md`, `docs/design.md` 순이다.

## 2. 확정 범위

### Must

- Supabase 이메일/비밀번호 회원가입, 로그인, 로그아웃, 세션 복원
- 주거 유형, Kakao 주소 검색, 아파트 동 번호 입력과 커뮤니티 자동 배정
- 자유게시판 목록·상세·작성과 댓글 목록·작성
- 도와주세요 목록·상세·작성·댓글, 작성자 완료, 댓글 작성자와 1:1 채팅
- 공동구매 목록·상세·생성·참여, 모집자 확정, 확정 참여자 그룹 채팅
- loading, empty, error, retry와 320/480/1024px 반응형

### Won't

- 이메일 확인, 비밀번호 재설정, 소셜 로그인
- 나의 활동, 커뮤니티 변경
- 이미지 업로드와 이미지 URL
- 수정·삭제, 대댓글, 참여 취소, 모집 취소
- 결제·송금·정산, Realtime/WebSocket, 읽음 표시, 파일 첨부
- 푸시 알림, 리뷰·신고, 차단, 관리자 화면
- React Router, 외부 UI 라이브러리, Mock repository

## 3. 상태와 표시 규칙

| 도메인 | API 값 | UI 라벨 |
|---|---|---|
| 도움 요청 | `open` | 진행중 |
| 도움 요청 | `resolved` | 완료 |
| 공동구매 | `recruiting` | 모집중 |
| 공동구매 | `confirmed` | 구매 확정 |
| 공동구매 파생값 | `isExpired: true` | 모집 종료 |

- 완료된 도움 요청은 내용과 기존 대화를 표시하되 댓글·새 채팅·메시지 입력을 비활성화한다.
- 공동구매 목표 인원 도달은 자동 확정이 아니다. 모집자가 `구매 확정`을 눌러야 한다.
- 확정 전에는 공동구매 채팅 CTA를 렌더링하지 않는다.
- 예상 부담금은 서버 응답 `shareAmount`를 표시하고 `예상 금액이며 정산은 사이사이 밖에서 진행해요`를 함께 노출한다.

## 4. 앱 구조와 디자인

- 로그인 전에는 회원가입/로그인 전환 폼을 표시한다.
- 로그인 후 profile에 active community가 없으면 온보딩만 표시한다.
- 커뮤니티 입장 후 `max-width: 480px` 중앙 모바일 앱 프레임을 사용한다.
- 하단 탭은 자유게시판, 도와주세요, 공동구매 세 개만 만든다.
- 상단은 위치 표시와 현재 커뮤니티명을 작은 문맥 라벨로, 탭명을 주 제목으로 표시한다.
- 하단 내비게이션은 플로팅 pill, 작성 버튼은 내비게이션 위 FAB로 만든다.
- `docs/design.md`의 기존 색상·간격·그림자 토큰을 재사용한다.
- 한글 문구는 짧고 자연스럽게 작성하고 결제·송금을 서비스가 처리하는 표현을 사용하지 않는다.

## 5. 구현 작업

### FE-01 인증과 앱 분기 — L (2일)

- Supabase Auth adapter에 `signUp`, `signInWithPassword`, `signOut`, `getSession`, auth state 구독을 구현한다.
- 회원가입은 이메일, 비밀번호, 비밀번호 확인을 받고 비밀번호 8~72자를 검증한다.
- 로그인 실패, 중복 이메일, 네트워크 실패를 한국어 오류로 표시한다.
- 세션 복원 중 전용 로딩 화면을 표시한다.
- 세션 존재 시 `getMe`로 온보딩 여부를 판단한다.

완료 조건:

- 가입 직후 세션이 생성되고 온보딩으로 이동한다.
- 새로고침 후 세션과 화면이 복원된다.
- 로그아웃 후 로그인 화면으로 돌아간다.

### FE-02 주소 검색과 자동 배정 — L (2일)

- 닉네임 2~20자와 주거 유형을 입력한다.
- 주소 검색어는 2~100자로 제한하고 submit 시 `searchAddresses`를 호출한다.
- 결과에는 도로명 주소, 지번 주소, 건물명을 표시한다.
- `apartment_officetel`은 선택한 주소와 1~10자 동 번호를, `house_villa`는 선택한 주소만 제출한다.
- `completeOnboarding` 성공 시 반환된 community를 전역 앱 상태에 저장하고 앱에 진입한다.
- 실패 시 임의 커뮤니티에 진입시키지 않고 같은 입력으로 재시도할 수 있게 한다.

완료 조건:

- 사용자가 추천 후보를 고르지 않고 주소 선택 후 서버가 반환한 단일 커뮤니티로 입장한다.
- 주소 원문과 좌표를 브라우저 영속 저장소에 보관하지 않는다.

### FE-03 앱 셸과 공통 UI — M (1일)

- `Button`, `TextField`, `TextArea`, `Modal`, `EmptyState`, `StatusBadge`, `Avatar`, `ProgressBar`를 공통 UI로 구현한다.
- `activeTab`, `view`, `selectedId` 상태로 목록·상세·작성·채팅을 이동한다.
- 모든 submit 중 중복 요청을 막는다.
- modal/bottom sheet의 초점 진입·복귀, Escape 닫기, 배경 스크롤 잠금을 처리한다.

### FE-04 자유게시판 — M (1일)

- 글 목록은 최신순, 댓글은 오래된 순으로 표시한다.
- 제목 2~80자, 본문 1~2,000자, 댓글 1~500자를 검증한다.
- 글/댓글 작성 성공 후 상세와 목록을 즉시 다시 조회한다.
- 수정·삭제와 대댓글 UI는 만들지 않는다.

완료 조건:

- 목록→상세→글 작성→댓글 작성 흐름이 실제 API에서 동작한다.

### FE-05 도와주세요 — L (2일)

- 목록과 상세에 `open/resolved` badge를 표시한다.
- 작성자에게만 `도움 완료` 버튼을 노출한다.
- 댓글마다 작성자 본인에게만 `채팅하기` 버튼을 노출한다.
- `createHelpConversation`은 새 방 또는 기존 방 ID를 받아 채팅 화면으로 이동한다.
- 완료 상태에서는 댓글 입력, 채팅하기, 메시지 입력을 제거하고 기록만 표시한다.

완료 조건:

- 비작성자에게 완료 버튼이 보이지 않는다.
- 댓글을 남긴 사용자와만 1:1 채팅에 진입한다.

### FE-06 공통 채팅 — L (2일)

- 최초 진입 시 최대 50개 메시지를 오래된 순으로 표시한다.
- 화면이 열려 있고 `document.visibilityState === 'visible'`일 때 3초마다 cursor 이후 메시지를 조회한다.
- 화면 이탈, 탭 숨김, 로그아웃 시 interval과 진행 중 요청을 중단한다.
- 메시지는 ID 기준 중복 제거 후 오래된 순으로 합친다.
- 공백 메시지와 1,000자 초과 메시지는 전송하지 않는다.

완료 조건:

- 동일 채팅에서 polling과 로컬 전송 응답이 중복 렌더링되지 않는다.
- 비활성 화면에서 polling 요청이 발생하지 않는다.

### FE-07 공동구매 — L (2일)

- 목록과 상세에 상품명, 총액, 참여/목표 인원, 마감 시각, 예상 부담금, 상태를 표시한다.
- 생성 폼은 제목 2~80자, 설명 1~2,000자, 총액, 목표 인원, 마감 시각, 분배 위치 2~100자를 받는다.
- 생성자는 host 참여자라는 정보를 표시한다.
- `isJoinable`일 때만 참여 버튼을 활성화하고 `joinBlockedReason`을 한국어로 표시한다.
- 모집자이며 정원 도달, 미확정, 미만료일 때만 `구매 확정` 버튼을 노출한다.
- `confirmGroupBuy` 성공 후 반환된 conversation ID로 그룹 채팅에 진입한다.
- 확정 참여자에게만 `참여자 채팅` CTA를 표시한다.

완료 조건:

- 참여 후 인원과 예상 부담금이 서버 응답값으로 갱신된다.
- 확정 전 채팅 CTA가 없고 확정 후 참여자만 진입한다.

### FE-08 상태·접근성·반응형 검증 — L (2일)

- 401은 세션 정리 후 로그인, 403은 권한 안내, 404는 찾을 수 없음, 409는 도메인별 차단 사유로 매핑한다.
- 모든 목록과 상세에 loading, empty, error, retry를 구현한다.
- 키보드 포커스와 아이콘 전용 버튼의 접근 가능한 이름을 확인한다.
- 320px, 480px, 1024px에서 줄바꿈과 CTA/FAB/내비게이션 겹침을 확인한다.
- `npm run lint`와 `npm run build`를 통과한다.

## 6. Repository 계약

컴포넌트는 `fetch`를 직접 호출하지 않고 `HttpSaisaiRepository`만 사용한다. DB snake_case는 백엔드에서 camelCase로 변환한다.

필수 함수:

- `getMe`, `searchAddresses`, `completeOnboarding`
- `listPosts`, `getPost`, `createPost`, `listPostComments`, `createPostComment`
- `listHelpRequests`, `getHelpRequest`, `createHelpRequest`, `resolveHelpRequest`, `listHelpComments`, `createHelpComment`, `createHelpConversation`
- `listGroupBuys`, `getGroupBuy`, `createGroupBuy`, `joinGroupBuy`, `confirmGroupBuy`
- `listConversationMessages`, `sendConversationMessage`

성공은 `{ data }`, 실패는 `{ error: { code, message } }`로 처리한다.

## 7. 프론트 완료 게이트

- 신규 가입→주소 검색→자동 배정→세 탭 진입이 동작한다.
- 자유게시글·도움 요청·공동구매의 작성과 상세 흐름이 동작한다.
- 도움 작성자 완료와 댓글 작성자 1:1 채팅이 동작한다.
- 공동구매 정원 도달 후 모집자 확정과 확정 참여자 그룹 채팅이 동작한다.
- 다른 커뮤니티, 비작성자, 비참여자의 서버 403을 행동 가능한 화면으로 표시한다.
- 결제·송금·이미지·나의 활동·커뮤니티 변경 UI가 없다.
- `npm run lint`와 `npm run build`가 통과한다.
