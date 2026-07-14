import "./App.css";
import ProjectIntro from "./ProjectIntro";  // 다른 컴포넌트 가져오기
import LoginScreen from "./LoginScreen";
// 가장 큰 컴포넌트

function App() {  // 하나의 컴포넌트 (화면을 만드는 함수)
  return (
    // classname - CSS 연결
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <LoginScreen />
    </div>
  );
}
//  <ProjectIntro /> 의 경우는 HTML이 아니다. React에게 ProjectIntro 컴포넌트를 여기 가져오라는것

export default App; // 다른파일에서 사용할수있게 내보내기

// react를 사용하면 기능별로 컴포넌트를 나눌수있어 유지보수에 유리