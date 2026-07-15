import { levelFor } from '../lib/congestion';
import type { Stop } from '../types';
import styles from './DailyChart.module.css';

interface DailyChartProps { stop: Stop | undefined; hour: number; sample?: boolean; }

export function DailyChart({ stop, hour, sample = false }: DailyChartProps) {
  const hours = stop?.hours ?? new Array(24).fill(0);
  const badge = `${String(hour).padStart(2, '0')}:00`;

  return (
    <section className={styles.card} aria-labelledby="daily-title">
      <div className={styles.header}><div className={styles.headerText}><div className={styles.eyebrow}>{sample ? 'SAMPLE DAILY PATTERN' : 'DAILY PATTERN'}</div><h2 id="daily-title" className={styles.title}>{stop ? stop.name : '정류장'} {sample ? '샘플 혼잡도' : '혼잡도'}</h2></div><div className={styles.badge}>{sample ? '샘플' : '현재'} {badge} 기준</div></div>
      <div className={styles.chart} role="img" aria-label={`${stop?.name ?? '선택한 정류장'}의 24시간 ${sample ? '샘플 ' : ''}혼잡도 막대 그래프`}>
        {hours.map((value, chartHour) => {
          const current = chartHour === hour;
          return <div key={chartHour} className={styles.barColumn} title={`${chartHour}시: ${value}`}><span className={styles.bar} style={{ height: `${Math.max(3, value)}%`, background: levelFor(value).color, boxShadow: current ? '0 0 0 2.5px #fff, 0 0 0 4.5px rgba(49,130,246,.55)' : 'none' }} /></div>;
        })}
      </div>
      <div className={styles.labels}>{hours.map((_, chartHour) => <span key={chartHour} className={styles.label} data-current={chartHour === hour || undefined}>{chartHour % 3 === 0 ? chartHour : ''}</span>)}</div>
      <div className={styles.legend} aria-label="혼잡도 범례"><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#22C55E' }} />여유</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F5A524' }} />보통</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F0453A' }} />혼잡</span></div>
    </section>
  );
}
