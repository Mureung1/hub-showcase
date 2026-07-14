import React, { useEffect, useState, useRef } from "react";
import "./index.css";

// 초기 mock 메시지 (2~3개)
const mockMessages = [
  { id: 1, role: "ai", content: "안녕. 오늘은 어떻게 지냈어?" },
  { id: 2, role: "user", content: "오늘 발표가 잘 안됐어." },
  { id: 3, role: "ai", content: "그런 일이 있었구나. 괜찮아." }
];

// 관찰 mock 데이터 (평소/긴장/피곤)
const mockObservationNormal = {
  faceDetected: true,
  gaze: "정면",
  voiceTone: "평소",
  movementLevel: "보통",
  confidence: 0.82
};
const mockObservationTension = {
  faceDetected: true,
  gaze: "회피",
  voiceTone: "빠름",
  movementLevel: "많음",
  confidence: 0.65
};
const mockObservationTired = {
  faceDetected: true,
  gaze: "아래",
  voiceTone: "느림",
  movementLevel: "적음",
  confidence: 0.78
};

// 감정 분석 mock (평소/긴장/피곤)
const mockEmotionAnalysisNormal = {
  possibleStates: [{ label: "안정 가능성", confidence: 0.72 }],
  evidence: ["정면을 바라봄", "평소와 비슷한 목소리", "움직임이 평소 범위임"],
  responseApproach: "continue_normally",
  needsConfirmation: false
};
const mockEmotionAnalysisTension = {
  possibleStates: [
    { label: "긴장 가능성", confidence: 0.68 },
    { label: "걱정 가능성", confidence: 0.52 }
  ],
  evidence: ["시선을 자주 피함", "말하는 속도가 빠름", "움직임이 평소보다 많음"],
  responseApproach: "ask_gently",
  needsConfirmation: true
};
const mockEmotionAnalysisTired = {
  possibleStates: [
    { label: "피로 가능성", confidence: 0.76 },
    { label: "집중 저하 가능성", confidence: 0.41 }
  ],
  evidence: ["시선이 아래를 향함", "말하는 속도가 느림", "움직임이 적음"],
  responseApproach: "keep_brief",
  needsConfirmation: true
};

// 간단한 mock 분석 함수 (향후 실제 API로 교체 가능)
export function analyzeMockContext({ inputText, observation, recentMessages, selectedScenario }) {
  let base = mockEmotionAnalysisNormal;
  if (selectedScenario === "tension") base = mockEmotionAnalysisTension;
  else if (selectedScenario === "tired") base = mockEmotionAnalysisTired;

  const result = {
    possibleStates: base.possibleStates.map((s) => ({ ...s })),
    evidence: [...base.evidence],
    responseApproach: base.responseApproach,
    needsConfirmation: base.needsConfirmation
  };

  const text = (inputText || "").toLowerCase();
  if (/힘들|실패|망쳤|걱정/.test(text)) {
    const idx = result.possibleStates.findIndex((s) => /걱정|긴장/.test(s.label));
    if (idx >= 0) result.possibleStates[idx].confidence = Math.min(1, result.possibleStates[idx].confidence + 0.12);
    else result.possibleStates.unshift({ label: "걱정 가능성", confidence: 0.6 });
    result.evidence.unshift("사용자 메시지에서 걱정 관련 단어 검출");
    result.needsConfirmation = true;
  }
  if (/피곤|졸려|지쳐/.test(text)) {
    const idx = result.possibleStates.findIndex((s) => /피로|집중/.test(s.label));
    if (idx >= 0) result.possibleStates[idx].confidence = Math.min(1, result.possibleStates[idx].confidence + 0.14);
    else result.possibleStates.unshift({ label: "피로 가능성", confidence: 0.6 });
    result.evidence.unshift("사용자 메시지에서 피로 관련 단어 검출");
    result.responseApproach = "keep_brief";
    result.needsConfirmation = true;
  }
  if (/기뻐|성공|잘했|합격/.test(text)) {
    result.possibleStates.unshift({ label: "긍정 가능성", confidence: 0.7 });
    result.evidence.unshift("사용자 메시지에서 긍정 관련 단어 검출");
    result.responseApproach = "continue_normally";
    result.needsConfirmation = false;
  }

  if (Array.isArray(recentMessages) && recentMessages.length > 0) {
    const lastUser = [...recentMessages].reverse().find((m) => m.role === "user");
    if (lastUser && /발표|시험|면접/.test((lastUser.content || "").toLowerCase())) {
      result.evidence.push("이전 대화에서 발표/시험 관련 언급");
      const idx = result.possibleStates.findIndex((s) => /걱정|긴장/.test(s.label));
      if (idx >= 0) result.possibleStates[idx].confidence = Math.min(1, result.possibleStates[idx].confidence + 0.08);
      else result.possibleStates.push({ label: "걱정 가능성", confidence: 0.5 });
      result.needsConfirmation = true;
    }
  }

  result.possibleStates = result.possibleStates.map((s) => ({ ...s, confidence: Math.round(s.confidence * 100) / 100 }));
  return result;
}

export default function App() {
  const [messages, setMessages] = useState(mockMessages);
  const [inputText, setInputText] = useState("");
  const [aiStatus, setAiStatus] = useState("waiting");
  const [observation, setObservation] = useState(mockObservationNormal);
  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [emotionAnalysis, setEmotionAnalysis] = useState(mockEmotionAnalysisNormal);
  const scrollRef = useRef(null);

  const statusLabels = {
    waiting: "대기 중",
    listening: "듣는 중",
    thinking: "생각 중",
    speaking: "말하는 중"
  };

  useEffect(() => {
    console.log("App 초기 상태:", { messages, observation, emotionAnalysis, selectedScenario });
  }, []);

  const handleScenarioChange = (scenario) => {
    setSelectedScenario(scenario);
    const selectedObservation =
      scenario === "tension"
        ? mockObservationTension
        : scenario === "tired"
        ? mockObservationTired
        : mockObservationNormal;
    setObservation(selectedObservation);

    const updatedAnalysis = analyzeMockContext({
      inputText,
      observation: selectedObservation,
      recentMessages: messages,
      selectedScenario: scenario
    });
    setEmotionAnalysis(updatedAnalysis);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateMockResponse = (messageText, analysis) => {
    const text = messageText.toLowerCase();

    if (analysis.responseApproach === "ask_gently") {
      return "발표 이야기가 마음에 많이 남아 있는 것처럼 느껴져. 내가 잘못 이해한 걸 수도 있는데, 어떤 부분이 가장 신경 쓰였어?";
    }
    if (analysis.responseApproach === "keep_brief") {
      return "오늘은 평소보다 많이 지쳐 보이는 것 같아. 짧게 말해줘도 괜찮아.";
    }
    if (analysis.responseApproach === "continue_normally") {
      if (/기뻐|성공|잘했|합격/.test(text) || analysis.possibleStates.some((s) => /긍정/.test(s.label))) {
        return "좋은 일이 있었던 것 같아. 네가 가장 기뻤던 순간이 어떤 부분이었는지 듣고 싶어.";
      }
      return "네 이야기를 천천히 들려줘. 나는 여기 있어.";
    }

    if (/힘들|실패|망쳤|걱정/.test(text) || analysis.possibleStates.some((s) => /걱정|긴장/.test(s.label))) {
      return "마음에 걸리는 일이 있는 것처럼 보이네. 조금 더 자세히 말해줄래?";
    }
    if (/피곤|졸려|지쳐/.test(text) || analysis.possibleStates.some((s) => /피로/.test(s.label))) {
      return "오늘은 너무 무리하지 않았으면 좋겠어. 짧게 이야기해도 괜찮아.";
    }

    return "그 이야기를 조금 더 들려줄래?";
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || aiStatus !== "waiting") return;

    const nextId = messages.length > 0 ? Math.max(...messages.map((m) => m.id)) + 1 : 1;
    const nextMessage = { id: nextId, role: "user", content: trimmed };
    const nextMessages = [...messages, nextMessage];

    const nextAnalysis = analyzeMockContext({
      inputText: trimmed,
      observation,
      recentMessages: messages,
      selectedScenario
    });

    setMessages(nextMessages);
    setInputText("");
    setEmotionAnalysis(nextAnalysis);
    setAiStatus("thinking");

    setTimeout(() => {
      setAiStatus("speaking");
      const aiContent = generateMockResponse(trimmed, nextAnalysis);
      const aiMessage = { id: nextId + 1, role: "ai", content: aiContent };
      setMessages((prev) => [...prev, aiMessage]);

      setTimeout(() => {
        setAiStatus("waiting");
      }, 1000);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 화면 레이아웃: 사이드바(왼쪽)와 대화영역(오른쪽)
  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="ai-card">
          <div className="ai-avatar" aria-hidden>
            {/* 원형 자리 */}
          </div>
          <div className="ai-meta">
            <h2 className="ai-name">관계형 AI</h2>
            <div className={`ai-status ai-status-${aiStatus}`} role="status" aria-live="polite">
              {statusLabels[aiStatus] || aiStatus}
            </div>
          </div>
        </div>

        <section className="observation">
          <h4>관찰 상태</h4>
          <ul>
            <li>얼굴 감지: {observation.faceDetected ? "예" : "아니오"}</li>
            <li>시선: {observation.gaze}</li>
            <li>목소리: {observation.voiceTone}</li>
            <li>움직임: {observation.movementLevel}</li>
            <li>신뢰도: {Math.round(observation.confidence * 100)}%</li>
          </ul>
        </section>

        <section className="scenarios">
          <h4>상황 시뮬레이션</h4>
          <div className="scenario-buttons" role="group" aria-label="상황 시뮬레이션">
            <button
              className={selectedScenario === "normal" ? "active" : ""}
              aria-pressed={selectedScenario === "normal"}
              onClick={() => handleScenarioChange("normal")}
            >
              평소
            </button>
            <button
              className={selectedScenario === "tension" ? "active" : ""}
              aria-pressed={selectedScenario === "tension"}
              onClick={() => handleScenarioChange("tension")}
            >
              긴장
            </button>
            <button
              className={selectedScenario === "tired" ? "active" : ""}
              aria-pressed={selectedScenario === "tired"}
              onClick={() => handleScenarioChange("tired")}
            >
              피곤
            </button>
          </div>
        </section>

        <section className="emotion-analysis">
          <h4>AI의 상태 추정</h4>
          <div className="possible-states">
            {emotionAnalysis.possibleStates.map((s, i) => (
              <div key={i} className="state-item">
                <span className="label">{s.label}</span>
                <span className="confidence">{Math.round(s.confidence * 100)}%</span>
              </div>
            ))}
          </div>
          <details>
            <summary>판단 근거 및 자세히 보기</summary>
            <ul>
              {emotionAnalysis.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
            <div>대응 방식: {emotionAnalysis.responseApproach}</div>
            <div>확인 필요: {emotionAnalysis.needsConfirmation ? "예" : "아니오"}</div>
          </details>
        </section>
      </aside>

      <main className="main">
        <div className="messages" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.role === "user" ? "user" : "ai"}`}>
              <div className="message-content">{m.content}</div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <input
            placeholder="메시지를 입력하세요..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSend} disabled={!inputText.trim() || aiStatus !== "waiting"}>
            전송
          </button>
        </div>
      </main>
    </div>
  );
}
