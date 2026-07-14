# 🎓 GNU 전공/교양 수강신청 AI 네비게이터

경상국립대학교(GNU) 학생들을 위한 맞춤형 인공지능 학업 및 수강신청 네비게이터 서비스입니다. 학생의 이수 구분별 취득 학점을 정밀 분석하고 졸업 필수 요건을 실시간으로 진단하여 맞춤형 시간표 및 교과목 추천을 제공합니다.

---

## 🔗 프로젝트 문서 바로가기
* [🎯 GNU 전공/교양 수강신청 AI 네비게이터 기획서 (Notion)](https://excessive-noise-9a0.notion.site/GNU-AI-428495d4a4b9468ca520ff6e981ec797?source=copy_link)

---

## 📅 오늘의 미션 & 해결 가이드

본 프로젝트는 React를 처음 학습하며 핵심 기능을 상태(`useState`) 기반으로 렌더링하고 직접 코딩을 해보며 원리를 이해하는 미션을 포함하고 있습니다.

### 1. 핵심 화면 만들기 (React + Mock Data)
서버가 없는 상태에서도 화면이 유기적으로 동작할 수 있도록 **가짜 데이터(Mock Data)**와 **로컬 상태(Local State)**를 활용하여 핵심 화면들을 구현했습니다.
* **로그인 및 학적 선택 (`Login.jsx`)**: 학번, 학적 구분(편입생, 일반재학생, 다전공자)을 입력받아 사용자 인증을 모방합니다.
* **포털 대시보드 (`Portal.jsx`)**: 로그인된 학생 세션을 유지하며 시간표 설계 및 학점 분석 탭으로 안내하는 허브 역할을 수행합니다.
* **시간표 설계 포털 (`TimetableGenerator.jsx`)**: 기이수 과목을 바탕으로 AI가 최적의 시간표 초안을 구성하고 실시간으로 강의 시간 충돌을 감지합니다.
* **학점 분석 포털 (`CreditAnalytics.jsx`)**: 이수 구분별 취득 학점 현황 및 성적 추이(GPA)를 시각화하여 보여줍니다.

### 2. 손코딩으로 이해하기 (Hand-Coding Guide)
React의 동작 방식을 몸으로 익히기 위해 아래 가이드라인에 따라 **직접 컴포넌트 코드를 타이핑해보며 학습**하는 것을 추천합니다.

* **추천 컴포넌트**: `Login.jsx` (혹은 아래 간소화된 `SimpleLogin.jsx` 예제)
* **학습 포인트**:
  1. `useState`로 선언된 상태값들이 HTML Input 엘리먼트의 `value` 및 `onChange` 이벤트와 어떻게 바인딩되는지 이해하기 (제어 컴포넌트 패턴)
  2. `isSignUp` 상태의 `true`/`false` 값에 따라 화면의 폼 레이아웃이 동적으로 렌더링되는 원리 파악하기
  3. 로그인 완료 후 부모 컴포넌트(`App.jsx`)로부터 전달받은 `onLogin` 콜백 함수를 호출하여 글로벌 세션 상태를 변경하는 흐름 추적하기

---

## 🛠️ 핵심 상태(State) 제어 및 렌더링 원리

### 💡 `useState`와 양방향 바인딩 (Input Handling)
React에서는 화면에 보여지는 값과 JavaScript 코드가 관리하는 상태(state)가 일치해야 합니다. 이를 **제어 컴포넌트(Controlled Component)**라고 부릅니다.
```javascript
const [studentId, setStudentId] = useState('');

// Input 엘리먼트에 바인딩
<input
  type="text"
  value={studentId}
  onChange={(e) => setStudentId(e.target.value)} // 사용자가 키보드를 입력할 때마다 상태 업데이트
/>
```

### 💡 상태에 따른 조건부 렌더링 (Conditional Rendering)
동일한 컴포넌트 내에서 회원가입 모드와 로그인 모드를 하나의 `isSignUp` 상태로 유연하게 제어합니다.
```javascript
const [isSignUp, setIsSignUp] = useState(false);

return (
  <form>
    {/* isSignUp이 true일 때만 이름과 이메일 입력창이 나타납니다 */}
    {isSignUp && (
      <div>
        <label>이름</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    )}
  </form>
);
```

---

## 🚀 시작하기 (How to Run)

프로젝트를 로컬 환경에서 실행하고 실시간으로 화면이 도는지 확인하려면 아래 단계를 따르세요.

### 1. 패키지 설치
`frontend` 폴더로 이동하여 필요한 의존성 라이브러리들을 설치합니다.
```bash
cd frontend
npm install
```

### 2. 개발 서버 실행
Vite 개발 서버를 구동합니다.
```bash
npm run dev
```
실행 후 터미널에 표시되는 로컬 호스트 주소(일반적으로 `http://localhost:5173` 또는 `http://localhost:3000`)에 접속하여 화면을 확인하세요.

---

## 📂 폴더 구조 (Project Structure)
```text
gnu-course-navigator/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx             # 로그인 및 회원가입 제어 컴포넌트
│   │   │   ├── Portal.jsx            # 서비스 전환 메인 허브 화면
│   │   │   ├── TimetableGenerator.jsx # AI 수강신청 시간표 추천 시뮬레이터
│   │   │   └── CreditAnalytics.jsx   # 이수 학점 분석 및 성적 시각화
│   │   ├── App.jsx                   # 전체 라우팅 및 세션 관리
│   │   ├── index.css                 # 메인 글래스모피즘 디자인 시스템 CSS
│   │   └── main.jsx                  # React 앱 엔트리 포인트
└── README.md
```
