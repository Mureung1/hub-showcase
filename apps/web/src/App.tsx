import { useState } from "react";
import "./App.css";

const mockAnswers = [
  {
    id: "chatgpt",
    model: "ChatGPT",
    content:
      "빠르게 MVP를 만들고 PostgreSQL 기반으로 확장하려면 Supabase가 적합합니다.",
  },
  {
    id: "claude",
    model: "Claude",
    content:
      "관계형 데이터와 향후 서버 확장을 고려하면 Supabase를 추천합니다.",
  },
];

const mockManagerCard = {
  title: "두 AI 모두 Supabase를 추천했습니다.",
  summary:
    "빠른 개발과 PostgreSQL 기반 확장성을 공통된 근거로 제시했습니다.",
};

type DecisionStatus = "accepted" | "verify" | "rejected";

const statusLabels: Record<DecisionStatus, string> = {
  accepted: "채택",
  verify: "보류",
  rejected: "폐기",
};

interface QuestionInputProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
}

function QuestionInput({
  question,
  onQuestionChange,
  onSubmit,
}: QuestionInputProps) {
  return (
    <section className="question-section">
      <label htmlFor="question">기술 질문</label>

      <textarea
        id="question"
        value={question}
        onChange={(event) =>
          onQuestionChange(event.target.value)
        }
        placeholder="예: Supabase와 Firebase 중 무엇이 적합한가?"
      />

      <button
        className="primary-button"
        type="button"
        onClick={onSubmit}
      >
        AI 답변 비교하기
      </button>
    </section>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] =
    useState("");
  const [isResultVisible, setIsResultVisible] =
    useState(false);
  const [decisionStatus, setDecisionStatus] =
    useState<DecisionStatus | null>(null);

  function handleSubmit() {
    if (!question.trim()) {
      return;
    }

    setSubmittedQuestion(question);
    setIsResultVisible(true);
    setDecisionStatus(null);
  }

  return (
    <main className="app">
      <header className="header">
        <p className="eyebrow">Multi-AI Decision Tool</p>
        <h1>Decision Log</h1>
        <p>
          여러 AI의 답변을 비교하고 자신의 판단을
          기록합니다.
        </p>
      </header>

      <QuestionInput
        question={question}
        onQuestionChange={setQuestion}
        onSubmit={handleSubmit}
      />

      {isResultVisible && (
        <div className="workspace">
          <section className="result-section">
            <div className="submitted-question">
              <span>실행한 질문</span>
              <strong>{submittedQuestion}</strong>
            </div>

            <div className="answer-list">
              {mockAnswers.map((answer) => (
                <article
                  className="answer-card"
                  key={answer.id}
                >
                  <h2>{answer.model}</h2>
                  <p>{answer.content}</p>
                </article>
              ))}
            </div>

            <article className="manager-card">
              <span className="badge">Manager AI</span>
              <h2>{mockManagerCard.title}</h2>
              <p>{mockManagerCard.summary}</p>

              <div className="status-buttons">
                <button
                  type="button"
                  onClick={() =>
                    setDecisionStatus("accepted")
                  }
                >
                  채택
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDecisionStatus("verify")
                  }
                >
                  보류
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDecisionStatus("rejected")
                  }
                >
                  폐기
                </button>
              </div>
            </article>
          </section>

          <aside className="decision-panel">
            <h2>Decision Log</h2>

            {decisionStatus ? (
              <div className="decision-card">
                <span
                  className={`status ${decisionStatus}`}
                >
                  {statusLabels[decisionStatus]}
                </span>

                <strong>{mockManagerCard.title}</strong>
                <p>{mockManagerCard.summary}</p>
              </div>
            ) : (
              <p className="empty-message">
                Manager 카드의 상태를 선택해주세요.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

export default App;
