const screens = Array.from(document.querySelectorAll(".screen"));
const stepPill = document.getElementById("stepPill");
const pdfInput = document.getElementById("pdfInput");
const fileChip = document.getElementById("fileChip");
const uploadLabel = document.getElementById("uploadLabel");
const analysisMessage = document.getElementById("analysisMessage");
const analysisProgress = document.getElementById("analysisProgress");
const analysisPercent = document.getElementById("analysisPercent");
const analysisLog = document.getElementById("analysisLog");
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("chatInput");

const flow = {
  stage: "landing",
  fileName: null,
  analysisTimer: null,
  chatIndex: 0,
  logs: [
    "PDF 분석 중...",
    "핵심 개념 추출",
    "학습 수준 분석",
    "문답 흐름 생성"
  ],
  chatScript: [
    {
      ai: "이 강의자료에서 가장 중요한 개념은 무엇일까요?",
      hint: "핵심 용어를 먼저 떠올려보세요.",
      followUp: "좋습니다. 이제 그 개념이 왜 중요한지 한 번 더 설명해볼까요?"
    },
    {
      ai: "그 개념을 다른 학생에게 설명한다고 생각해보세요. 어떻게 말하겠습니까?",
      hint: "정의, 예시, 이유를 짧게 연결해보세요.",
      followUp: "좋습니다. 지금처럼 자신의 말로 정리하는 것이 핵심입니다."
    },
    {
      ai: "마지막으로, 배운 내용을 한 문장으로 요약하면 무엇일까요?",
      hint: "짧고 분명하게 말하면 됩니다.",
      followUp: "완료입니다. 이제 학생은 이 개념을 자신의 말로 설명할 수 있습니다."
    }
  ]
};

function showScreen(name) {
  flow.stage = name;
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  stepPill.textContent =
    name === "landing" ? "Landing" :
    name === "upload" ? "PDF Upload" :
    name === "analysis" ? "Analysis" :
    name === "dialogue" ? "Socratic Dialogue" :
    "Completion";
}

function setButtonBusy(button, busy, label) {
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }

  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
  button.disabled = false;
}

function addMessage(role, text, typing = false) {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = role === "ai" ? "AI Tutor" : "Student";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (typing) {
    const dots = document.createElement("div");
    dots.className = "typing";
    dots.innerHTML = "<span></span><span></span><span></span>";
    bubble.appendChild(dots);
  } else {
    bubble.textContent = text;
  }

  row.append(meta, bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return row;
}

function resetChat() {
  chatWindow.innerHTML = "";
  flow.chatIndex = 0;
}

function startAnalysis() {
  const startButton = document.querySelector('[data-action="start-analysis"]');
  setButtonBusy(startButton, true, "분석 중...");
  showScreen("analysis");
  analysisLog.innerHTML = "";
  analysisMessage.textContent = "PDF 분석 중...";
  analysisProgress.style.width = "0%";
  analysisPercent.textContent = "0%";

  const logs = [...flow.logs];
  let index = 0;
  let progress = 0;

  const tick = () => {
    if (index < logs.length) {
      const item = document.createElement("div");
      item.className = "analysis-item";
      item.textContent = logs[index];
      analysisLog.appendChild(item);

      analysisMessage.textContent = logs[index];
      progress = Math.min(100, progress + 28);
      analysisProgress.style.width = `${progress}%`;
      analysisPercent.textContent = `${progress}%`;
      index += 1;
      flow.analysisTimer = window.setTimeout(tick, 850);
      return;
    }

    window.setTimeout(() => {
      startButton.disabled = false;
      startButton.textContent = "분석 시작";
      startDialogue();
    }, 700);
  };

  flow.analysisTimer = window.setTimeout(tick, 650);
}

function startDialogue() {
  showScreen("dialogue");
  resetChat();

  addMessage("ai", flow.chatScript[0].ai);

  const typing = addMessage("ai", "", true);
  window.setTimeout(() => {
    typing.remove();
    addMessage("ai", "질문에 답해보세요. 정답을 바로 주기보다 생각을 유도합니다.");
  }, 650);
}

function advanceDialogue(userText) {
  const script = flow.chatScript[flow.chatIndex];
  const input = userText.trim() || "생각을 정리해보겠습니다.";
  addMessage("user", input);

  const typing = addMessage("ai", "", true);
  window.setTimeout(() => {
    typing.remove();
    addMessage("ai", script.followUp);
    flow.chatIndex += 1;

    if (flow.chatIndex < flow.chatScript.length) {
      const next = flow.chatScript[flow.chatIndex];
      const nextTyping = addMessage("ai", "", true);
      window.setTimeout(() => {
        nextTyping.remove();
        addMessage("ai", next.ai);
      }, 700);
      return;
    }

    const finalTyping = addMessage("ai", "", true);
    window.setTimeout(() => {
      finalTyping.remove();
      showScreen("complete");
    }, 900);
  }, 900);
}

function restartDemo() {
  window.clearTimeout(flow.analysisTimer);
  flow.analysisTimer = null;
  flow.fileName = null;
  pdfInput.value = "";
  chatInput.value = "";
  fileChip.textContent = "선택된 파일 없음";
  uploadLabel.textContent = "샘플 PDF를 선택해도 됩니다.";
  analysisMessage.textContent = "PDF 분석 중...";
  analysisProgress.style.width = "0%";
  analysisPercent.textContent = "0%";
  analysisLog.innerHTML = "";
  resetChat();
  showScreen("landing");
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "go-upload") {
    showScreen("upload");
    return;
  }

  if (action === "back-landing") {
    restartDemo();
    return;
  }

  if (action === "choose-file") {
    pdfInput.click();
    return;
  }

  if (action === "start-analysis") {
    startAnalysis();
    return;
  }

  if (action === "send-chat") {
    advanceDialogue(chatInput.value);
    chatInput.value = "";
    return;
  }

  if (action === "chat-hint") {
    if (flow.chatIndex < flow.chatScript.length) {
      addMessage("ai", `힌트: ${flow.chatScript[flow.chatIndex].hint}`);
    }
    return;
  }

  if (action === "skip-chat") {
    if (flow.chatIndex < flow.chatScript.length) {
      advanceDialogue(flow.chatScript[flow.chatIndex].hint);
    }
    return;
  }

  if (action === "restart" || action === "review-flow") {
    restartDemo();
  }
});

pdfInput.addEventListener("change", () => {
  const file = pdfInput.files && pdfInput.files[0];
  if (!file) return;

  flow.fileName = file.name;
  fileChip.textContent = file.name;
  uploadLabel.textContent = "분석할 자료가 선택되었습니다.";
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  if (document.activeElement === chatInput) {
    event.preventDefault();
    advanceDialogue(chatInput.value);
    chatInput.value = "";
  }
});

showScreen("landing");
