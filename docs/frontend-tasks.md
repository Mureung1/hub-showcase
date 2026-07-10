# 사이사이 프론트엔드 작업 문서

## 1. 목표와 현재 상태

- 프론트엔드는 `src/`의 React + JavaScript(Vite) 앱이다.
- 현재 `src/app/App.jsx`는 서비스 소개형 단일 화면이며 로그인, 앱 셸, 탭, API 연동은 없다.
- 이 문서의 목표는 소개 화면을 로그인 전 진입 화면으로 전환하고, 공개 데모에서 핵심 사용자 흐름을 완성하는 것이다.
- `prototype/`은 화면 흐름과 샘플 문구 참고용이다. 구현 기준은 실제 `src/`, 이 문서, `docs/design.md` 순으로 확인한다.

## 2. MVP 범위와 공통 규칙

### 포함 범위

- Supabase Auth 이메일/비밀번호 데모 계정 로그인과 로그아웃
- 닉네임, 주거 유형, 주소/건물명 입력과 추천 커뮤니티 선택
- 자유게시판 목록·상세·작성 및 댓글 목록·작성
- 도와주세요 목록·상세·작성·댓글 및 작성자 완료 처리
- 공동구매 목록·상세·생성·참여·수동 마감·참여자 채팅
- 내가 쓴 글, 도움 요청, 참여한 공동구매를 보여주는 나의 활동
- Mock API와 실제 Express API를 교체할 수 있는 repository 경계

### 제외 범위

- 회원가입, 비밀번호 재설정, 소셜 로그인
- 댓글 수정·삭제, 대댓글
- 게시글과 도움 요청 수정·삭제
- 결제·송금·정산 상태, 상품 주문
- 이미지 파일 업로드와 Supabase Storage
- 푸시 알림, 리뷰·신고, 차단, 관리자 화면
- React Router 및 외부 UI 라이브러리

### 상태와 계산

| 도메인 | 저장/API 값 | UI 라벨 |
| --- | --- | --- |
| 도움 요청 | `open` | 진행중 |
| 도움 요청 | `resolved` | 완료 |
| 공동구매 | `open` | 모집중 |
| 공동구매 | `closed` | 모집 마감 |

- 도움 요청에 `done`, `closed`, `completed` 같은 별도 상태를 만들지 않는다.
- 목표 인원 도달은 자동 마감이 아니다. 추가 참여만 차단하고 모집자가 `closed`로 수동 마감한다.
- 예상 1인 부담금은 `Math.ceil(totalAmount / Math.max(participantCount, 1))`로 표시한다.
- 부담금은 결제액이나 확정 정산액이 아니라 참여 인원 기준 예상값이라고 표시한다.

## 3. 디자인과 앱 구조

- 디렉터리 책임과 import 경계는 `docs/directory-structure.md`를 따른다.
- 앱 진입·셸은 `src/app/`, 재사용 UI는 `src/components/ui/`, 도메인 화면과 상태는 `src/features/<feature>/`에 둔다.
- API 계약과 구현체는 `src/repositories/`, mock 데이터는 `src/mocks/`, 공통 인프라는 `src/lib/`, 전역 스타일은 `src/styles/`에 둔다.
- 로그인 전에는 짧은 서비스 소개와 데모 계정 로그인 폼을 보여준다.
- 커뮤니티 입장 후에는 `max-width: 480px` 중앙 모바일 앱 프레임을 사용한다. 데스크톱 사이드바나 대시보드 레이아웃은 만들지 않는다.
- `docs/design.md`의 `--bg`, `--surface`, `--primary`, `--primary-light`, `--green`, `--green-light`, 텍스트·선·그림자 토큰을 사용한다.
- 상단에는 작은 `위치 표시 + 현재 커뮤니티명`을 두고, 탭 제목을 화면의 주 제목으로 사용한다. 입장 후 헤더에 서비스명을 반복하지 않는다.
- 하단 내비게이션은 좌우 여백이 있는 플로팅 pill 형태로 만들고 활성 탭만 라벨을 펼친다.
- 작성 가능한 탭에는 하단 내비게이션 위 FAB를 노출한다. 나의 활동에는 FAB를 표시하지 않는다.
- 핵심 헤더와 위치 표시는 아이콘 폰트 대신 CSS 또는 안정적인 inline SVG를 사용한다.
- 주요 UI 문구는 짧고 자연스러운 한국어로 작성하고 결제나 송금을 서비스가 처리하는 것처럼 표현하지 않는다.

## 4. 구현 체크리스트

### Phase 1. 기반과 인증

- [ ] `src/app/`에 `AppShell`, 앱 상태 조합과 1차 내비게이션을 둔다.
- [ ] `Button`, `TextField`, `TextArea`, `Modal`, `EmptyState`, `StatusBadge`, `Avatar`, `ProgressBar`를 `src/components/ui/`의 공통 컴포넌트로 분리한다.
- [ ] 로그인 화면에서 준비된 데모 이메일/비밀번호로 Supabase Auth에 로그인한다.
- [ ] 회원가입과 비밀번호 재설정 링크는 제공하지 않는다.
- [ ] 세션 복원 중 로딩 화면을 표시하고 만료된 세션은 로그인 화면으로 보낸다.
- [ ] 로그아웃은 Supabase `signOut`으로 처리하고 별도 백엔드 logout API를 호출하지 않는다.
- [ ] 라우팅 라이브러리 없이 `activeTab`, `view`, `selectedId` 상태로 1차 내비게이션을 구현한다.

### Phase 2. 온보딩과 커뮤니티

- [ ] 닉네임, 주거 유형, 주소 또는 건물명 입력 UI를 만든다.
- [ ] 주거 유형은 `apartment_officetel`과 `house_villa` 값을 사용한다.
- [ ] 추천 결과에 커뮤니티명, 지역 라벨, `building`/`block` 타입을 표시한다.
- [ ] 후보 선택과 입장 확인을 거쳐 활성 커뮤니티를 저장한다.
- [ ] 커뮤니티가 없는 사용자는 앱 본문에 진입하지 못하게 한다.
- [ ] 정확한 주소는 다른 사용자 화면에 표시하지 않는다.

### Phase 3. 앱 셸과 탭

- [ ] 자유게시판, 도와주세요, 공동구매, 나의 활동 네 탭을 만든다.
- [ ] 현재 커뮤니티와 사용자 정보는 최소 전역 상태로 관리한다.
- [ ] 자유게시판은 `글쓰기`, 도와주세요는 `도움 요청`, 공동구매는 `모집 만들기` CTA를 제공한다.
- [ ] 커뮤니티 변경은 나의 활동 안의 명확한 진입점에서 시작한다.

### Phase 4. 자유게시판과 댓글

- [ ] 같은 커뮤니티 게시글을 최신순 카드 목록으로 표시한다.
- [ ] 제목과 본문을 받는 작성 폼과 상세 화면을 만든다.
- [ ] 상세에서 댓글을 오래된 순으로 표시하고 댓글 작성 폼을 제공한다.
- [ ] 댓글 수정·삭제와 대댓글 UI는 만들지 않는다.
- [ ] 작성 성공 후 목록 또는 상세 데이터가 즉시 갱신되게 한다.

### Phase 5. 도와주세요와 댓글

- [ ] 도움 요청 목록·작성·상세 화면과 `open`/`resolved` 배지를 만든다.
- [ ] 상세에서 댓글 목록·작성을 지원한다.
- [ ] 작성자에게만 `도움 완료` CTA를 노출하고 `open`에서 `resolved`로 전환한다.
- [ ] 완료된 요청에는 댓글을 계속 표시하되 완료 CTA는 비활성화한다.

### Phase 6. 공동구매

- [ ] 카드에 상품명, 이미지/대체 비주얼, 총액, 참여 인원, 목표 인원, 마감 시각, 예상 부담금, 상태를 표시한다.
- [ ] 생성 폼은 상품명, 선택적 이미지 URL, 총액, 목표 인원, 마감 시각, 분배 위치, 분배 안내, 설명을 받는다.
- [ ] 이미지 URL이 없거나 로드에 실패하면 디자인 토큰 기반 대체 비주얼을 표시한다.
- [ ] 생성자는 자동 참여자로 표시한다.
- [ ] `isJoinable`이 참일 때만 참여 CTA를 활성화한다.
- [ ] 참여 후 인원과 예상 부담금을 서버 응답값으로 즉시 갱신한다.
- [ ] 목표 인원 도달, 중복 참여, 기한 만료, 마감 상태에서는 참여를 차단하고 이유를 표시한다.
- [ ] 모집자에게만 수동 마감 CTA를 제공한다.
- [ ] 모든 관련 화면에 `정산은 사이사이 밖에서 별도로 진행해요` 안내를 표시한다.

### Phase 7. 참여자 채팅과 나의 활동

- [ ] 공동구매 참여자만 채팅 화면에 진입할 수 있게 한다.
- [ ] 채팅은 REST polling으로 cursor 이후 메시지만 가져오고 오래된 순으로 합친다.
- [ ] 빈 메시지와 중복 렌더링을 막고 전송 중 상태를 표시한다.
- [ ] 나의 활동에서 내가 쓴 자유게시글, 도움 요청, 참여 공동구매를 그룹별로 표시한다.
- [ ] 공동구매 항목에는 내 역할(`host`/`member`), 상태, 예상 부담금을 표시한다.

### Phase 8. 상태·접근성·반응형

- [ ] 모든 화면에 loading, empty, error, retry 상태를 제공한다.
- [ ] 401은 세션 정리 후 로그인 화면, 403은 권한 안내, 404는 찾을 수 없음, 409는 참여 불가 사유로 매핑한다.
- [ ] 폼 submit 중 중복 요청을 막고 성공·실패 피드백을 제공한다.
- [ ] 모달과 bottom sheet의 초점 진입·복귀, Escape 닫기, 배경 스크롤 잠금을 처리한다.
- [ ] 버튼과 입력에 키보드 포커스가 보이게 하고 아이콘 전용 버튼에는 접근 가능한 이름을 제공한다.
- [ ] 320px 이상 모바일과 넓은 화면의 중앙 프레임에서 줄바꿈, FAB·내비게이션·CTA 겹침을 확인한다.

## 5. Repository와 API 계약

- 컴포넌트는 mock 배열이나 `fetch`를 직접 사용하지 않고 `src/repositories/`의 `SaisaiRepository` 함수만 호출한다.
- `MockSaisaiRepository`와 `HttpSaisaiRepository`는 같은 인수와 반환 형태를 사용한다.
- DB의 snake_case는 백엔드에서 camelCase로 변환하며 프론트는 camelCase만 사용한다.
- 서버가 계산한 `participantCount`, `shareAmount`, `isParticipant`, `isHost`, `isJoinable`을 우선 사용한다.

```js
/** @typedef {'open' | 'resolved'} HelpStatus */
/** @typedef {'open' | 'closed'} GroupBuyStatus */
```

필수 repository 함수:

- `getMe`, `updateMe`, `matchCommunities`, `joinCommunity`
- `listPosts`, `getPost`, `createPost`, `listPostComments`, `createPostComment`
- `listHelpRequests`, `getHelpRequest`, `createHelpRequest`, `resolveHelpRequest`, `listHelpComments`, `createHelpComment`
- `listGroupBuys`, `getGroupBuy`, `createGroupBuy`, `joinGroupBuy`, `closeGroupBuy`
- `listGroupBuyMessages`, `sendGroupBuyMessage`, `getMyActivity`

공통 응답은 성공 시 `{ data }`, 실패 시 `{ error: { code, message } }`를 사용한다.

## 6. 완료 기준과 검증

- 데모 계정 로그인 후 커뮤니티를 선택하고 네 탭을 이동할 수 있다.
- 게시글과 도움 요청을 작성하고 양쪽 상세에서 댓글을 작성할 수 있다.
- 도움 요청 작성자만 완료 처리할 수 있다.
- 공동구매 생성·참여·정원 차단·수동 마감과 예상 부담금 갱신이 동작한다.
- 참여자만 공동구매 채팅에 진입할 수 있고 나의 활동이 올바르게 집계된다.
- 결제·송금 UI가 없고 별도 정산 안내가 보인다.
- Mock과 실제 API 모드에서 같은 핵심 시나리오가 동작한다.
- `npm run lint`와 `npm run build`를 통과한다.
- 모바일과 넓은 화면에서 텍스트, CTA, FAB, 내비게이션이 겹치지 않는다.
