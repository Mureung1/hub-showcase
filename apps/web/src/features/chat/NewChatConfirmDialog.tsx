import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

interface NewChatConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

/**
 * 미완료 Question이 있는 상태에서 [+ 새 채팅] 클릭 시 확인 팝업 (Step 2-3).
 * 배경 클릭·×로 닫으면 이동하지 않는다. 확인 시에도 기존 Chat 진행 상태는 유지된다.
 */
export function NewChatConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: NewChatConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="새 채팅" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <Text as="p">
              진행 중인 질문이 있습니다. 새 채팅으로 이동할까요?
            </Text>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <Button label="취소" onClick={() => onOpenChange(false)} />
            <Button label="이동" variant="primary" onClick={onConfirm} />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
