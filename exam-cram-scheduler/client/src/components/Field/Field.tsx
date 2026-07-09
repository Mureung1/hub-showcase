import type { CSSProperties, ReactNode } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  style?: CSSProperties;
}

/** docs/디자인.md 5번 "입력 필드" — 라벨 + input/select/textarea 한 쌍 */
export function Field({ label, children, hint, style }: FieldProps) {
  return (
    <div className={styles.field} style={style}>
      <label className={styles.label}>{label}</label>
      {children}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
