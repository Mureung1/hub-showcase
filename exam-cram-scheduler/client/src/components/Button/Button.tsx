import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'sm';
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

/** docs/디자인.md 5번 "버튼" — to가 있으면 라우터 링크, 없으면 버튼 */
export function Button({ children, variant = 'primary', size = 'default', to, onClick, type = 'button' }: ButtonProps) {
  const className = [
    styles.btn,
    variant === 'primary' ? styles.primary : styles.secondary,
    size === 'sm' ? styles.sm : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={className} onClick={onClick}>
      {children}
    </button>
  );
}
