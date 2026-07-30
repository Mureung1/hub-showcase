# 파일별 개념 정리

이 프로젝트 코드에 실제로 등장하는 개념을 파일 단위로 훑는다. 추상적인 정의보다 "이 줄이 그 개념을 보여준다"는 식으로 코드 위치를 같이 적어서, 나중에 코드를 다시 열어봤을 때 바로 연결되게 했다. 순서는 사용자가 앱을 쓰는 순서(로그인 → 등록 → 매칭 → 그룹 → 평가)를 대략 따라간다.

---

## 백엔드 (`server/`)

### `server/index.js`
- **미들웨어 등록 순서** ([index.js:13-14](../server/index.js)) — `cors()` → `express.json()` → 라우터 순서로 등록. 순서가 바뀌면 CORS 체크 전에 body부터 파싱하려다 문제가 생길 수 있음.
- **환경변수 기반 설정** ([index.js:7](../server/index.js), [index.js:9-11](../server/index.js)) — `PORT`, `CLIENT_ORIGIN`을 코드에 박지 않고 `process.env`로 읽음. 로컬(.env)과 배포(Render 대시보드)에서 같은 코드가 다른 값을 씀.
- **CORS 허용 목록** ([index.js:9-13](../server/index.js)) — `CLIENT_ORIGIN`이 없으면 `true`(전부 허용, 로컬 개발용), 있으면 콤마로 나눈 리스트만 허용. 오늘 실제로 이 값이 실제 배포 주소와 안 맞아서 등록이 통째로 실패하는 걸 겪었음.
- **헬스체크 엔드포인트** ([index.js:16-18](../server/index.js)) — 서버가 살아있는지만 확인하는 가장 단순한 라우트. 배포 확인할 때 제일 먼저 두드려보는 곳.

### `server/matching.js`
- **순수 함수(pure function)** — 이 파일 전체가 DB나 네트워크를 전혀 안 건드리고 입력→출력만 하는 함수들. 그래서 Vitest로 테스트하기 쉬움(서버를 안 켜도 됨).
- **정규식으로 숫자 추출** ([matching.js:10-13](../server/matching.js)) — `"5분 이내"` 같은 문자열에서 숫자만 뽑아냄.
- **불변성 유지하며 정렬** ([matching.js:16](../server/matching.js)) — `[...rows].sort(...)`. `rows.sort(...)`라고 쓰면 원본 배열이 그 자리에서 바뀌어버리는데(mutate), 스프레드로 복사본을 만들어 정렬하면 원본은 그대로 둠.
- **날짜 뺄셈 = 밀리초** ([matching.js:26](../server/matching.js), [matching.js:41](../server/matching.js), [matching.js:52](../server/matching.js), [matching.js:67](../server/matching.js)) — JS에서 `new Date() - new Date()`는 자동으로 밀리초 숫자가 됨. `/ 60000`하면 분 단위.
- **기본 매개변수(default parameter)** ([matching.js:21](../server/matching.js), [matching.js:38](../server/matching.js), [matching.js:64](../server/matching.js)) — `now = new Date()`처럼 안 넘기면 자동으로 현재 시각을 씀. 테스트할 때는 고정된 시각을 직접 넘겨서 "지금이 몇 시든 항상 같은 결과"가 나오게 함.
- **누적 평균(running average) 공식** ([matching.js:72-76](../server/matching.js)) — `(기존평점 × 기존횟수 + 새점수) / (기존횟수+1)`. 모든 개별 평점을 다 저장 안 해도, 평균과 횟수 두 값만 있으면 다음 평균을 계산할 수 있는 방식.

### `server/routes/requests.js` (가장 복잡한 파일)
- **Express Router** ([requests.js:1](../server/routes/requests.js), [requests.js:14](../server/routes/requests.js)) — 라우트를 하나의 파일에 모아서 `index.js`에 `app.use('/api/requests', requestsRouter)`로 붙임.
- **라우트 등록 순서 문제** ([requests.js:305-306](../server/routes/requests.js)) — `/mine/:userId`를 `/:id`보다 먼저 등록해야 함. Express는 위에서부터 순서대로 URL 패턴을 매칭하기 때문에, `/:id`가 먼저 있으면 `/mine/abc`도 `id="mine"`으로 착각해버림.
- **여러 라우트가 공유하는 헬퍼 함수** ([requests.js:17-73](../server/routes/requests.js) `applyRatingSubmission`, [requests.js:76-93](../server/routes/requests.js) `sweepAutoRatings`) — 수동 평가(`/rating`)와 자동 평가(1시간 경과)가 같은 로직을 타야 하므로 함수로 뽑아서 재사용.
- **Supabase 쿼리 빌더 체이닝** (파일 전체) — `.from().select().eq().single()`처럼 메서드를 이어 붙여서 SQL을 안 쓰고 쿼리를 만듦.
- **관계형 데이터를 JS에서 직접 병합** ([requests.js:228-254](../server/routes/requests.js)) — Supabase REST 레이어는 SQL의 JOIN처럼 자유롭지 않아서, `matching_requests`를 먼저 가져오고 관련된 `users`를 따로 가져온 다음 id를 key로 쓰는 객체(`profileById`)를 만들어 JS에서 합침.
- **Map으로 그룹핑** ([requests.js:201-209](../server/routes/requests.js)) — `group_id`가 같은 행들을 `Map`에 모아서 "방" 단위로 묶음.
- **고아 데이터 방어** ([requests.js:273-274](../server/routes/requests.js)) — 계정이 삭제됐는데 매칭 요청만 남아있는 행을 걸러냄. 실제로 이 필터가 없어서 35개 고아 데이터가 화면에 떠 있던 버그를 겪었음.
- **낙관적 처리 후 재검증(race condition 대응)** ([requests.js:448-457](../server/routes/requests.js)) — 여러 명이 동시에 신청하면 정원(4명)을 넘길 수 있어서, 일단 저장하고 직후에 다시 세어봐서 초과했으면 방금 한 내 신청만 되돌림. 진짜 DB 트랜잭션/락은 아니고 임시방편.
- **상태 머신(state machine) + 플래그 조합, 그리고 그 위험성** ([requests.js:352-366](../server/routes/requests.js) `create-room`, [requests.js:407-435](../server/routes/requests.js) `join`) — `status`(open/matched/pending)와 `is_leader`(boolean) 두 값을 같이 쓰다 보니, "방장 혼자일 때 status가 open으로 남는" 경계 케이스에서 오늘 버그가 세 번 반복됐음(인원수 표시, 동의 카운트, 탑승 확인 반영). **상태를 여러 값으로 쪼개서 표현하면, 그 값들의 "있을 수 있는 조합"을 전부 생각해야 한다는 교훈.**
- **PostgREST의 OR 필터 문법** ([requests.js:635](../server/routes/requests.js)) — `.or('status.eq.matched,is_leader.eq.true')`. 체이닝된 `.eq()`는 전부 AND로 묶이기 때문에, OR 조건이 필요하면 별도 문법을 씀.
- **인가(authorization) 체크를 서버에서** ([requests.js:622-624](../server/routes/requests.js)) — "그룹장만 탑승 확인 가능"을 프론트에서 버튼을 숨기는 것만으로 끝내지 않고, 서버에서도 `is_leader`를 확인해 403을 돌려줌. 프론트 코드는 누구나 브라우저 개발자도구로 우회할 수 있기 때문.

---

## 프론트엔드 (`project_idea/src/`)

### `main.jsx`
- **React 앱의 진입점** ([main.jsx:6-10](../project_idea/src/main.jsx)) — `<App />`을 실제 HTML의 `#root` 요소에 꽂아 넣는 곳. `<StrictMode>`는 개발 중에만 버그를 더 잘 잡아주는 감시 모드(effect를 일부러 두 번 실행해보는 등).

### `App.jsx` (전체 화면 전환의 중심)
- **state 끌어올리기(lifting state up)** ([App.jsx:14-20](../project_idea/src/App.jsx)) — `step`, `registration`, `joinedCandidate`처럼 여러 화면이 공유해야 하는 값을 최상위 컴포넌트가 들고 있다가 props로 내려줌.
- **단계별 화면 전환을 state 하나로 표현** ([App.jsx:172-210](../project_idea/src/App.jsx)) — `step` 숫자(0~4)에 따라 다른 화면 컴포넌트를 렌더링. 라우팅 라이브러리 없이 조건부 렌더링만으로 "화면 이동"을 흉내 냄.
- **useRef로 "한 번만 실행" 가드** ([App.jsx:21](../project_idea/src/App.jsx), [App.jsx:24-25](../project_idea/src/App.jsx)) — `hasResumedRef`는 값이 바뀌어도 화면을 다시 그리지 않는 state. 세션 복구 로직이 여러 번 중복 실행되는 걸 막는 용도로 씀 (state로 하면 값이 바뀔 때마다 재렌더링돼서 오히려 더 복잡해짐).
- **인증 상태 구독** ([App.jsx:117-125](../project_idea/src/App.jsx)) — `supabase.auth.onAuthStateChange`로 로그인/로그아웃이 일어날 때마다 콜백이 호출됨. `return () => listener.subscription.unsubscribe()`는 화면이 사라질 때 구독을 정리하는 "뒷정리(cleanup)" 패턴.
- **콜백을 통해 자식이 부모 state를 갱신** ([App.jsx:128-130](../project_idea/src/App.jsx) `updateJoinedCandidate`, [App.jsx:202](../project_idea/src/App.jsx)) — 자식 컴포넌트(`GroupChatScreen`)가 부모의 state를 직접 못 바꾸니, "이렇게 바꿔줘"라는 함수를 props로 받아서 호출함.
- **localStorage를 이용한 임시 데이터 전달** ([App.jsx:91-112](../project_idea/src/App.jsx)) — 회원가입 직후 이메일 인증 전이라 세션이 없어서 프로필을 바로 저장 못 할 때, 브라우저에 임시로 남겨뒀다가 인증 후 세션이 생기면 자동으로 이어서 저장.
- **세션 복구(session resume) 로직** ([App.jsx:23-71](../project_idea/src/App.jsx)) — 새로고침해도 어디까지 진행했었는지 서버에 물어봐서 그 화면으로 바로 이동시킴.

### `LoginScreen.jsx`
- **폼 모드 토글 패턴** ([LoginScreen.jsx:10](../project_idea/src/LoginScreen.jsx), [LoginScreen.jsx:353-362](../project_idea/src/LoginScreen.jsx)) — 회원가입/로그인을 별도 화면으로 안 만들고, `mode` state 하나로 같은 폼의 일부만 다르게 보여줌.
- **여러 로그인 방식 비교** — 비밀번호 로그인([LoginScreen.jsx:62](../project_idea/src/LoginScreen.jsx) `signInWithPassword`), 회원가입([LoginScreen.jsx:39-43](../project_idea/src/LoginScreen.jsx) `signUp`), 게스트/익명([LoginScreen.jsx:77](../project_idea/src/LoginScreen.jsx) `signInAnonymously`). 셋 다 Supabase Auth가 제공하는 다른 로그인 전략.
- **네이티브 HTML5 폼 검증** ([LoginScreen.jsx:159-162](../project_idea/src/LoginScreen.jsx)) — `type="email"`, `required`, `pattern`, `title`을 JS 코드 한 줄 없이 브라우저가 알아서 검증하고 에러 문구까지 보여줌.
- **제어 컴포넌트(controlled input)** (폼 전체) — `value={state}` + `onChange={(e) => setState(e.target.value)}` 세트. React가 입력값의 "진실의 원천(source of truth)"을 쥐고 있는 방식.
- **접근성: 커스텀 토글의 시맨틱** ([LoginScreen.jsx:296-299](../project_idea/src/LoginScreen.jsx)) — 그냥 `<div onClick>`으로 만든 스위치는 스크린리더가 이해 못 함. `role="switch"` + `aria-checked` + `aria-labelledby`로 "이게 켜고 끄는 스위치고, 지금 상태가 뭔지"를 명시.

### `ProfileScreen.jsx`
- **하나의 컴포넌트로 생성/수정 두 모드 처리** ([ProfileScreen.jsx:19](../project_idea/src/ProfileScreen.jsx) `isEdit`) — `existingProfile`이 있는지 없는지로 폼 문구·버튼을 다르게 보여줌.
- **파일 업로드 → Storage → 공개 URL** ([ProfileScreen.jsx:36-60](../project_idea/src/ProfileScreen.jsx)) — 사진 파일을 Supabase Storage에 올리고(`upload`), 그 경로로 공개 URL을 받아옴(`getPublicUrl`). `?t=${Date.now()}`를 붙이는 이유는 같은 파일명으로 덮어써도 브라우저가 예전 캐시를 보여주지 않게 하려는 것(캐시 무효화 트릭).
- **비즈니스 규칙을 순수 함수로 분리** ([ProfileScreen.jsx:11-16](../project_idea/src/ProfileScreen.jsx) `daysUntilNicknameChangeAllowed`) — "닉네임은 일주일에 한 번만" 같은 규칙을 컴포넌트 안에 흩어놓지 않고 별도 함수로 계산.
- **upsert(있으면 수정, 없으면 생성)** ([ProfileScreen.jsx:100](../project_idea/src/ProfileScreen.jsx)) — `insert`와 `update`를 매번 구분 안 해도 되는 Supabase의 편의 기능.

### `RegisterScreen.jsx`
- **localStorage로 마지막 입력값 기억** ([RegisterScreen.jsx:23-31](../project_idea/src/RegisterScreen.jsx), [RegisterScreen.jsx:86](../project_idea/src/RegisterScreen.jsx)) — 다음에 등록할 때 매번 처음부터 다시 고르지 않도록, 마지막에 등록했던 값을 브라우저에 저장해뒀다가 초기값으로 씀.
- **파생 옵션 목록** ([RegisterScreen.jsx:57-58](../project_idea/src/RegisterScreen.jsx)) — `direction`(학교→거점 / 거점→학교)에 따라 출발지·목적지 후보 목록 자체가 바뀜. state 하나가 다른 여러 값에 영향을 주는 예.
- **버튼을 라디오처럼 쓸 때의 접근성** ([RegisterScreen.jsx:139](../project_idea/src/RegisterScreen.jsx) 등 `aria-pressed`) — 시각적으로는 "칩" 버튼이지만, 스크린리더에는 "지금 선택된 상태"를 알려줘야 함.

### `CandidateListScreen.jsx`
- **부모가 준 데이터를 그대로 표시 vs 직접 조회** — `myRequest`, `myProfile`, `existingJoin`은 props로 받고, 후보 목록(`candidates`)은 이 화면이 직접 fetch함([CandidateListScreen.jsx:36-56](../project_idea/src/CandidateListScreen.jsx)). "누가 이 데이터의 주인인가"를 파일별로 다르게 가져가는 예.
- **화면 복귀 시 상태 복원** ([CandidateListScreen.jsx:24-26](../project_idea/src/CandidateListScreen.jsx)) — 이미 참여한 방이 있으면(`alreadyJoined`) 그 상태를 `useState`의 **초기값**으로 바로 넣어서, 화면이 뜨자마자 맞는 모습으로 보이게 함(깜빡임 없이).
- **URLSearchParams로 쿼리스트링 만들기** ([CandidateListScreen.jsx:39-44](../project_idea/src/CandidateListScreen.jsx)) — 문자열을 직접 이어붙이지 않고 브라우저 내장 객체로 안전하게 쿼리스트링 생성.
- **하트비트(heartbeat) 패턴** ([CandidateListScreen.jsx:58-68](../project_idea/src/CandidateListScreen.jsx)) — "나 아직 여기 있어요"를 30초마다 서버에 알림. 서버는 이 시각(`last_seen_at`)을 보고 오래 조용한 방을 목록에서 치움([matching.js:38-43](../server/matching.js) `isRoomStale`).
- **NEW 배지 로직** ([CandidateListScreen.jsx:12-18](../project_idea/src/CandidateListScreen.jsx)) — 평점 기본값(5점)을 그대로 보여주면 "한 번도 평가 안 받은 사람"과 "실제로 만점 받은 사람"이 구분이 안 돼서, `ratingCount`가 0이면 숫자 대신 배지로 표시.

### `GroupChatScreen.jsx` (오늘 버그가 제일 많이 나온 파일)
- **폴링(polling)으로 실시간처럼 보이게 하기** ([GroupChatScreen.jsx:42-56](../project_idea/src/GroupChatScreen.jsx) 멤버, [70-83](../project_idea/src/GroupChatScreen.jsx) 메시지) — `setInterval`로 몇 초마다 다시 물어봄. 진짜 실시간(WebSocket)은 아니고, 그 사이엔 최신이 아닐 수 있음.
- **effect 정리(cleanup)** (모든 `useEffect`의 `return () => clearInterval(interval)`) — 화면이 사라지거나 `groupId`가 바뀌면 이전 타이머를 반드시 꺼야 함. 안 그러면 안 보이는 화면이 계속 백그라운드에서 요청을 날림(메모리 누수/불필요한 네트워크).
- **파생 상태(derived state)의 함정** ([GroupChatScreen.jsx:106-130](../project_idea/src/GroupChatScreen.jsx)) — `count`, `consentCount`, `canBoard`를 매번 원본 데이터로 계산하는 건 좋은 패턴인데, **그 계산식 자체가 잘못되면(방장 혼자일 때 `status==='matched'`만 걸러서 자신을 빼먹음) 여러 값이 동시에 다 틀리게 됨.** 오늘 겪은 버그 세 개가 전부 이 한 줄([109](../project_idea/src/GroupChatScreen.jsx))에서 시작됨.
- **낙관적 업데이트(optimistic update)** ([GroupChatScreen.jsx:134-140](../project_idea/src/GroupChatScreen.jsx) 동의, [175-196](../project_idea/src/GroupChatScreen.jsx) 탑승 확인) — 서버 응답을 기다렸다가 다음 폴링에 반영하지 않고, 성공하자마자 로컬 state를 먼저 바꿔서 화면이 즉시 반응하게 함. 실제 서버 데이터와 잠깐 어긋날 수 있다는 트레이드오프가 있음.
- **로직 중복 vs 의존성 줄이기** ([GroupChatScreen.jsx:12-26](../project_idea/src/GroupChatScreen.jsx)) — `classifyBoarding`을 서버(`matching.js`)와 프론트에 똑같이 두 번 구현함. 그룹장이 아닌 멤버는 서버 응답을 직접 못 받고 폴링으로만 상태를 아니까, 같은 계산을 프론트에서도 할 수 있어야 했음. 코드 중복이라는 단점과, 프론트가 백엔드 상세 구현에 안 얽매인다는 장점을 맞바꾼 것.
- **조건부 렌더링 3단 분기** ([GroupChatScreen.jsx:430-469](../project_idea/src/GroupChatScreen.jsx)) — "탑승 확인됨" / "나는 그룹장, 아직 확인 전" / "나는 그룹장 아님, 대기" 세 가지 화면을 삼항연산자 중첩으로 표현.

### `RatingScreen.jsx`
- **커스텀 위젯을 접근성 있게 만들기** ([RatingScreen.jsx:4-30](../project_idea/src/RatingScreen.jsx)) — 별점을 `<input type="range">`가 아니라 버튼 5개로 직접 구현했으니, `role="radiogroup"` + 각 버튼에 `role="radio"` + `aria-checked` + `aria-label`을 달아서 스크린리더가 "1~5점 중 하나를 고르는 라디오 그룹"으로 인식하게 함.
- **자기 자신 제외하고 필터링** ([RatingScreen.jsx:48](../project_idea/src/RatingScreen.jsx)) — 그룹 멤버 목록에서 "동행자"만 보여줄 때 내 id는 빼야 함.
- **제출 전 클라이언트 검증** ([RatingScreen.jsx:55-58](../project_idea/src/RatingScreen.jsx)) — 별점을 안 고르면 서버까지 안 보내고 바로 에러 표시. (서버([requests.js:648-650](../server/routes/requests.js))도 똑같이 검증함 — 클라이언트 검증은 사용자 경험용, 서버 검증은 진짜 방어선.)

### `describeCost.js`
- **순수 함수로 가격 로직 분리** (파일 전체) — 컴포넌트 두 개(`CandidateListScreen`, `GroupChatScreen`)가 같은 가격 계산을 써야 해서, 화면 코드에 안 두고 별도 파일로 뽑음. `describeCost.test.js`로 따로 테스트됨.
- **거리 등급 → 기본 요금 → 인원수로 나누기** ([describeCost.js:12-15](../project_idea/src/describeCost.js), [36-39](../project_idea/src/describeCost.js)) — 목적지별 대략적인 거리 등급(near/medium/far)에 기본 요금을 매핑하고, 인원수로 나눈 뒤 100원 단위로 반올림.

### `supabaseClient.js` / `apiBase.js`
- **클라이언트 SDK 초기화를 한 곳에 모으기** ([supabaseClient.js:3-6](../project_idea/src/supabaseClient.js)) — 모든 화면이 이 하나의 `supabase` 객체를 import해서 씀 (연결을 여러 번 새로 안 만듦).
- **환경별로 다른 API 주소** ([apiBase.js:1](../project_idea/src/apiBase.js)) — `import.meta.env.VITE_API_BASE_URL`이 있으면 그걸 쓰고, 없으면(로컬 개발) `localhost:4000`으로 fallback. **이 값은 빌드할 때 코드에 박히기 때문에, 배포 후 값을 바꾸려면 다시 빌드(재배포)해야 함** — 오늘 배포 점검에서 실제로 확인한 부분.

### `StepHeader.jsx`
- **진행 표시기(progress indicator)** ([StepHeader.jsx:29-41](../project_idea/src/StepHeader.jsx)) — `step` 값 하나로 점 5개의 크기/색을 계산해서 "지금 몇 단계인지"를 보여줌. 상태를 늘리지 않고 기존 값을 재사용하는 예.

---

## 테스트 (`server/matching.test.js`, `describeCost.test.js`)
- **TDD Red-Green** — 구현하기 전에 "이런 입력엔 이런 출력이 나와야 한다"는 테스트를 먼저 씀(실패 상태, Red) → 그 다음 통과하도록 구현(Green).
- **경계값 테스트** (예: `matching.test.js`의 `classifyBoarding` 관련 테스트, `BOARDING_GRACE_MINUTES` 기준 5분 전/후) — "정확히 그 경계에서 어느 쪽으로 판정되는가"를 명시적으로 테스트해두면, 나중에 숫자를 바꿔도 의도가 깨졌는지 바로 알 수 있음.

---

## 이번에 다시 짚어볼 만한 "설계가 아쉬웠던 지점"
`GroupChatScreen.jsx`와 `requests.js`에서 반복해서 나온 문제 하나로 정리하면: **"상태를 여러 개의 독립된 값(status, is_leader, group_id)으로 표현하면, 그 값들이 만들 수 있는 모든 조합을 다 생각해야 한다"**는 것. "방장이 혼자인 방"이라는 경계 케이스 하나를 놓쳐서 버그가 세 군데(App.jsx의 인원수, GroupChatScreen의 동의 카운트, requests.js의 탑승 확인 반영)에서 따로따로 터졌다. 다음에 비슷한 걸 설계한다면, 상태 값들의 조합표를 먼저 그려보고 "이 조합이 실제로 가능한가"를 점검하는 습관을 들이면 좋다.
