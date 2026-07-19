import { useState } from "react";
import { useNavigate } from "react-router";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { ChatCenter } from "./features/chat/ChatCenter";
import { ChatListPanel } from "./features/chat/ChatListPanel";
import { MockValidationBanner } from "./features/chat/MockValidationBanner";
import { NewChatConfirmDialog } from "./features/chat/NewChatConfirmDialog";
import { useChatWorkspace } from "./features/chat/useChatWorkspace";
import { DecisionNotesPanel } from "./features/decision-log/DecisionNotesPanel";
import { useAuth } from "./features/auth/useAuth";
import { LogoutConfirmDialog } from "./features/auth/LogoutConfirmDialog";
import { signOut } from "./features/auth/authService";

/**
 * `/` 워크스페이스 (기존 3단 Mock 화면). 서비스 데이터는 이 Spec에서 여전히 Mock으로
 * 동작한다 (SPEC-AUTH-001 0.1). 좌측 패널 하단에 로그인 이메일·로그아웃을 배선한다.
 */
function WorkspacePage() {
  const {
    chats,
    activeChat,
    decisionNotes,
    isActiveChatBusy,
    mockValidationError,
    submitQuestion,
    resolveAgenda,
    requestRecheck,
    selectChat,
    startNewChat,
  } = useChatWorkspace();

  const navigate = useNavigate();
  const { session, clearSession } = useAuth();

  // 컴포저 입력값 — 예시 질문 칩 클릭 시에도 여기에 채워진다 (Step 1-3)
  const [composerValue, setComposerValue] = useState("");
  const [isNewChatConfirmOpen, setIsNewChatConfirmOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  async function handleConfirmLogout() {
    setIsLoggingOut(true);
    await signOut();
    // Supabase 결과와 무관하게 로컬 세션을 비우고 로그인 화면으로 보낸다 (결정 3-3).
    clearSession();
    setIsLoggingOut(false);
    setIsLogoutOpen(false);
    navigate("/login", { replace: true });
  }

  /**
   * 노트 → Question 이동 (Step 8 R3-2). 노트는 활성 Chat 기준으로 표시되므로
   * 대상 Question 블록(data-question-id)은 항상 현재 트랜스크립트에 렌더링되어 있다.
   * 기존 state를 바꾸지 않는 최소 변경 — DOM 조회 + scrollIntoView + 1.5초 하이라이트.
   */
  function handleNavigateToQuestion(questionId: string) {
    const el = document.querySelector(`[data-question-id="${questionId}"]`);
    if (!(el instanceof HTMLElement)) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("question-highlight");
    window.setTimeout(() => el.classList.remove("question-highlight"), 1500);
  }

  return (
    <>
      {mockValidationError && <MockValidationBanner error={mockValidationError} />}
      <WorkspaceLayout
        sidebar={
          <ChatListPanel
            chats={chats}
            activeChatId={activeChat?.id ?? null}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            userEmail={session?.email ?? ""}
            onLogout={() => setIsLogoutOpen(true)}
          />
        }
        center={
          <ChatCenter
            activeChat={activeChat}
            isBusy={isActiveChatBusy}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSubmitQuestion={handleSubmitQuestion}
            onResolveAgenda={resolveAgenda}
            onRequestRecheck={requestRecheck}
          />
        }
        notes={
          <DecisionNotesPanel
            notes={decisionNotes}
            activeChatId={activeChat?.id ?? null}
            onNavigateToQuestion={handleNavigateToQuestion}
          />
        }
      />
      <NewChatConfirmDialog
        isOpen={isNewChatConfirmOpen}
        onOpenChange={setIsNewChatConfirmOpen}
        onConfirm={handleConfirmNewChat}
      />
      <LogoutConfirmDialog
        isOpen={isLogoutOpen}
        onOpenChange={setIsLogoutOpen}
        onConfirm={handleConfirmLogout}
        isPending={isLoggingOut}
      />
    </>
  );
}

export default WorkspacePage;
