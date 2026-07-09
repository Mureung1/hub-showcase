import styles from './Segmented.module.css';

interface SegmentedProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

/** docs/디자인.md 5번 "세그먼트 컨트롤" — 2~3개 중 하나를 고르는 탭형 버튼 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className={styles.segmented}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? styles.active : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
