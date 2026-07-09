import styles from './Slider.module.css';

interface SliderProps {
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** 시각 슬라이더처럼 원값을 그대로 안 보여주고 가공해서 보여줘야 할 때 사용 (예: 23.5 → "23:30") */
  formatValue?: (value: number) => string;
  bounds: [string, string];
  onChange: (value: number) => void;
}

/**
 * docs/디자인.md 5번 "슬라이더" — script.js의 data-range-out 실시간 값 표시 동작을
 * React state로 재구현한 버전.
 */
export function Slider({ name, value, min, max, step = 1, suffix = '', formatValue, bounds, onChange }: SliderProps) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHead}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>{formatValue ? formatValue(value) : `${value}${suffix}`}</span>
      </div>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className={styles.rangeBounds}>
        <span>{bounds[0]}</span>
        <span>{bounds[1]}</span>
      </div>
    </div>
  );
}
