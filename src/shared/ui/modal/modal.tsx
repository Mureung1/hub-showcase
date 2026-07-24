import type { ReactNode } from 'react';
import {
  Modal as WdsModal,
  ModalClose as WdsModalClose,
  ModalContainer as WdsModalContainer,
  ModalContent as WdsModalContent,
  ModalDescription as WdsModalDescription,
  ModalNavigation as WdsModalNavigation,
} from '@wanteddev/wds';
import clsx from 'clsx';

import './modal.css';

export type ModalProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: 'large' | 'medium' | 'small';
  title: string;
};

export function Modal({
  children,
  className,
  description,
  footer,
  onOpenChange,
  open,
  size = 'small',
  title,
}: ModalProps) {
  return (
    <WdsModal onOpenChange={onOpenChange} open={open}>
      <WdsModalContainer
        className={clsx('ui-modal', className)}
        resize="fixed"
        size={size}
        variant="popup"
      >
        <WdsModalNavigation
          trailingContent={<WdsModalClose aria-label="닫기" />}
        >
          {title}
        </WdsModalNavigation>
        <WdsModalContent className="ui-modal__content">
          {description ? (
            <WdsModalDescription>{description}</WdsModalDescription>
          ) : null}
          {children}
        </WdsModalContent>
        {footer ? <div className="ui-modal__footer">{footer}</div> : null}
      </WdsModalContainer>
    </WdsModal>
  );
}
