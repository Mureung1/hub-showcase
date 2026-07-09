import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Row.module.css';
import { ChevronRightIcon, PlusIcon } from '../icons';

type IconVariant = 'sleep' | 'study' | 'caffeine' | 'exam';

interface RowProps {
  icon?: ReactNode;
  iconVariant?: IconVariant;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  /** "시험 추가" / "음료 추가" 같은 목록 끝 추가 버튼 스타일 */
  isAdd?: boolean;
  right?: ReactNode;
  href?: string;
  onClick?: () => void;
}

/**
 * docs/디자인.md 5번의 "리스트 로우" 패턴.
 * href가 있으면 라우터 링크로, onClick만 있으면 버튼으로, 둘 다 없으면 div로 렌더링.
 */
export function Row({
  icon,
  iconVariant,
  title,
  subtitle,
  value,
  chevron,
  isAdd,
  right,
  href,
  onClick,
}: RowProps) {
  const className = isAdd ? `${styles.row} ${styles.isAdd}` : styles.row;

  const content = (
    <>
      <span className={`${styles.rowIcon} ${iconVariant ? styles[iconVariant] : ''}`}>
        {isAdd ? <PlusIcon /> : icon}
      </span>
      <span className={styles.rowBody}>
        <div className={isAdd ? styles.isAddTitle : styles.rowTitle}>{title}</div>
        {subtitle && <div className={styles.rowSub}>{subtitle}</div>}
      </span>
      {value !== undefined && <span className={styles.rowValue}>{value}</span>}
      {right}
      {chevron && (
        <span className={styles.rowChevron}>
          <ChevronRightIcon />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
