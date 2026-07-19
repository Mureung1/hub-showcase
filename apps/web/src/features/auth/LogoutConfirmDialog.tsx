import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

/** 로그아웃 확인 팝업 (SPEC-AUTH-001 4.3, 결정 3-3). 확인 시에만 로그아웃한다. */
export function LogoutConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending = false,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="로그아웃" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <Text as="p">로그아웃할까요?</Text>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <Button label="취소" onClick={() => onOpenChange(false)} isDisabled={isPending} />
            <Button
              label="로그아웃"
              variant="primary"
              onClick={onConfirm}
              isLoading={isPending}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
