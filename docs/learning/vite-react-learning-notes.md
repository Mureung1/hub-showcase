# Vite + React 개발 환경 이해하기

> Android Studio만 주로 써본 상태에서, Vite + React 프로젝트가 어떤 구조로 돌아가는지 이해하기 위한 학습 노트.

---

## 1. 한 줄 요약

Vite + React 환경을 세팅했다는 말은 **React 화면을 만들 수 있는 웹 프로젝트 뼈대를 만들고, 브라우저에서 바로 확인할 수 있는 개발 서버를 띄울 준비를 했다**는 뜻이다.

Android로 비유하면 다음과 비슷하다.

```text
Android Studio 프로젝트 생성
→ Gradle Sync
→ MainActivity / Compose 화면 작성
→ Run 해서 에뮬레이터에서 확인
```

웹에서는 대략 이렇게 된다.

```text
Vite + React 프로젝트 생성
→ npm install
→ App.jsx / 컴포넌트 작성
→ npm run dev 해서 브라우저에서 확인
```

---

## 2. Android Studio 기준으로 비유하기

| 웹/Vite/React | Android Studio 비유 | 의미 |
|---|---|---|
| `package.json` | `build.gradle` 비슷한 역할 | 의존성, 실행 명령어가 적힌 설정 파일 |
| `npm install` | Gradle Sync | 필요한 라이브러리를 설치 |
| `node_modules/` | Gradle이 받은 라이브러리 캐시 비슷함 | 설치된 패키지들이 들어감. 보통 Git에 올리지 않음 |
| `npm run dev` | Run 실행 | 개발 서버를 띄워 화면 확인 |
| `localhost:5173` | 에뮬레이터/디바이스 화면 | 브라우저에서 실행 결과를 보는 주소 |
| `index.html` | 앱이 붙을 기본 껍데기 | React가 들어갈 `<div id="root">`가 있음 |
| `src/main.jsx` | `MainActivity.onCreate()` 느낌 | React 앱을 실제 HTML에 연결하는 시작점 |
| `src/App.jsx` | 메인 화면 컴포넌트 | 화면에 무엇을 보여줄지 작성 |
| `src/App.css`, `src/index.css` | XML style / theme 느낌 | 화면 스타일 담당 |
| `vite.config.js` | 프로젝트 빌드 설정 | Vite 설정 파일 |

---

## 3. Vite가 하는 일

Vite는 React 앱을 만들 때 쓰는 **개발 서버 + 빌드 도구**다.

쉽게 말하면 다음 일을 해준다.

1. 브라우저에서 프로젝트를 열 수 있게 해준다.
2. JSX 같은 브라우저가 바로 이해하기 어려운 코드를 변환해준다.
3. 파일을 저장하면 브라우저 화면을 빠르게 갱신해준다.
4. 나중에 배포할 때는 `npm run build`로 실제 배포용 파일을 만들어준다.

즉 Vite는 “React 코드를 브라우저에서 개발하기 편하게 만들어주는 실행 환경”이라고 보면 된다.

---

## 4. React가 하는 일

React는 화면을 **컴포넌트 단위로 만들게 해주는 JavaScript 라이브러리**다.

일반 HTML은 보통 이런 식이다.

```html
<h1>하루 체크아웃</h1>
<p>감정을 정리하는 서비스입니다.</p>
```

React에서는 이 화면 조각을 함수처럼 만든다.

```jsx
function ProjectIntro() {
  return (
    <section>
      <h1>하루 체크아웃</h1>
      <p>감정을 정리하는 서비스입니다.</p>
    </section>
  );
}
```

이런 함수 하나가 화면 조각이 된다.  
이걸 **컴포넌트**라고 부른다.

---

## 5. JSX가 뭔가?

JSX는 JavaScript 파일 안에서 HTML처럼 생긴 문법을 쓸 수 있게 해주는 문법이다.

```jsx
return <h1>안녕하세요</h1>;
```

겉보기에는 HTML 같지만 실제로는 JavaScript 안에 들어 있는 React 문법이다.

주의할 점:

```jsx
// HTML에서는 class
<div class="card"></div>

// React JSX에서는 className
<div className="card"></div>
```

```jsx
// HTML에서는 여러 태그를 그냥 나열할 수 있지만
<h1>제목</h1>
<p>내용</p>

// JSX에서는 하나의 부모로 감싸야 함
<>
  <h1>제목</h1>
  <p>내용</p>
</>
```

---

## 6. 실행 흐름: index.html → main.jsx → App.jsx

처음에 제일 헷갈리는 부분이 이 흐름이다.

```text
index.html
  ↓
src/main.jsx
  ↓
src/App.jsx
  ↓
내가 만든 컴포넌트
```

조금 더 풀면 이렇게 된다.

### 1) `index.html`

```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

여기서 `<div id="root"></div>`는 React 앱이 들어갈 빈 자리다.

Android로 치면 “앱 화면이 붙을 최상위 컨테이너” 느낌이다.

---

### 2) `src/main.jsx`

```jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
```

이 코드는 이렇게 해석하면 된다.

```text
HTML에서 id가 root인 div를 찾는다.
그 div 안을 React가 관리하게 만든다.
그 안에 App 컴포넌트를 그린다.
```

Android로 비유하면 대충 이런 느낌이다.

```text
MainActivity에서 setContentView(...) 또는 setContent { App() } 하는 느낌
```

---

### 3) `src/App.jsx`

```jsx
import ProjectIntro from './ProjectIntro.jsx';

function App() {
  return <ProjectIntro />;
}

export default App;
```

`App.jsx`는 앱의 최상위 화면이다.  
여기서 어떤 컴포넌트를 보여줄지 정한다.

내가 `ProjectIntro.jsx`를 따로 만든 이유는, 앞으로 화면이 커졌을 때 한 파일에 다 쓰지 않고 기능/화면 단위로 나누기 위해서다.

---

### 4) `src/ProjectIntro.jsx`

```jsx
function ProjectIntro() {
  return (
    <section>
      <h1>하루 체크아웃</h1>
      <p>감정을 정리하는 대학생용 체크아웃 도구입니다.</p>
    </section>
  );
}

export default ProjectIntro;
```

이 파일은 실제 화면 조각을 담당한다.  
즉 `ProjectIntro`는 “프로젝트 소개 화면 컴포넌트”다.

---

## 7. 명령어 이해하기

### `npm create vite@latest`

Vite 프로젝트 기본 뼈대를 만들어주는 명령어다.

Android Studio에서 “New Project” 누르는 것과 비슷하다.

---

### `npm install`

`package.json`에 적힌 라이브러리를 실제로 설치한다.

설치 결과는 `node_modules/`에 들어간다.  
이 폴더는 매우 크기 때문에 보통 Git에 올리지 않는다.

---

### `npm run dev`

개발 서버를 실행한다.

보통 실행하면 이런 주소가 나온다.

```text
http://localhost:5173
```

이 주소를 브라우저에서 열면 React 앱이 보인다.

---

### `npm run build`

배포용 파일을 만든다.

개발 중에는 보통 `npm run dev`를 쓰고, 실제 배포 전에는 `npm run build`를 쓴다.

---

## 8. 왜 저장하면 화면이 바로 바뀌나?

Vite 개발 서버가 파일 변경을 감지한다.  
파일을 저장하면 브라우저에 변경된 내용을 빠르게 반영한다.

이걸 보통 HMR(Hot Module Replacement)이라고 부른다.

쉽게 말하면:

```text
파일 저장
→ Vite가 변경 감지
→ 브라우저에 변경된 코드 전달
→ 화면 갱신
```

Android에서 매번 전체 빌드/설치하는 것보다 훨씬 가볍게 느껴질 수 있다.

---

## 9. 내가 어제/오늘 한 작업을 설명하면

```text
Vite + React 프로젝트를 세팅해서 브라우저에서 React 화면을 확인할 수 있는 개발 환경을 만들었다.

이후 기본 Vite 화면을 걷어내고, App.jsx에서 ProjectIntro 컴포넌트를 렌더링하도록 바꿨다.

ProjectIntro.jsx는 프로젝트 주제를 소개하는 화면 조각으로 분리했다. 
이렇게 분리한 이유는 앞으로 입력 화면, 결과 카드, 기록 화면처럼 기능이 늘어날 때 컴포넌트 단위로 관리하기 위해서다.
```

---

## 10. 아직 헷갈릴 수 있는 지점

### 1) `index.html`이 왜 중요한가?

Vite에서는 `index.html`이 앱의 시작점이다.  
그 안에 있는 `<script type="module" src="/src/main.jsx"></script>`가 `main.jsx`를 실행한다.

---

### 2) `main.jsx`는 왜 필요한가?

React를 HTML에 꽂아 넣는 연결 코드다.

```jsx
createRoot(document.getElementById('root')).render(<App />);
```

이 한 줄이 없으면 `App.jsx`를 만들어도 브라우저 화면에 안 뜬다.

---

### 3) `App.jsx`는 왜 필요한가?

앱의 최상위 컴포넌트다.  
앞으로 여러 화면을 만들면 `App.jsx`가 그 화면들을 조립하는 역할을 하게 된다.

---

### 4) CSS import는 왜 변수에 안 담는데 적용되나?

React/Vite에서는 CSS 파일을 이렇게 import할 수 있다.

```jsx
import './index.css';
```

이건 값을 가져오는 import가 아니라, “이 CSS 파일을 앱에 적용해줘”라는 의미다.  
Vite가 이 CSS를 개발 서버를 통해 브라우저에 주입해준다.

그래서 변수에 담지 않아도 스타일이 적용된다.

---

## 11. 지금 프로젝트에서 다음 개발 순서

현재는 기획과 프로젝트 세팅이 된 상태다.  
다음은 아주 작은 UI부터 만들면 된다.

```text
1. 입력창 만들기
2. 정리하기 버튼 만들기
3. 목데이터로 결과 카드 3개 보여주기
   - 감정
   - 원인
   - 내일의 작은 행동
4. 입력값을 상태로 관리하기
5. 버튼 클릭 시 결과 카드 표시하기
6. 이후 AI 연동 고민하기
```

중요한 점은 AI 연동부터 하지 않는 것이다.  
먼저 목데이터로 UI 흐름을 만들고, 나중에 AI 응답으로 바꾸는 것이 안전하다.

---

## 12. 회고 때 말할 수 있는 문장

```text
저는 웹 개발 경험이 거의 없어서 Vite + React 구조가 처음에는 잘 이해되지 않았습니다. 
특히 index.html, main.jsx, App.jsx가 어떤 순서로 연결되는지가 헷갈렸습니다.

정리해보니 index.html은 React 앱이 들어갈 root div를 제공하고, main.jsx는 그 root div를 찾아 App 컴포넌트를 렌더링하는 시작점이라는 것을 이해했습니다.

Android로 비유하면 main.jsx는 MainActivity에서 화면을 붙이는 부분과 비슷하고, App.jsx는 최상위 화면 컴포넌트라고 이해했습니다.

아직 완전히 익숙하진 않지만, 내일은 이 구조를 바탕으로 입력창과 결과 카드 UI를 작은 컴포넌트 단위로 만들어보려고 합니다.
```

---

## 13. 한 줄 정리

```text
Vite는 React를 브라우저에서 빠르게 실행하고 개발할 수 있게 해주는 도구이고,
React는 화면을 컴포넌트 단위로 쪼개서 만드는 라이브러리다.
index.html의 root div에 main.jsx가 App.jsx를 꽂아 넣으면서 화면이 시작된다.
```
