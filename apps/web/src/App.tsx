import { useState } from "react";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { ChatCenter } from "./features/chat/ChatCenter";
import { ChatListPanel } from "./features/chat/ChatListPanel";
import { NewChatConfirmDialog } from "./features/chat/NewChatConfirmDialog";
import { useChatWorkspace } from "./features/chat/useChatWorkspace";
import { DecisionNotesPanel } from "./features/decision-log/DecisionNotesPanel";


function App() {
  const {
    chats,
    activeChat,
    isActiveChatBusy,
    submitQuestion,
    selectChat,
    startNewChat,
  } = useChatWorkspace();

  // 컴포저 입력값 — 예시 질문 칩 클릭 시에도 여기에 채워진다 (Step 1-3)
  const [composerValue, setComposerValue] = useState("");
  const [isNewChatConfirmOpen, setIsNewChatConfirmOpen] = useState(false);

  function handleSubmitQuestion(value: string) {
    const submitted = submitQuestion(value);
    if (submitted) {
      setComposerValue("");
    }
  }

  function handleSelectChat(chatId: string) {
    if (chatId === activeChat?.id) {
      return;
    }
    selectChat(chatId);
    setComposerValue("");
  }

  function handleNewChat() {
    if (activeChat === null) {
      return;
    }
    // 미완료 Question이 있으면 확인 팝업을 한 번 거친다 (Step 2-3)
    if (isActiveChatBusy) {
      setIsNewChatConfirmOpen(true);
      return;
    }
    startNewChat();
    setComposerValue("");
  }

  function handleConfirmNewChat() {
    setIsNewChatConfirmOpen(false);
    startNewChat();
    setComposerValue("");
  }

  return (
    <>
      <WorkspaceLayout
        sidebar={
          <ChatListPanel
            chats={chats}
            activeChatId={activeChat?.id ?? null}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
          />
        }
        center={
          <ChatCenter
            activeChat={activeChat}
            isBusy={isActiveChatBusy}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSubmitQuestion={handleSubmitQuestion}
          />
        }
        notes={<DecisionNotesPanel />}
      />
      <NewChatConfirmDialog
        isOpen={isNewChatConfirmOpen}
        onOpenChange={setIsNewChatConfirmOpen}
        onConfirm={handleConfirmNewChat}
      />
    </>
  );
}

export default App;
