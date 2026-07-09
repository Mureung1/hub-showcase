import type { ReactNode } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** docs/디자인.md 5번 "바텀시트" — script.js의 data-open-sheet/data-close-sheet 동작을 open/onClose state로 재구현 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop}
        onClick={onClose}
      />
      <div className={open ? `${styles.sheet} ${styles.open}` : styles.sheet} role="dialog" aria-modal="true">
        <div className={styles.handle} />
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </>
  );
}
