# 개발 환경 설명서 (웹 처음인 사람용)

C++ 알고리즘 문제풀이 / 코틀린 안드로이드 네이티브 앱 경험 기준으로 매핑해서 설명.

## 큰 그림: 이 프로젝트는 프로그램이 2개다

- **client (React)** = 사용자가 보는 화면. 안드로이드로 치면 **앱(Activity/Compose 화면)**.
- **server (Express)** = 데이터를 처리하는 쪽. 안드로이드 앱이 Retrofit으로 호출하던 **백엔드 API 서버**, 그거다.
- 둘은 각자 다른 포트(5173, 3001)에서 따로 실행되고, client가 `fetch`로 server를 호출해서 통신한다. C++로 치면 소켓 통신하는 클라이언트/서버 프로그램 두 개를 동시에 띄우는 것과 같은 그림.

## npm = Gradle / vcpkg 같은 것

- `package.json` = `build.gradle`(안드로이드) 또는 `CMakeLists.txt`(C++)와 같은 역할. "이 프로젝트가 뭘 필요로 하는지" 적어놓은 목록.
- `npm install` = 그 목록대로 라이브러리를 내려받는 것 (Gradle sync랑 같음).
- `npm run dev` = 빌드 후 실행. `package.json`의 `scripts`에 미리 정의해둔 명령어를 실행하는 것뿐 (`scripts.dev`가 실제로는 client/server 둘 다 켜는 명령을 합쳐놓은 것).

## React = 화면을 "컴포넌트" 단위로 쪼개서 만드는 방식

- Compose의 `@Composable` 함수랑 개념이 거의 같다: 상태(state)가 바뀌면 화면이 자동으로 다시 그려짐.
- `client/src/pages` = Activity/화면 하나 단위. `client/src/components` = 여러 화면에서 재사용하는 버튼/카드 같은 조각(재사용 가능한 Composable이라 생각하면 됨).

## Express = REST API 서버 (Retrofit이 호출하던 그 서버 만드는 쪽)

`server/routes/checkins.js`:
```js
router.get('/', ...)   // GET /api/checkins  → 목록 조회
router.post('/', ...)  // POST /api/checkins → 새로 저장
```
안드로이드에서 `@GET("/checkins")`, `@POST("/checkins")` 인터페이스로 호출하던 그 반대편이 이거다. GET/POST는 "함수 호출"이라고 생각하면 편하다 — GET은 읽기, POST는 쓰기.

## DB 대신 JSON 파일

- 지금은 진짜 데이터베이스(MySQL 등) 없이 `server/data/checkins.json` 파일 하나에 통째로 읽고/쓴다.
- C++에서 구조체 배열을 파일로 저장했다가 다시 읽는 것과 완전히 같은 개념. 데이터 양이 늘어나면 나중에 SQLite로 바꾸기로 이미 정해둠(CLAUDE.md 참고).

## 테스트 컨벤션 (오늘 정함)

- 서버 로직은 `node:test`(Node에 기본 내장, 따로 설치 필요 없음)로 작성.
- 형태는 백준/프로그래머스 채점처럼 "입력 → 예상 출력"을 `assert`로 비교하는 것과 완전히 동일:
  ```js
  import test from 'node:test'
  import assert from 'node:assert'

  test('createCheckin은 id를 부여한다', async () => {
    const result = await createCheckin({ emotion: '지침' })
    assert.ok(result.id)
  })
  ```
- 화면(client) 쪽은 이번 주는 자동 테스트 없이 브라우저로 직접 눌러보며 확인.

## 에러 처리 컨벤션 (오늘 정함)

- 안드로이드에서 `try/catch`로 예외 잡던 것과 동일한데, Express는 라우터 함수 안에서 에러가 나면 `next(err)`로 "이 에러 처리 좀 해줘"라고 넘긴다.
- 그러면 `server/index.js`에 하나 만들어둔 공용 에러 처리 함수가 받아서 항상 같은 모양(`{ error: { message: "..." } }`)으로 응답한다. 여기저기서 에러 응답 모양을 각자 만들지 않기 위함.

## AI 연동 (다음에 할 것, 오늘은 결정만)

- Anthropic Claude API를 쓰기로 이미 정해져 있음(`server/.env.example`에 `ANTHROPIC_API_KEY` 있음).
- 실제로는 서버에서 또 다른 REST API(Anthropic API)를 호출하는 것뿐 — 안드로이드에서 Retrofit으로 외부 API 부르던 것과 똑같은 패턴이 서버 안에서 한 번 더 일어나는 것.
- API 키 같은 비밀값은 `.env` 파일에만 두고 git에는 절대 안 올라가게 이미 설정돼 있음(`.gitignore`).
