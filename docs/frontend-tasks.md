# 사이사이 프론트엔드 작업 문서

## 1. 현재 상태

- 프론트엔드 본체는 `src/`의 React + Vite 앱이다.
- 현재 화면은 `src/App.jsx`의 단일 소개형 카드이며, 서비스 소개, 문제 정의, 핵심 기능, 이용 흐름을 보여준다.
- `src/index.css`와 `src/App.css`에 전역 색상 변수와 반응형 카드 스타일이 있다.
- `prototype/`은 기능 흐름 참고용이다. 일부 한글이 깨져 있으므로 UI 문구와 도메인 기준은 `README.md`, `wiki/기획서.md`, 현재 `src/`를 우선한다.
- 아직 없는 것:
  - 앱 셸과 탭 내비게이션
  - 온보딩과 커뮤니티 입장
  - 자유게시판, 도와주세요, 공동구매, 나의 활동 화면
  - API 클라이언트, mock repository 경계, 서버/Supabase 연동
  - JavaScript 기준 데이터/API 계약 정리

## 2. 공통 기준

### 도와주세요 상태값

| 저장/API 값 | UI 라벨 | 의미 |
| --- | --- | --- |
| `open` | 진행중 | 도움 요청 진행 중 |
| `resolved` | 완료 | 작성자가 완료 처리함 |

- 프론트 내부 mock, 향후 API 클라이언트, UI 상태 모두 `open` / `resolved`를 기준으로 한다.
- `done`, `closed`, `completed` 등 다른 상태 키를 도와주세요 상태로 사용하지 않는다.
- 화면에는 한글 라벨만 매핑해서 표시한다.

### 공동구매 정책

- 목표 인원 도달 시 추가 참여를 차단한다.
- 목표 인원 도달은 자동 마감을 뜻하지 않는다. 모집자는 별도 수동 마감 액션으로 `closed` 처리한다.
- 참여 가능 조건은 `status === 'open'`, 마감 전, 미참여자, `joinedCount < goalCount`이다.
- 서비스 내 결제/송금 UI는 만들지 않는다.
- 공동구매 화면에는 분배 위치, 분배 안내, 별도 정산 안내를 노출한다.

### 1차 제외 범위

- 댓글/대댓글
- React Router 등 외부 라우팅 라이브러리
- 외부 UI 라이브러리
- 푸시 알림
- 리뷰/신고
- 차단
- 관리자 페이지
- 결제/송금 직접 처리

## 3. 작업 체크리스트

### Phase 0. 기반 정리

- [ ] 현재 소개형 화면을 앱 진입 전 랜딩 또는 임시 홈으로 둘지 정리한다.
- [ ] 기존 CSS 변수(`--orange`, `--green`, `--navy`, `--muted`, `--cream`, `--soft-green`, `--border`)를 우선 재사용한다.
- [ ] `AppShell`, 모바일 헤더, 데스크톱 사이드바, 하단 탭 영역을 나눌 구조를 잡는다.
- [ ] 공통 UI 후보를 만든다.
  - `Button`
  - `TextField`
  - `TextArea`
  - `SelectField`
  - `Modal`
  - `EmptyState`
  - `StatusBadge`
  - `Avatar`
  - `ProgressBar`
- [ ] mock 데이터를 컴포넌트 안에 직접 넣지 않고 `src/mocks/` 또는 `src/data/` 같은 경계로 분리한다.
- [ ] 화면은 `MockSaisaiApi` 같은 repository 인터페이스를 통해 데이터를 읽고 쓰도록 준비한다.
- [ ] 1차 내비게이션은 React 내부 view state로 구현한다.
- [ ] 라우터 라이브러리는 별도 합의 후 P2에서 검토한다.

### Phase 1. 온보딩 / 커뮤니티 입장

- [ ] 닉네임 입력 화면을 만든다.
- [ ] 주거 유형 토글을 만든다.
  - 아파트/오피스텔
  - 주택/빌라
- [ ] 주소 또는 건물명 입력 UI를 만든다.
- [ ] 시드/단순 규칙 기반 추천 커뮤니티 목록을 표시한다.
- [ ] 커뮤니티 타입을 표시한다.
  - `building`: 건물형
  - `block`: 블록형
- [ ] 사용자가 추천 커뮤니티를 선택하고 입장할 수 있게 한다.
- [ ] 미입장 사용자는 앱 본문으로 들어가지 못하게 한다.
- [ ] 현재 사용자와 현재 커뮤니티를 최소 전역 상태로 관리한다.

### Phase 2. 앱 셸 / 내비게이션

- [ ] 탭을 구성한다.
  - 동네생활
  - 도와주세요
  - 공동구매
  - 나의 활동
- [ ] 현재 커뮤니티명을 상단 또는 사이드바에 표시한다.
- [ ] 프로필/커뮤니티 변경 진입점을 둔다.
- [ ] 탭별 작성 CTA 노출 규칙을 정한다.
  - 동네생활: 글쓰기
  - 도와주세요: 도움 요청
  - 공동구매: 모집 만들기
  - 나의 활동: 작성 CTA 숨김
- [ ] 데스크톱과 모바일에서 레이아웃이 깨지지 않게 한다.
- [ ] 내부 view state 예시를 정리한다.
  - `activeTab`
  - `view`
  - `selectedId`

### Phase 3. 자유게시판

- [ ] 같은 커뮤니티의 자유게시글 목록을 카드로 표시한다.
- [ ] 게시글 작성 폼을 만든다.
- [ ] 게시글 상세 화면을 만든다.
- [ ] 1차 상세는 제목, 본문, 작성자, 작성 시각 중심으로 구성한다.
- [ ] 빈 목록, 로딩, 에러 상태를 준비한다.
- [ ] 댓글 목록/작성은 P2 후속 작업으로 둔다.

### Phase 4. 도와주세요

- [ ] 도움 요청 목록을 만든다.
- [ ] `open` / `resolved` 상태 배지를 표시한다.
- [ ] 도움 요청 작성 폼을 만든다.
- [ ] 도움 요청 상세 화면을 만든다.
- [ ] 작성자만 `open`에서 `resolved`로 완료 처리할 수 있게 한다.
- [ ] 완료된 요청은 CTA를 비활성화하거나 완료 상태로 표시한다.
- [ ] 진행중/완료 필터는 선택 기능으로 두되, 목록 배지 표시를 먼저 완성한다.
- [ ] 댓글/응답 스레드는 P2 후속 작업으로 둔다.

### Phase 5. 공동구매

- [ ] 공동구매 카드 목록을 만든다.
- [ ] 카드에 핵심 정보를 표시한다.
  - 상품명
  - 이미지 또는 대체 비주얼
  - 총 금액
  - 현재 참여 인원
  - 목표 인원
  - 마감 시간
  - 1인 예상 부담금
  - 참여 상태
- [ ] 모집 생성 폼을 만든다.
  - 상품명
  - 상품 이미지
  - 총 금액
  - 목표 인원
  - 마감 시간
  - 분배 위치
  - 분배 안내
  - 설명
- [ ] 상세 화면을 만든다.
  - 설명
  - 참여 인원
  - 1인 부담금
  - 마감 상태
  - 분배 안내
  - 참여 CTA
- [ ] 참여 후 `joinedCount`와 1인 부담금을 즉시 갱신한다.
- [ ] `joinedCount >= goalCount`이면 추가 참여를 차단한다.
- [ ] 모집자 수동 마감 액션을 만든다.
- [ ] 마감/취소된 모집은 신규 참여 CTA를 비활성화한다.
- [ ] 참여자 전용 조율 채팅 화면을 만든다.
- [ ] 채팅 1차는 REST polling 또는 mock으로 설계하고, Supabase Realtime은 후속으로 둔다.
- [ ] 결제 없음/별도 정산 안내 문구를 고정 노출한다.

### Phase 6. 나의 활동

- [ ] 내가 쓴 자유게시글 목록을 보여준다.
- [ ] 내가 쓴 도움 요청 목록을 보여준다.
- [ ] 내가 참여한 공동구매 목록을 보여준다.
- [ ] 각 항목에서 상세 화면으로 이동할 수 있게 한다.
- [ ] 공동구매 항목에는 내 역할과 1인 부담금을 표시한다.

### Phase 7. 데이터 경계 / API 교체 준비

- [ ] 화면은 직접 mock 배열을 조작하지 않고 repository 함수를 호출한다.
- [ ] 1차 repository 후보:
  - `onboard`
  - `matchCommunities`
  - `selectCommunity`
  - `listPosts`
  - `createPost`
  - `getPost`
  - `listHelpRequests`
  - `createHelpRequest`
  - `resolveHelpRequest`
  - `listGroupBuys`
  - `getGroupBuy`
  - `createGroupBuy`
  - `joinGroupBuy`
  - `closeGroupBuy`
  - `listMessages`
  - `sendMessage`
  - `getMyActivity`
- [ ] 1인 부담금 계산 유틸을 한곳에 둔다.
  - `ceil(totalAmount / max(joinedCount, 1))`
- [ ] 참여 가능 여부 계산 유틸을 한곳에 둔다.
  - `status === 'open'`
  - 마감 전
  - 미참여
  - `joinedCount < goalCount`
- [ ] 향후 `HttpSaisaiApi` 또는 Supabase 연동 구현으로 교체할 수 있게 한다.

## 4. 우선순위

1. P0: 앱 셸, mock repository, 내부 view state 내비게이션
2. P0: 온보딩과 커뮤니티 입장
3. P0: 공동구매 목록/상세/참여/1인 부담금/목표 인원 차단
4. P1: 공동구매 모집 생성/수동 마감/참여자 채팅
5. P1: 도와주세요 목록/작성/상세/완료 처리
6. P1: 자유게시판 목록/작성/상세
7. P2: 나의 활동 다듬기
8. P2: 댓글/대댓글
9. P2: React Router 등 라우터 라이브러리 도입 검토
10. P2: JavaScript 코드 구조 정리 및 JSDoc/문서화 검토

## 5. 백엔드/DB 인터페이스 가정

### 사용자 / 커뮤니티

```ts
User {
  id: string
  nickname: string
}

Community {
  id: string
  name: string
  type: 'building' | 'block'
  regionLabel?: string
}
```

### 자유게시판

```ts
Post {
  id: string
  communityId: string
  authorId: string
  authorNickname: string
  title: string
  body: string
  createdAt: string
}
```

### 도와주세요

```ts
HelpRequest {
  id: string
  communityId: string
  authorId: string
  authorNickname: string
  title: string
  body: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt?: string
}
```

### 공동구매

```ts
GroupBuy {
  id: string
  communityId: string
  hostId: string
  hostNickname: string
  title: string
  description: string
  imageUrl?: string
  totalAmount: number
  goalCount: number
  joinedCount: number
  deadlineAt: string
  pickupLocation: string
  distributionNote?: string
  status: 'open' | 'closed' | 'cancelled'
  participantIds: string[]
  shareAmount: number
  createdAt: string
}
```

### 참여자 채팅

```ts
ChatMessage {
  id: string
  groupBuyId: string
  authorId: string
  authorNickname: string
  body: string
  createdAt: string
}
```

## 6. 완료 기준

- 닉네임과 커뮤니티 선택 후 앱에 입장할 수 있다.
- 4개 탭을 이동할 수 있다.
- 자유게시글 목록/작성/상세가 동작한다.
- 도움 요청 목록/작성/상세와 `open`에서 `resolved` 완료 처리가 동작한다.
- 공동구매 목록/상세/생성/참여/수동 마감이 동작한다.
- 목표 인원 도달 시 추가 참여가 차단된다.
- 1인 부담금이 모든 화면에서 같은 공식으로 표시된다.
- 참여자만 공동구매 채팅에 진입할 수 있다.
- 나의 활동에서 내 글, 내 도움 요청, 내 공동구매 참여 내역이 보인다.
- 결제/송금 기능이 없고, 별도 정산 안내가 노출된다.
- 댓글, 푸시, 리뷰/신고, 차단, 관리자 페이지는 구현되어 있지 않다.

## 7. 검증

- 문서 작업만으로는 `npm run lint` / `npm run build`가 필수는 아니다.
- UI 구현 후에는 다음을 확인한다.
  - `npm run lint`
  - 동작/번들 영향이 있으면 `npm run build`
  - 모바일 폭과 데스크톱 폭에서 텍스트 줄바꿈, CTA 노출, 요소 겹침 확인
  - 온보딩 -> 공동구매 생성 -> 참여 -> 목표 인원 차단 -> 수동 마감 -> 나의 활동 시나리오 확인
