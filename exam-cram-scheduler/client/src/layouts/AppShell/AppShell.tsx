import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AppShell.module.css';
import { BackIcon } from '../../components/icons';

interface AppShellProps {
  title: ReactNode;
  step: 1 | 2 | 3 | 4 | 5;
  backTo?: string;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * docs/디자인.md 6번 "화면 공통 레이아웃(앱 셸)".
 * 프로토타입의 statusbar·home-indicator는 목업 전용 장식이라 실제 앱에서는 빼고,
 * navbar/progress-track/screen/footer-cta만 옮겼다.
 */
export function AppShell({ title, step, backTo, footer, children }: AppShellProps) {
  return (
    <div className={styles.device}>
      <div className={styles.navbar}>
        <div className={styles.navSide}>
          {backTo && (
            <Link to={backTo} className={styles.iconBtn}>
              <BackIcon />
            </Link>
          )}
          <span className={styles.navTitle}>{title}</span>
        </div>
        <div className={styles.navSide} />
      </div>

      <div className={styles.progressTrack}>
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className={[
              styles.progressSeg,
              seg < step ? styles.done : '',
              seg === step ? styles.current : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      <div className={styles.screen}>{children}</div>

      {footer && <div className={styles.footerCta}>{footer}</div>}
    </div>
  );
}
