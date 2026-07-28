import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Row.module.css';
import { ChevronRightIcon, PlusIcon, TrashIcon } from '../icons';

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
  /**
   * #40 — 있으면 로우 오른쪽 끝에 삭제(휴지통) 버튼을 붙인다. 이 버튼은 로우 본체(클릭 시
   * 열기) 버튼 "밖"에 나란히 놓는다 — 버튼 안에 버튼을 넣으면 안 되는(HTML 규칙) 문제를 피한다.
   */
  onDelete?: () => void;
  /** 삭제 버튼의 스크린리더용 설명. 기본 "삭제" */
  deleteLabel?: string;
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
  onDelete,
  deleteLabel,
}: RowProps) {
  // 삭제 버튼이 붙으면 본체가 공간을 다 먹지 않게 flex 아이템으로 만든다(rowInWrap)
  const className = [styles.row, isAdd && styles.isAdd, onDelete && styles.rowInWrap]
    .filter(Boolean)
    .join(' ');

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

  const main = href ? (
    <Link to={href} className={className}>
      {content}
    </Link>
  ) : onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );

  if (onDelete) {
    return (
      <div className={styles.rowWrap}>
        {main}
        <button
          type="button"
          className={styles.rowDelete}
          onClick={onDelete}
          aria-label={deleteLabel ?? '삭제'}
        >
          <TrashIcon />
        </button>
      </div>
    );
  }

  return main;
}
