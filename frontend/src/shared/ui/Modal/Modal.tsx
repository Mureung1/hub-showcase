import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalDialog,
  ModalHeader,
  ModalTitle,
} from './Modal.styles'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export const Modal = ({ title, children, onClose }: ModalProps) => {
  const titleId = useId()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <ModalBackdrop onMouseDown={onClose}>
      <ModalDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle id={titleId}>{title}</ModalTitle>
          <ModalCloseButton type="button" aria-label="모달 닫기" onClick={onClose}>
            <X size={18} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
      </ModalDialog>
    </ModalBackdrop>,
    document.body,
  )
}
