import { useState } from "react";
import SubjectForm from "./components/SubjectForm";
import ResultScreen from "./components/ResultScreen";
import "./App.css";

const mockSubjects = [
  {
    id: 1,
    name: "한방병리학",
    priorityScore: 90,
  },
  {
    id: 2,
    name: "본초방제학",
    priorityScore: 75,
  },
];

function App() {
  const [currentScreen, setCurrentScreen] = useState("form");

  function showResultScreen() {
    setCurrentScreen("result");
  }

  function showFormScreen() {
    setCurrentScreen("form");
  }

  return (
    <main className="app-container">
      <h1>시험 우선순위 계산기</h1>

      {currentScreen === "form" ? (
        <SubjectForm onShowResult={showResultScreen} />
      ) : (
        <ResultScreen
          subjects={mockSubjects}
          onBack={showFormScreen}
        />
      )}
    </main>
  );
}

export default App;