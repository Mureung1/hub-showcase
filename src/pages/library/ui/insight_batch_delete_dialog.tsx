import { useState } from 'react';

import { Button, Modal, TextField } from '@/shared/ui';

export type InsightBatchDeleteDialogProps = {
  deleting: boolean;
  failed: boolean;
  libraryWide: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
  selectedCount: number;
};

export function InsightBatchDeleteDialog({
  deleting,
  failed,
  libraryWide,
  onClose,
  onConfirm,
  open,
  selectedCount,
}: InsightBatchDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const confirmed = !libraryWide || confirmation.trim() === '삭제';
  const actionLabel = getActionLabel({
    deleting,
    failed,
    libraryWide,
    selectedCount,
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !deleting) {
      onClose();
    }
  }

  return (
    <Modal
      className="insight-batch-delete-dialog"
      description={
        libraryWide
          ? `인사이트 ${selectedCount}개가 모두 사라지고 되돌릴 수 없어요. 계속하려면 아래에 ‘삭제’를 입력해 주세요.`
          : `선택한 인사이트 ${selectedCount}개가 보관함에서 사라지고 되돌릴 수 없어요.`
      }
      footer={
        <>
          <Button
            disabled={deleting}
            hierarchy="secondary"
            onClick={onClose}
            size="small"
            type="button"
          >
            닫기
          </Button>
          <Button
            disabled={deleting || !confirmed}
            hierarchy="primary"
            loading={deleting}
            onClick={() => void onConfirm()}
            size="small"
            type="button"
          >
            {actionLabel}
          </Button>
        </>
      }
      onOpenChange={handleOpenChange}
      open={open}
      size="small"
      title={
        libraryWide
          ? '보관함의 모든 인사이트를 삭제할까요?'
          : '선택한 인사이트를 삭제할까요?'
      }
    >
      <div className="insight-batch-delete-dialog__content">
        {libraryWide ? (
          <label className="insight-batch-delete-dialog__confirmation">
            <span>확인 문구</span>
            <TextField
              aria-label="확인 문구"
              autoComplete="off"
              disabled={deleting}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              placeholder="삭제"
              value={confirmation}
              width="100%"
            />
          </label>
        ) : null}

        {failed ? (
          <p className="insight-batch-delete-dialog__error" role="alert">
            인사이트를 삭제하지 못했어요. 인사이트와 선택은 그대로 두었어요.
            다시 시도하거나 닫아 주세요.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function getActionLabel({
  deleting,
  failed,
  libraryWide,
  selectedCount,
}: {
  deleting: boolean;
  failed: boolean;
  libraryWide: boolean;
  selectedCount: number;
}) {
  if (deleting) {
    return '인사이트를 삭제하고 있어요';
  }

  const retryLabel = failed ? '다시 삭제하기' : '삭제하기';

  return libraryWide
    ? `인사이트 ${selectedCount}개 모두 ${retryLabel}`
    : `인사이트 ${selectedCount}개 ${retryLabel}`;
}
