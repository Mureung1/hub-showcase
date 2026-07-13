# 스터디 노트 — FE/BE 개발 환경 개념 정리

이 문서는 프로젝트를 이해하는 과정에서 나눈 Q&A를 정리한 개인 학습 노트입니다.

---

## 1. `.github` 폴더

깃허브(GitHub) **서버 쪽**에서 자동으로 읽는 특별한 폴더. 로컬 컴퓨터에서는 아무 동작도 하지 않는다.

- **`pull_request_template.md`**: PR을 새로 만들 때 깃허브 웹사이트가 자동으로 채워주는 빈 양식(체크리스트).
- **`workflows/auto-merge.yml`**: GitHub Actions. 깃허브 서버가 매일 정해진 시간에 자동으로 실행하는 로봇 스크립트. 열려있는 PR들을 조건(충돌 여부, 라벨, 리뷰 상태 등)에 따라 자동 병합/보류/닫기 처리한다.

---

## 2. CLAUDE.md의 "디렉토리 구조" 4줄

### 2-1. npm workspaces 모노레포 (`client/`, `server/`)

한 저장소(repo) 안에 FE(`client/`)와 BE(`server/`) 두 프로젝트를 같이 넣어서 관리하는 방식.

- **장점**: 한 번의 커밋/PR로 FE·BE를 같이 고칠 수 있어 버전 어긋남이 줄어든다.
- **항상 이렇게 하는 건 아님**: 팀/서비스가 커지면 FE·BE 저장소를 완전히 분리하는 경우가 더 흔하다. 모노레포는 규모에 따른 선택지 중 하나.

### 2-2. 루트 스크립트 (`dev` / `build` / `lint` / `format` / `test`)

`package.json`에 **직접 정의해둬야만** 동작하는 명령어들. 원래 client와 server는 각자 따로 켜야 하는데, `concurrently`라는 패키지(도구)가 여러 명령어를 동시에 실행시켜줘서 `npm run dev` 한 번으로 둘 다 켤 수 있게 만든 것.

```json
"dev": "concurrently -n client,server -c blue,green \"npm run dev -w client\" \"npm run dev -w server\""
```

### 2-3. 포트 번호 (client 5173 / server 4000)

- **5173** = Vite가 정해놓은 **기본값** (임의 아님, Vite를 쓰면 자동으로 이 번호)
- **4000** = 이 프로젝트 팀이 **직접 고른 번호** (server엔 정해진 기본값이 없음)
- **`.env`에서 override 가능한 이유**: `.env`는 각자 컴퓨터에서만 적용되는 개인 설정 파일(커밋 안 함). 포트가 이미 다른 프로그램에 쓰이고 있으면 코드를 안 건드리고 개인 `.env`에서만 바꿀 수 있음.
- `.env` 파일은 **`client/.env`, `server/.env`** 두 곳에 각각 존재 (실제 값은 각자 로컬에 생성, 견본은 `client/.env.example`, `server/.env.example`).

### 2-4. `/api` 프록시 (FE→BE 호출)

브라우저는 보안상 "다른 포트=다른 곳"으로 취급해서(CORS), client(5173)가 server(4000)에 직접 요청하면 막아버린다.

그래서 `client/vite.config.ts`에 **몰래 통로(프록시)**를 만들어둠: client가 `/api/...`로 요청하면 Vite가 자동으로 `localhost:4000`까지 배달해주고 답을 받아옴. 브라우저 입장에서는 "같은 곳끼리 얘기하는 것"(same-origin)처럼 보여서 막지 않음.

```
client(5173) --/api 요청--> [Vite 프록시] --배달--> server(4000)
client(5173) <--응답 전달--- [Vite 프록시] <--응답--- server(4000)
```

---

## 5. 기타

### FE→BE 개발 환경 관련 개념이 CLAUDE.md에 있는 이유

프록시 설정처럼 "코드를 짤 때 항상 지켜야 할 규칙"(예: API 호출은 반드시 `/api`로)은 매번 코드를 뒤지지 않아도 되도록 CLAUDE.md 같은 상시 참고 문서에 적어두는 편이 유리하다. 다만 "디렉토리 구조"라는 제목과는 다소 안 맞는 내용이라, 향후 "개발 환경" 섹션 등으로 분리 정리해볼 수 있음.

---

## 6. npm 모노레포 폴더 구조 이해하기


### 6-2. 루트에 있는 파일들, 한 장으로 정리

| 파일/폴더 | 정체 |
|---|---|
| `package.json` | 프로젝트 신분증 (스크립트·의존성 목록) |
| `package-lock.json` | 설치 버전 고정 영수증 (직접 안 건드림) |
| `node_modules` | 실제 설치된 라이브러리 창고 |
| `eslint.config.js`, `.prettierrc` | 코드 스타일 규칙 |
| `README.md`, `CLAUDE.md` | 사람용 설명서 / AI 도우미용 안내서 |
| `docs/` | 기획·디자인 문서 모음 |
| `.git`, `.gitignore`, `.github`, `.claude` | 관리 도구 전용 폴더 (평소엔 안 건드림) |
| `dist/` | 빌드 결과물 (지워도 재생성됨) |

### 6-3. npm workspaces: 왜 루트에 다 모여있나

- 핵심은 루트 `package.json`의 `"workspaces": ["client", "server"]` 한 줄.
- **의존성 "신청"은 이미 분리되어 있음**: react → `client/package.json`, express → `server/package.json`.
- **실제 설치 파일만 절약 차원에서 루트 `node_modules`에 모아둠** (호이스팅). 실제로 확인해보니 client/server 폴더 안 `node_modules`는 거의 비어있고(캐시 정도), 루트에 진짜 패키지 306개가 몰려있었음.

### 6-4. 설치 순서, 신경 안 써도 되는 이유

- React 먼저 → Express 나중, 순서는 상관없음.
- 각 폴더에서 따로 설치했더라도 **루트에서 `npm install`을 한 번 더 돌리면 npm이 전체를 재점검해서 중복을 알아서 정리**함.
- 요약: 순서보다 "마지막에 루트에서 install 했는가"가 중요.

---

## 7. Node.js / npm / Vite — 정확히 뭐라고 부를까 + 내부 동작

셋 다 "프로그램"이나 "툴"이라고 불러도 틀린 말은 아니다. 다만 역할이 확실히 달라서 구분해서 부르는 게 더 정확하다.

| 이름 | 정확한 분류 | 하는 일 (한 줄) |
|---|---|---|
| **Node.js** | **런타임 (runtime)** | JS를 브라우저 밖(내 컴퓨터)에서 실행할 수 있게 해주는 환경 |
| **npm** | **패키지 매니저 (package manager)** | 라이브러리를 설치/관리해주는 프로그램 |
| **Vite** | **빌드 도구 + 개발 서버** | 코드를 번역하고, 개발 중엔 화면에 띄워주는 프로그램 |

비유: **Node.js** = 공사할 수 있는 땅, **npm** = 자재를 갖다주는 배달원, **Vite** = 그 자재로 집을 짓고 손님한테 보여주는 목수 겸 안내원.

### 7-1. Node.js 내부 동작 — gcc가 아니라 JVM에 가깝다

C를 `gcc`로 컴파일하면 `.exe`가 나오고, 그 뒤로는 gcc 없이도 OS가 CPU에 바로 얹어 실행한다 (**한 번 컴파일, 그 뒤론 독립 실행**).

`node.exe`는 다르다. 이 프로그램 자체는 C++로 미리 컴파일된 실행 파일이 맞지만, 하는 일이 **"다른 파일(.js)을 입력으로 받아서, 그 자리에서 기계어로 바꿔가며 실행해주는 것"**이다. `node app.js`를 치면 매번 그 순간에 읽고 번역하고 실행한다.

**정확한 비유는 gcc가 아니라 자바의 JVM.** `.java`를 실행하려면 항상 `java`(JVM)가 옆에 있어야 하듯, `.js`를 실행하려면 항상 `node`(또는 브라우저 엔진) 같은 통역기가 옆에 있어야 한다. "JS 소스만 있는 독립 실행파일"은 존재하지 않는다.

### 7-2. npm 내부 동작 — npm도 결국 JS로 짜인 프로그램

`npm` 명령어의 정체는 **JS 코드 뭉치**다. `npm`을 치면 내부적으로 `node`가 npm의 JS 코드를 실행해주는 구조 — 즉 npm은 **Node 위에서 돌아가는 하나의 앱**이다. `package.json`(쇼핑 목록)을 읽고, 인터넷(npm 레지스트리)에서 필요한 코드를 받아 `node_modules`에 넣어주는 역할.

### 7-3. Vite 내부 동작 — 소켓 서버 + 즉석 번역기

Vite도 JS/TS로 짜여있고 Node가 실행해준다. `vite`를 치면:

1. Node의 네트워크 API(내부적으로 libuv라는 C 라이브러리가 소켓을 다룸)로 **포트 5173번에 소켓을 열고 `listen`** (C로 소켓 프로그래밍 해본 사람에게 익숙한 구조).
2. 브라우저가 HTTP 요청을 보내면, 디스크에서 파일을 읽고 필요하면 **esbuild**(Go로 짜여진 별도 바이너리)를 호출해 `.tsx` → 순수 JS로 변환.
3. 변환된 텍스트를 HTTP 응답으로 돌려줌.

즉 Vite는 "파일을 그냥 돌려주는 정적 서버"에 "실시간 번역 기능"을 끼운 것과 같다.

---

## 8. JS ↔ C/C++ 비교로 보는 근본적 차이

| 개념 | C / C++ | JavaScript |
|---|---|---|
| **번역 시점** | **AOT (Ahead-Of-Time)**: 실행 전에 미리 통째로 컴파일 → `.exe` | **JIT (Just-In-Time)**: 실행하는 바로 그 순간에 계속 번역하며 돌림 |
| **실행 방식** | OS가 `.exe`를 CPU에 바로 얹음 (통역기 불필요) | 항상 엔진(V8 등)이 옆에서 통역해줘야 함 — 독립 실행 불가 |
| **메모리 관리** | `malloc`/`free`, `new`/`delete` — 직접 해제 | **가비지 컬렉터(GC)**가 자동으로 치워줌 |
| **타입 체크** | **정적 타입**: 컴파일 시 안 맞으면 빌드 자체가 실패 | 원래 **동적 타입**(TypeScript가 컴파일 전 단계에서만 정적 검사를 흉내내고, 실행 시엔 타입 정보가 다 지워짐) |
| **컴파일 단위** | `.c`/`.h` → `.o` → **링커**가 이어붙여 하나의 `.exe` | 모듈(`import`)은 Node/브라우저가 실행 중 **동적으로 하나씩 불러옴** (Vite의 build 단계가 링커와 비슷한 역할) |
| **패키지 관리** | 표준이 약함 (`vcpkg`/`conan`/`apt` 등) | **npm이 사실상 표준** |

**한 줄 정리**: C/C++는 "미리 다 확정해서 기계가 바로 실행할 수 있게 굳혀놓는" 언어고, JS는 "그때그때 유연하게 해석하면서 돌아가는" 언어다.

---

## 13. JS 싱글스레드 + 비동기(이벤트 루프) 이해하기

### 싱글스레드

JS 코드는 **한 순간에 딱 한 줄만** 실행된다. C에서 `pthread_create`로 여러 스레드를 진짜 동시에 돌리는 것과 달리, **JS 코드끼리는 절대 동시에 실행되지 않는다.** (그래서 C에서 신경써야 하는 mutex, race condition 같은 게 JS 코드 사이에선 원칙적으로 안 생김.)

### 그런데 왜 "기다리면서 다른 것도 하는 것처럼" 보이나

핵심: **"기다려야 하는 일"(네트워크 요청, 타이머, 파일 읽기)은 JS 스레드가 직접 기다리지 않고, 다른 곳(브라우저의 내장 기능, 또는 Node의 libuv)에 맡긴다.**

1. `fetch(...)` 같은 코드를 만나면
2. JS 스레드는 "이거 기다리는 거 너(브라우저/libuv)한테 맡길게"라고 던져두고
3. **자기는 바로 다음 줄로 넘어감** (기다리지 않음)
4. 나중에 응답이 도착하면 "이벤트 루프"라는 대기열에 결과를 넣어두고
5. JS 스레드가 지금 하던 일을 다 끝내고 한가해지면, 그때 대기열에서 꺼내 이어서 처리

**비유**: 혼자 일하는 사무실 직원(JS 스레드)이 "이 서류 관공서에 접수하고 기다려야 함" 같은 일이 생기면, 관공서(브라우저/libuv)에 맡겨두고 바로 다음 일을 계속한다. 관공서에서 "다 됐어요!" 연락이 오면, 지금 하던 일을 끝내고 나서 그 결과를 처리한다. 여전히 혼자(싱글스레드)지만, 기다리는 시간만큼은 낭비하지 않는 것.

`async`/`await`은 이 과정을 "기다리는 것처럼 보이게" 예쁘게 써주는 문법일 뿐, 내부 동작은 위와 똑같다.

**한계**: `for`문으로 무거운 계산을 돌리면(순수 CPU 작업), 그동안은 **진짜로 다른 코드가 아예 못 돈다.** "기다림을 다른 곳에 맡길 수 있는 건 I/O(입출력)뿐"이고, 순수 계산은 못 맡긴다.

---

## 14. C/C++ 아는 사람을 위한 JS 문법 공부 포인트

C/C++를 안다면 변수, 함수, 조건문, 반복문 같은 기본 뼈대는 거의 그대로 읽힌다. 전체를 새로 공부할 필요는 없고, 아래 표 정도만 미리 훑으면 충분하다.

| 개념 | 왜 필요하냐면 |
|---|---|
| **`let`/`const`** | C의 `int x = 5` 대신 씀. `const`는 "재할당 금지" |
| **화살표 함수** `(a) => a + 1` | 함수를 짧게 쓰는 방식, React 코드에 매우 자주 등장 |
| **`map`, `filter`** | `for`문 대신 씀. 리스트를 화면에 그릴 때 `array.map(...)`을 거의 항상 씀 |
| **구조분해할당** `const { name, age } = user` | 객체에서 값을 한 번에 꺼내는 문법 |
| **`async`/`await`, Promise** | 서버에 데이터 요청하고 "기다렸다가" 처리하는 방식. C/C++에 정확히 대응하는 개념이 없어서 가장 낯설 수 있음 |
| **`import`/`export`** | 파일 간 코드 공유 (C의 `#include`와 역할은 비슷하지만 동작 방식은 다름) |

**결론**: 전체를 미리 다 공부할 필요는 없다. 다만 `map`/`filter`와 `async`/`await`은 코드에 거의 매번 등장하니 이 둘만 먼저 훑어보면 좋다.

### 실제 프로젝트 코드로 확인 (`client/src/App.test.tsx`)

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('App', () => {
  it('renders the project intro heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'hub' })).toBeInTheDocument()
  })
})
```

- `import { describe, it, expect } from 'vitest'` ← **구조분해할당과 거의 같은 문법.** 라이브러리 안 여러 기능 중 이름으로 골라서 꺼내옴.
- `() => { ... }` ← **화살표 함수.** `describe('App', () => {...})`는 "App이라는 이름으로 묶고, 이 화살표 함수를 실행해라"는 뜻.

`map`/`async`/`await`은 아직 이 프로젝트 코드에 없어서, 도메인에 맞춘 가상 예시로 감을 잡아본다:

```tsx
// map 예시: 약속 후보 시간 목록을 화면에 그릴 때
const timeSlots = ['10:00', '14:00', '16:00']
return (
  <ul>
    {timeSlots.map((time) => <li key={time}>{time}</li>)}
  </ul>
)
```

```ts
// async/await 예시: 서버에서 약속 목록 가져오기
async function fetchEvents() {
  const response = await fetch('/api/events')
  const data = await response.json()
  return data
}
```

---

## 부록. node_modules 호이스팅 & 버전 충돌 실전 사례

> 아래는 본문 개념 설명과 달리, 실제로 이 프로젝트에서 겪고 해결한 사례를 기록해둔 부록이다.

### A-1. package.json은 사실 3종류

모노레포엔 `package.json`이 하나가 아니라 **3개** 있다:

```
hub/
 ├─ package.json          ← 루트 (workspaces 설정 + 자기 자신의 devDependencies)
 ├─ client/package.json   ← client 전용 라이브러리
 └─ server/package.json   ← server 전용 라이브러리
```

루트 `package.json`도 `concurrently`, `eslint`, `prettier` 같은 **자기 자신의 devDependencies**를 갖고 있어서, "workspaces 설정 파일"이면서 동시에 "라이브러리를 신청하는 package.json" 역할을 겸한다. 이 세 신청서에 적힌 라이브러리들이 루트에서 `npm install` 한 번으로 전부 설치되고, 최대한 루트 `node_modules` 한 곳으로 몰린다(호이스팅).

### A-2. 실전 사례: typescript 버전이 서로 다르게 설치된 이유

실제로 확인해보니:
- 루트 `node_modules`: 패키지 대부분이 여기 모임
- `client/node_modules`, `server/node_modules`: 한때 `typescript` 폴더가 각각 따로 존재

원인은 **버전 충돌**이었다:
```
루트가 가진 typescript      = 6.0.3  (typescript-eslint가 요구하는 범위 >=4.8.4 <6.1.0 안에서 npm이 알아서 고른 최신 버전)
client/server가 원하는 typescript = ^5.6.2 (5.x대만 허용, 6.0은 불가)
```
루트의 6.0.3으로는 client/server의 요구(5.x대)를 만족시킬 수 없어서, npm이 client·server 안에 각각 5.6.2를 별도로 설치해뒀던 것. 비유하면 창고(루트)엔 빨간 사인펜만 있는데 방 A·B가 "꼭 파란 사인펜"을 요구하면, 각 방에 파란 사인펜을 따로 갖다 놓는 것과 같다.

**조사 결과**: 이건 npm/yarn 워크스페이스에서 꽤 흔한 유형의 문제다. `typescript-eslint` 공식 GitHub에도 관련 이슈가 여러 건 등록되어 있고, 아예 "Dependency Versions"라는 전용 문서 페이지까지 있을 정도. 커뮤니티가 권장하는 표준 해법은 "TypeScript는 개발 도구(dev-only)이니 루트 `package.json`에 딱 한 버전을 못박아 모든 workspace가 같은 버전을 쓰게 하는 것".

**해결**: 루트 `package.json`의 `devDependencies`에 `"typescript": "^5.6.2"`를 추가하고 `npm install`을 다시 돌림. 그 결과:
- 루트 `node_modules`의 typescript가 5.9.3(요청 범위 내 최신)으로 정리됨
- client/server 안에 있던 중복 typescript 폴더가 사라짐
- `npm run build`도 client/server 모두 정상 동작 확인

### A-3. `.bin`, `.vite` 폴더 — 지름길 서랍과 속도용 캐시

- **`.bin`**: `tsc`, `vite`, `eslint` 같은 실행 파일의 **지름길(심볼릭 링크)**만 모아둔 서랍. `package.json`의 `scripts`에서 `"dev": "vite"`라고만 적어도 실행되는 이유가 이것 — npm이 명령어 실행 시 이 서랍부터 뒤져서 찾는다. typescript 중복이 사라지면서 client/server의 `.bin`도 텅 비게 됐다.
- **`.vite`**: Vite가 속도를 위해 미리 만들어두는 캐시. `react`, `react-dom`처럼 여러 파일로 흩어진 라이브러리를 한 번 조립해둔 사본(`deps/`)과, 테스트 실행 결과 캐시(`vitest/results.json`) 등이 들어있다.

**정리**: client/server의 `node_modules`엔 이제 **자기 소유의 진짜 라이브러리는 하나도 없고**, 남은 건 전부 "실행/속도를 위한 부산물"(빈 지름길 서랍 + Vite 속도용 캐시)뿐이다. 이건 "루트 모듈을 찾아가기 위한 캐시"라기보다, **"루트에 있는 진짜 모듈(원본)은 Node가 알아서 찾아가고, `.vite`는 그 원본을 매번 다시 조립하지 않게 미리 가공해둔 결과물"**이라고 보는 게 정확하다.
