import type { ReactNode } from 'react';
import styles from './WarningBanner.module.css';
import { WarningIcon } from '../icons';

interface WarningBannerProps {
  children: ReactNode;
}

/** docs/디자인.md 5번 "경고 배너" — 안전 섭취 한도 초과 시에만 렌더링하도록 호출부에서 조건부 사용 */
export function WarningBanner({ children }: WarningBannerProps) {
  return (
    <div className={styles.banner}>
      <span className={styles.icon}>
        <WarningIcon />
      </span>
      <span>{children}</span>
    </div>
  );
}
