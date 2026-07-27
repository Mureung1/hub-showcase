# 개발 일지 (Development Log)
프로젝트의 세부 구현 계획과 실제 개발 완료 내역을 날짜별로 기록하는 문서입니다.

---

## 2026-07-21

### ✅ 1. 유저 식별 및 역할 전환 시스템 (완료)
* **목표**: 로그인 없이 브라우저 단위로 유저를 식별하고, 방장/도와주는 사람 역할을 스위칭하여 UI를 테스트할 수 있는 임시 환경 구축.
* **작업 내역**: 
  * `crypto.randomUUID()`와 React Context API를 활용해 로컬 스토리지 기반 유저 발급(`AuthContext.jsx`).
  * `AppHeader.jsx`에 클릭 시 역할이 즉각 변경되는 토글 뱃지 추가.
* **관련 파일**: `AuthContext.jsx` (신규), `main.jsx`, `AppHeader.jsx`

### ✅ 2. 게시글 상세 화면 구현 (완료)
* **목표**: 피드에서 게시글 배너 클릭 시 상세 내용을 보여주고, 현재 역할에 맞는 하단 액션 버튼 노출. (PC 뷰 최적화)
* **작업 내역**: 
  * `App.jsx`에 `selectedPost` 상태를 두어 상세 화면과 피드 목록 전환 처리.
  * PC의 넓은 레이아웃에 맞게 버튼을 본문 하단에 자연스럽게 배치하고 최소 높이 지정.
  * 상세 진입 시 우측 하단의 `[+ 글쓰기]` FAB 버튼은 숨김 처리.
* **관련 파일**: `PostDetail.jsx` (신규), `App.jsx`, `FeedList.jsx`, `PostCard.jsx`

### ✅ 3. 1:1 채팅 신청 모달 (완료)
* **목표**: 도와주는 사람이 채팅 시작 시 가벼운 첫 인사를 건넬 수 있는 모달 창 띄우기.
* **작업 내역**:
  * 최대 50자 글자 수 제한 및 실시간 카운팅 `(0/50)` 기능을 갖춘 `ChatRequestModal` 컴포넌트 생성.
  * 내용 없이 공백만 칠 경우 [전송하기] 버튼 비활성화 되도록 방어 로직 구현.
  * `PostDetail` 컴포넌트 하단 버튼과 연결하였으며, 전송 시 `alert` 알림 후 창 닫히도록 임시 처리 완료.
* **관련 파일**: `ChatRequestModal.jsx` (신규), `PostDetail.jsx` (수정)

### ✅ 4. 메신저 스타일 채팅방 UI 퍼블리싱 (완료)
* **목표**: 실시간 통신 연동 전, 카카오톡 스타일의 채팅방 화면 UI와 가짜 데이터 기반의 동작 로직 구성.
* **작업 내역**:
  * 전체 화면 높이를 꽉 채우는 `ChatRoom.jsx` 컴포넌트 생성.
  * 헤더 아래에 역할(방장/도와주는사람)에 따라 [약속 완료] / [약속 잡기] 텍스트와 띠 배너 분기 렌더링 적용.
  * 로컬 상태(`useState`)를 활용해 하단 입력창에 타자를 치고 전송(Enter)하면 실시간으로 오렌지색 내 말풍선이 렌더링되게 구현 (상대방은 회색 말풍선).
  * 모달에서 작성했던 '첫 인사'가 초기 메시지로 자동 적용되도록 연결 (`App.jsx`의 `activeChat` 상태로 데이터 통신).
* **관련 파일**: `ChatRoom.jsx` (신규), `App.jsx`, `PostDetail.jsx`

### ✅ 5. 1:1 채팅방 목록 탭 및 대화내역 영구 저장 (완료)
* **목표**: 상단의 1:1 대화 탭을 활성화하여 내가 만든 채팅방 목록을 모아보고, 새로고침해도 대화가 날아가지 않게 로컬 스토리지에 유지하기.
* **작업 내역**:
  * `App.jsx`와 `AppHeader.jsx`를 수정해 상단 네비게이션 탭(`currentTab`) 전환 기능 활성화.
  * 채팅방 목록을 보여주는 `ChatList.jsx` 컴포넌트를 신규 제작하여 카카오톡 목록처럼 [프로필, 이름, 마지막 메시지, 시간] 표시.
  * 채팅방 개설 시 방의 메타 데이터와 초기 메시지를 `localStorage`에 각각 저장.
  * `ChatRoom.jsx`에서 `useEffect`를 통해 방 ID별로 `localStorage`에서 메시지를 꺼내오고, 타자를 칠 때마다 즉시 저장하도록 동기화 로직 추가.
* **관련 파일**: `ChatList.jsx` (신규), `App.jsx`, `AppHeader.jsx`, `ChatRoom.jsx`

### ✅ 6. 채팅 말풍선 UI 가독성 및 위치 동기화 보완 (완료)
* **작업 내역**:
  * 나와 상대방의 역할을 스위칭할 때 말풍선 위치가 꼬이는 버그 수정. 메시지를 저장할 때 발송자의 역할을 함께 저장(`sender: currentUser.role`)하고, 현재 접속자의 역할과 일치할 때만 우측 정렬되도록 로직 변경.
  * 오렌지색 말풍선 내부의 글자 색상을 흰색에서 검은색(`var(--color-text-primary)`)으로 변경하여 가독성 개선.
* **관련 파일**: `ChatRoom.jsx`, `App.jsx`

## 2026-07-22

### ✅ 1단계: 백엔드 Socket.io 설정 (완료)
* **목표**: 기존 Express 서버에 실시간 양방향 통신을 위한 Socket.io 패키지 적용 및 초기 세팅
* **작업 내역**: 
  * `server` 디렉토리 내에 `socket.io` 패키지 설치
  * Node.js 내장 `http` 모듈로 `express` 앱을 래핑하여 `socket.io` 인스턴스 연결 및 CORS 환경 구성
  * 실시간 연결 확인용 `connection` 및 `disconnect` 로깅 로직 작성
* **수정될 파일명**:
  * `server/package.json`
  * `server/src/app.js`

### ✅ 2단계: 프론트엔드 Socket.io 클라이언트 설정 (완료)
* **목표**: 프론트엔드 환경에 `socket.io-client` 패키지를 적용하고, 앱 전역에서 소켓을 활용할 수 있도록 Context 구축
* **작업 내역**: 
  * `client` 디렉토리 내에 `socket.io-client` 설치
  * `client/src/contexts/SocketContext.jsx` 파일을 생성하여 백엔드(포트 5000 등)와 연결하는 Socket 인스턴스 전역 제공(`Provider`) 로직 구현
  * `client/src/main.jsx`에 `SocketProvider`를 감싸서 어느 컴포넌트에서든 실시간 통신이 가능하도록 연동
* **관련 파일**:
  * `client/package.json` (수정)
  * `client/src/contexts/SocketContext.jsx` (생성)
  * `client/src/main.jsx` (수정)
* **완료 조건(검증 방법)**:
  * 프론트엔드 앱이 정상 구동되며 렌더링 에러가 발생하지 않아야 함.
  * 프론트엔드 접속 시 백엔드 터미널에 `🔗 A user connected: <socket-id>` 메시지가 찍혀 정상적으로 양방향 통신 준비가 완료되었음을 확인해야 함.

### ✅ 3단계: 실시간 양방향 메시지 송수신 구현 (완료)
* **목표**: 임시 식별자(UUID) 방식을 활용해 프론트엔드와 백엔드 간에 실시간 `joinRoom`, `sendMessage`, `receiveMessage` 이벤트를 주고받는 로직 구축
* **작업 내역**: 
  * 백엔드(`app.js`): `joinRoom` 이벤트 발생 시 해당 방 번호로 `socket.join(roomId)` 처리. `sendMessage` 이벤트 수신 시 같은 방 참여자들에게 `receiveMessage` 브로드캐스팅
  * 프론트엔드(`ChatRoom.jsx`): `SocketContext`에서 `socket`을 불러와 마운트 시 `joinRoom` emit. 입력창 전송 시 `sendMessage` emit 처리 및 `receiveMessage` 리스너를 통한 상태(State) 갱신
* **수정될 파일명**:
  * `server/src/app.js`
  * `client/src/components/ChatRoom.jsx`
* **완료 조건(검증 방법)**:
  * 브라우저 탭 2개를 열어 하나는 '방장', 하나는 '도와주는 사람' 역할로 설정 후 같은 채팅방에 입장.
  * 한쪽에서 메시지를 보냈을 때 새로고침 없이 다른 쪽 브라우저 화면에 말풍선이 즉시 뜨는지 확인.

### ✅ 4단계: 데이터베이스(Supabase) 연동 및 채팅 내역 API 구현 (완료)
* **목표**: 오고 가는 실시간 메시지를 영구적으로 보존하기 위해 DB에 저장하고, 다시 채팅방에 접속했을 때 이전 대화 기록을 불러오는 로직 구축
* **작업 내역**: 
  * 백엔드(`app.js`): 
    - `GET /api/chat/:roomId` 엔드포인트를 만들어 특정 방의 메시지 내역을 반환 (Mock DB / Supabase 분기 처리)
    - 기존 `socket.on('sendMessage')` 안에서 수신받은 메시지 데이터를 실시간으로 DB(또는 `mockDb.messages`)에 `insert` 하도록 로직 추가
  * 프론트엔드(`ChatRoom.jsx`): 
    - `useEffect`에 있던 기존 `localStorage` 로드 로직을 제거하고, `fetch`를 이용해 `GET /api/chat/:roomId`에서 대화 내역을 받아오도록 교체
* **수정될 파일명**:
  * `server/src/app.js`
  * `client/src/components/ChatRoom.jsx`
* **완료 조건(검증 방법)**:
  * 채팅방에서 메시지를 몇 개 전송한 뒤, 브라우저를 완전히 새로고침(F5) 했을 때 로컬 스토리지가 아닌 서버 API를 통해 이전 메시지들이 정상적으로 복구되어 렌더링되는지 확인.

## 2026-07-23

### ✅ 1. 1:1 대화 / 커뮤니티 탭 전환 시 상단 헤더 흔들림(Layout Shift) 버그 수정 (완료)
* **원인**: 커뮤니티 탭(피드 긴 목록)과 1:1 대화 탭(짧은 목록) 간 탭 이동 시, 수직 스크롤바 유무 차이로 인해 `position: fixed` 헤더(`AppHeader`) 및 레이아웃 전체가 좌우로 미세하게 밀리고 흔들리는 현상 발생.
* **작업 내역**:
  * `index.css`의 `html` 셀렉터에 `overflow-y: scroll;` 및 `scrollbar-gutter: stable;` 속성을 지정하여 스크롤바 유무에 관계없이 일정한 폭 보장.
  * `AppHeader.jsx` 내 네비게이션 요소의 `<a>` 태그를 `<button type="button">`으로 교체하고 버튼 스타일 리셋을 적용해 앵커 링크 클릭으로 인한 예기치 않은 스크롤 스냅 방지.
* **관련 파일**:
  * `client/src/index.css` (수정)
  * `client/src/components/AppHeader.jsx` (수정)

### ✅ 2. 기존 피드 필터 바 검색창 활용 게시글 검색 및 2자 이상 유효성 검증 구현 (완료)
* **목표**: 헤더에 새 검색창을 추가하는 대신, 피드 필터 영역(`FeedTabs.jsx`) 옆에 이미 존재하는 기존 검색창(`search-input`)에 통합 검색 기능 및 2자 이상 입력 검증 로직 구현.
* **작업 내역**:
  * **헤더 복원 (`AppHeader.jsx`)**: 헤더의 오버레이 검색창을 제거하고 단순 깔끔한 헤더 상태로 복원. (돋보기 클릭 시 피드 탭으로 이동).
  * **피드 필터 검색바 (`FeedTabs.jsx`)**: 기존 `search-box` 내부의 `search-input`을 활용하여 검색어 상태 연동, `✕` 지우기 버튼 추가, 1글자 입력 후 검색 시 "검색어는 최소 2자 이상 입력해주세요!" 경고 툴팁 처리.
  * **백엔드 (`server/src/app.js`)**: `GET /api/posts` API에 `search` 쿼리 파라미터를 연동하여 2자 이상 키워드로 제목/본문/태그 검색 쿼리 지원 (Mock DB 및 Supabase Cloud 모두 연동 지원).
  * **피드 결과 UI (`FeedList.jsx` & `App.jsx`)**: 검색어 적용 시 `🔍 "{searchQuery}" 검색 결과 ({N}건)` 뱃지 노출, 결과 0건 시 빈 상태 UI 및 [전체 피드 보기] 버튼 제공.
* **관련 파일**:
  * `client/src/components/FeedTabs.jsx` (수정)
  * `client/src/components/FeedList.jsx` (수정)
  * `client/src/components/AppHeader.jsx` (수정)
  * `client/src/App.jsx` (수정)
  * `server/src/app.js` (수정)

### ✅ 3. 게시글 작성 시 학과 태그 저장 및 피드 렌더링 누락 버그 수정 (완료)
* **원인**: 
  - `CreatePostModal.jsx` 및 백엔드(`app.js`)에서 학과 필드명을 `author_major`로 다루는 반면, 피드 카드(`PostCard.jsx`) 및 상세 화면(`PostDetail.jsx`)에서는 `post.major_tag`만 조회하여 학과 태그 뱃지가 화면에 누락되는 현상 발생.
* **작업 내역**:
  * **백엔드 및 모달**: `POST /api/posts` 수신 및 전송 시 `author_major`와 `major_tag`를 상호 호환 저장하도록 교정.
  * **카드 및 상세 화면**: `PostCard.jsx` 및 `PostDetail.jsx`에서 `post.major_tag`와 `post.author_major`를 모두 조회하여 피드 상단 및 게시글 상세 상단에 학과 태그 뱃지가 정상적으로 노출되도록 보강.
* **관련 파일**:
  * `server/src/app.js` (수정)
  * `client/src/components/CreatePostModal.jsx` (수정)
  * `client/src/components/PostCard.jsx` (수정)
  * `client/src/components/PostDetail.jsx` (수정)

### ✅ 4. 학과/학년 태그 키워드 검색 대상 포함 개선 (완료)
* **원인**: 
  - 백엔드의 검색 매칭 로직(`GET /api/posts`)이 제목(`title`), 본문(`content`), 관심주제 태그(`tags`) 3개 항목만 검사하고 있었기 때문에, 학과 정보(`author_major`/`major_tag`)에 입력된 '기계공학과' 등의 단어가 '기계' 검색 키워드로 대조되지 않는 현상이었습니다.
* **작업 내역**:
  - `server/src/app.js`의 백엔드 검색 필터링 매칭 대상에 `author_major`, `major_tag`, `author_grade`, `grade_tag` 필드를 추가하여 '기계'만 입력해도 '기계공학과' 태그 게시글이 정확히 조회되도록 개선했습니다.
* **관련 파일**:
  * `server/src/app.js` (수정)

### ✅ 5. 검색창 실시간 즉시 매핑(타이핑 시 자동 검색) 개선 (완료)
* **원인**: 
  - 검색창에 '기계'를 입력한 후 **Enter 키를 누르거나 돋보기(🔍) 아이콘을 클릭하지 않으면** 검색 요청이 백엔드로 전송되지 않고 초기 화면(전체 피드)이 그대로 남아있는 현상 발생.
* **작업 내역**:
  - `FeedTabs.jsx`의 `handleInputChange`를 개선하여, 키보드로 '기계' 등 2자 이상 입력하는 순간 **엔터를 치지 않아도 실시간으로 즉시 검색이 필터링**되도록 보강.
* **관련 파일**:
  * `client/src/components/FeedTabs.jsx` (수정)

### ✅ 6. '기계공학과' 검색 시 무관한 게시글까지 함께 나오는 검색 정확도 버그 수정 (완료)
* **원인**: 
  - 이전 백엔드 검색 조건에 `author_grade`('1학년', '2학년' 등 학년 필드) 매칭이 포함되어 있어서, '기계공학과' 등 다른 학과 검색 시에도 학년 조건이 엉뚱하게 참(true)으로 매칭되어 무관한 1~2학년 게시글이 함께 조회되던 부작용 발생.
  - 1글자 입력 도중에는 이전 검색어가 완전히 리셋되지 않아 화면상에 이전 결과가 멈춰있던 현상 동시 존재.
* **작업 내역**:
  - `server/src/app.js`에서 과도한 `author_grade` 대조를 제거하고, 오직 **게시글 제목(`title`), 본문(`content`), 학과명(`author_major`/`major_tag`), 관심주제 태그(`tags`)**만 정밀 매칭하도록 수정.
  - `FeedTabs.jsx`에서 2자 미만 입력 시 즉각 검색어가 초기화되도록 상태 처리 보강.
* **관련 파일**:
  * `server/src/app.js` (수정)
  * `client/src/components/FeedTabs.jsx` (수정)

### ✅ 8. [Task 9-1] 메시지 읽음 표시 및 실시간 Socket.io 동기화 기능 구현 (완료)
* **목표**: 1:1 대화방 내 메시지 읽음 처리, 내 말풍선 옆 안 읽음 숫자 `1` 배지 표시, 및 상대방 입장/확인 시 실시간 `1` 소멸 처리.
* **작업 내역**:
  * **백엔드 (`server/src/app.js`)**: 메시지 객체 스키마에 `is_read` 추가, `markAsRead` 소켓 이벤트 핸들러 구현 및 `messagesRead` 실시간 브로드캐스팅, 대화 목록 API(`GET /api/chats`)에 `unreadCount` 포함.
  * **채팅방 (`ChatRoom.jsx`)**: 채팅방 입장 시/수신 시 `markAsRead` 소켓 발송, `messagesRead` 수신 시 `is_read: true` 갱신, 내 말풍선 왼쪽에 안 읽음 숫자 `1` 배지 렌더링.
  * **대화 목록 (`ChatList.jsx`)**: 대화방 목록 우측에 안 읽은 메시지 수 배지 표시.
* **관련 파일**:
  * `server/src/app.js` (수정)
  * `client/src/components/ChatRoom.jsx` (수정)
  * `client/src/components/ChatList.jsx` (수정)

### ✅ 9. 채팅 메시지 전송 시 중복(2번) 전송되는 버그 수정 (완료)
* **원인**: 
  - 백엔드 소켓 이벤트(`sendMessage`)에서 `socket.to(...)` 대신 `io.to(...)`로 브로드캐스트를 수행하여, 메시지를 전송한 나(발송자) 자신에게도 메시지가 에코 백(Echo Back)되어 클라이언트 로컬 추가 1번 + 소켓 수신 1번 총 2번 중복 표시되는 현상 발생.
* **작업 내역**:
  - 백엔드 `server/src/app.js`의 `sendMessage` 이벤트에서 `io.to(...)`를 `socket.to(...)`로 교정하여 나를 제외한 상대방에게만 수신 이벤트가 발송되도록 수정.
* **관련 파일**:
  * `server/src/app.js` (수정)

### ✅ 10. [Task 9-2&3] 양방향 약속 제안, [확정하기] 및 [다시 정하기] 오프라인 약속 조율 시스템 구축 (완료)
* **목표**: 방장과 도와주는 사람 누구나 약속 일시/장소를 제안할 수 있고, 상대 수신자가 `[확정하기]` 또는 `[다시 정하기]`로 약속을 유연하게 조율하는 반응형 UI 및 백엔드 연동.
* **작업 내역**:
  * **약속 모달 (`AppointmentModal.jsx`)**: 약속 장소(예: 공학관 카페) 및 일시(예: 오늘 17:00) 입력 팝업 모달 신규 구현.
  * **백엔드 (`server/src/app.js`)**: 약속 메타데이터(`appointment_status`, `appointment_location`, `appointment_time`, `appointment_proposed_by`) 스키마 추가, `updateAppointment` 소켓 핸들러 구현 및 `appointmentUpdated` 실시간 브로드캐스팅, `GET /api/chats/:roomId` 단건 조회 API 추가.
  * **채팅방 (`ChatRoom.jsx`)**: 상단 동적 띠 배너 UI 구현:
    - `NONE`: `[📅 약속 잡기]` 버튼
    - `PROPOSED` (제안자): `📍 제안중` + `[✏️ 제안 수정]` 버튼
    - `PROPOSED` (수신자): `📍 약속 제안받음` + `[✅ 확정하기]` & `[🔄 다시 정하기]` 버튼
    - `CONFIRMED`: `🎉 확정된 약속` 뱃지 + `[🔄 약속 다시 잡기]` 버튼
    - 약속 제안/확정/다시정하기 동작 시 대화창 중앙에 시스템 안내 말풍선 메시지 자동 전송.
* **관련 파일**:
  * `client/src/components/AppointmentModal.jsx` (신규)
  * `server/src/app.js` (수정)
  * `client/src/components/ChatRoom.jsx` (수정)

### ✅ 11. 채팅방 이탈 후 재진입 시 안 읽음(1) 수 및 약속 배너 미복구 버그 수정 (완료)
* **원인**:
  1. **안 읽음(1) 복구 현상**: 채팅방 재진입 시 `GET /api/chats/:roomId/messages`로 불러온 메시지 데이터의 `is_read` 값이 `false`로 들어와 로컬 상태에서 읽음 반영이 지연/누락되는 문제.
  2. **약속 정보 미복구 현상**: 소켓 및 DB 조회 시 `roomId` 비교에서 타입 차이(`String` vs `Number`)로 인해 `mockDb` / DB의 `chats` 데이터 갱신이 누락되고, 재진입 시 API가 기존 약속 정보를 제대로 쿼리하지 못한 문제.
* **작업 내역**:
  * **백엔드 (`server/src/app.js`)**: 소켓 핸들러(`markAsRead`, `updateAppointment`) 및 REST API에서 `roomId` 비교를 `String(id) === String(roomId)`로 100% 보정. HTTP 읽음 처리 API `POST /api/chats/:roomId/read` 추가.
  * **채팅방 (`ChatRoom.jsx`)**: 마운트 시 `fetchRoomData`에서 수신 메시지의 `is_read`를 로컬 상태에서 즉시 `true`로 보정 + HTTP 읽음 처리 API와 소켓 `markAsRead` 이중 보정 호출. `GET /api/chats/:roomId`로 복원한 `appointment_status`를 `appointment` state에 정확히 세팅.
* **관련 파일**:
  * `server/src/app.js` (수정)
  * `client/src/components/ChatRoom.jsx` (수정)

### ✅ 7. DB 스키마 차이로 인한 백엔드 500 에러 및 프론트엔드 이전 검색 상태 고정 버그 수정 (완료)
* **원인**:
  - Supabase 쿼리 시 DB 스키마에 존재하지 않는 컬럼(`author_major`/`major_tag`)을 `.or()` 조건절에 직접 포함시켜 백엔드에서 500 Internal Server Error가 발생함.
  - 프론트엔드(`FeedList.jsx`)에서 500 에러 응답 수신 시 이전 `posts` 상태를 비우지 않아, 화면상에 이전 전체 목록이 그대로 멈춰서 안 바뀌던 결정적 원인 규명.
* **작업 내역**:
  - `server/src/app.js`: DB 스키마 호환 쿼리 후 백엔드 애플리케이션 단에서 안전하게 통합 검색 필터링을 수행하도록 수정하여 500 에러 원천 차단.
  - `FeedList.jsx`: 예외 발생 시 이전 상태 대신 빈 배열(`setPosts([])`)로 안전 초기화하여 화면 고정 현상 제거.
* **관련 파일**:
  * `server/src/app.js` (수정)
  * `client/src/components/FeedList.jsx` (수정)

## 2026-07-27

### ✅ 1. 채팅방 말풍선 정렬 및 역할(Role) 식별 버그 수정 (완료)
* **목표**: 채팅 목록에서 채팅방 재입장 시 방장이 도우미로 강제 인식되어 말풍선이 한쪽으로 쏠리는 문제 해결.
* **작업 내역**:
  * `client/src/components/ChatList.jsx`에서 서버의 `host_id`, `helper_id` 데이터를 매핑 객체에 포함하도록 수정.
* **관련 파일**: `client/src/components/ChatList.jsx` (수정)

### ✅ 2. 채팅 상대방 이름(partnerName) 익명화 및 동적 렌더링 적용 (완료)
* **목표**: 채팅방과 커뮤니티 전역에서 사용자의 실제 닉네임을 가리고 '익명'으로 표시하며, DB에 양측 사용자 이름을 모두 보존.
* **작업 내역**:
  * `server/src/app.js`에서 채팅방 생성 시 `host_name`과 `helper_name`을 별도로 DB에 삽입하도록 구조 변경.
  * `ChatList.jsx`, `ChatRoom.jsx`, `PostCard.jsx`, `PostDetail.jsx` UI에서 닉네임 대신 '익명' 문자열이 렌더링되도록 하드코딩 교체.
* **관련 파일**: 
  * `server/src/app.js` (수정)
  * `client/src/components/ChatList.jsx` (수정)
  * `client/src/components/ChatRoom.jsx` (수정)
  * `client/src/components/PostCard.jsx` (수정)
  * `client/src/components/PostDetail.jsx` (수정)

### ✅ 3. 약속 제안 시스템 메시지 호칭 중립화 (완료)
* **목표**: 채팅방 중앙 시스템 안내 말풍선에서 '[방장]님', '[도와주는 사람]님' 등의 호칭을 제거하여 자연스러운 메시지 렌더링.
* **작업 내역**:
  * `ChatRoom.jsx`에서 시스템 메시지 전송 시 제안자 정보를 제외하고 '📢 새로운 약속이 제안되었습니다' 등 상태 기반 중립적 어조로 변경.
* **관련 파일**: `client/src/components/ChatRoom.jsx` (수정)

### ✅ 4. 내 프로필 탭의 작성글 배너(PostCard) 리스트 렌더링 (완료)
* **목표**: 프로필 화면에서 내가 쓴 글의 개수만 표기되던 것을 실제 피드와 동일한 카드 배너 형태로 표출.
* **작업 내역**:
  * `App.jsx`의 상태를 `myPostCount`(Number)에서 `myPosts`(Array)로 변경하고, `PostCard` 컴포넌트를 이용해 내가 쓴 글 맵핑(map) 렌더링.
  * 데스크톱 사이즈 사이드바 영역에서 발생한 `myPostCount` 참조 에러(ReferenceError) 수정.
* **관련 파일**: `client/src/App.jsx` (수정)
