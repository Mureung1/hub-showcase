import { Button } from "@astryxdesign/core/Button";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import type { Chat } from "./types";
import { hasIncompleteQuestion } from "./types";
import "./chat.css";

interface ChatListPanelProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  /** 로그인 사용자 이메일 (SPEC-AUTH-001 4.3). */
  userEmail: string;
  /** [로그아웃] 클릭 — 확인 팝업을 연다. */
  onLogout: () => void;
}

/**
 * Left 패널: 로고(● Decision Log) + 새 채팅 + Chat List + Mock 사용자 영역.
 * 미완료 Question이 있는 Chat은 제목 앞에 빨간 동그라미를 표시한다 (Step 2-4).
 */
export function ChatListPanel({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  userEmail,
  onLogout,
}: ChatListPanelProps) {
  return (
    <SideNav
      header={<SideNavHeading icon={<span className="brand-dot" />} heading="Decision Log" />}
      topContent={
        <Button label="＋ 새 채팅" variant="secondary" onClick={onNewChat} />
      }
      footer={
        <VStack gap={1} className="user-footer">
          <Text type="supporting" color="secondary">
            {userEmail}
          </Text>
          <Button label="로그아웃" variant="ghost" size="sm" onClick={onLogout} />
        </VStack>
      }
    >
      <SideNavSection title="Chat List">
        {chats.map((chat) => (
          <SideNavItem
            key={chat.id}
            label={chat.title}
            isSelected={chat.id === activeChatId}
            onClick={() => onSelectChat(chat.id)}
            icon={
              hasIncompleteQuestion(chat) ? (
                <StatusDot variant="error" label="진행 중인 질문 있음" />
              ) : undefined
            }
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}
