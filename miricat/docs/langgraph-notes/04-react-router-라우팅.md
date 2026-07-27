# 04. React Router — 주소와 화면을 동기화하기

> 한 줄 요약: **라우터는 "주소(URL) ↔ 보여줄 컴포넌트"의 대응표다.** 주소가 바뀌면 표에서 맞는 컴포넌트를 찾아 갈아끼우고, 서버에는 아무것도 요청하지 않는다(SPA).

## 왜 필요했나 (미리캣에서)
MIRI-24 완료 조건 = "**경보의 링크로 리포트 열람 가능**". 디스코드 경보에 붙는 링크는 그냥 URL 문자열이다 — 즉 `http://localhost:5173/report/<공지id>` 같은 **주소만으로** 특정 공지의 리포트 화면이 열려야 한다. 지금까지 미리캣 프론트는 화면이 하나뿐이라 주소가 필요 없었지만, "밖에서 링크로 진입"이 생기는 순간 주소 체계가 필요해진다.

## 4개 부품

1. **`<BrowserRouter>`** — 라우터의 본체. 앱 전체를 감싸서(main.jsx) "지금 주소가 뭔지"를 상태처럼 들고 있다가, 바뀌면 하위를 다시 그리게 한다. 브라우저의 History API(뒤로가기/앞으로가기)와도 연결해 준다.

2. **`<Routes>` + `<Route path=... element=...>`** — 대응표 그 자체.
   ```jsx
   <Routes>
     <Route path="/" element={<HomePage />} />
     <Route path="/report/:noticeId" element={<ReportPage />} />
   </Routes>
   ```
   현재 주소를 위에서부터 대조해서 **처음 맞는 한 줄의 element만** 렌더한다. LangGraph의 `add_edge`가 "다음 노드" 표를 채우듯, Route는 "이 주소면 이 화면" 표를 채운다.

3. **`useParams()`** — 주소의 변수 구간 꺼내기. `path="/report/:noticeId"`의 `:noticeId`는 "여기엔 아무 값이나 온다"는 자리표시고, 실제 들어온 값은 컴포넌트 안에서 `const { noticeId } = useParams()`로 받는다. 함수의 매개변수와 똑같은 관계: path가 시그니처, 실제 주소가 인자.

4. **`<Link to="...">`** — 앱 안에서의 이동. `<a href>`와 겉모습은 같지만 결정적 차이: `<a>`는 **서버에 새 페이지를 요청**(전체 새로고침, 상태 다 날아감)하고, `<Link>`는 **주소만 바꾸고 라우터가 컴포넌트를 갈아끼운다**(상태 유지, 즉시 전환). 외부 사이트(공지 원문)로 갈 땐 여전히 `<a>`가 맞다.

## 미리캣 적용 지도
- `main.jsx` — `<BrowserRouter>`로 App 감쌈 (표를 읽을 본체 설치)
- `App.jsx` — 공통 틀(미어캣 헤더) + `<Routes>` 대응표. 본문은 `pages/HomePage.jsx`로 이사
- `pages/ReportPage.jsx` — `useParams()`로 noticeId 받아 그 공지의 리포트를 그림
- `NoticesPanel.jsx`(예정) — 경보 카드에 `<Link to={"/report/"+id}>` 진입점

## 함정 노트
- **새로고침 문제**: `/report/abc`에서 F5를 누르면 브라우저는 서버에 `/report/abc` 파일을 달라고 한다. 그런 파일은 없다 — 서버가 "모르는 주소면 index.html을 줘라"(SPA fallback)로 받쳐줘야 한다. **Vite dev 서버는 이걸 기본 제공**하니 지금은 신경 안 써도 되고, 나중에 정적 배포(Pages 등)할 때만 다시 만난다.
- 라우트 표에 없는 주소는 아무것도 렌더 안 됨 → 필요해지면 `path="*"` 한 줄로 "못 찾았어요" 화면을 받친다.

## 미결 퀴즈
- `<Link>` 클릭 시 전체 새로고침이 일어나지 않는데도 주소창이 바뀐다. 브라우저의 무슨 API 덕분일까? (힌트: BrowserRouter가 감싸는 이유)
