import { levelFor } from '../lib/congestion';
import { directionData, directionHours, directionUsageStatusLabel, formatUsagePeriod, isDirectionUsageReady, isUsageReady, usageStatusLabel } from '../lib/usage';
import type { DirectionKey, Stop } from '../types';
import styles from './DailyChart.module.css';

interface DailyChartProps { stop: Stop | undefined; hour: number; direction?: DirectionKey; directionLabel?: string; }

export function DailyChart({ stop, hour, direction, directionLabel }: DailyChartProps) {
  const badge = `${String(hour).padStart(2, '0')}:00`;
  const available = direction ? isDirectionUsageReady(stop, direction) : isUsageReady(stop);
  const data = direction ? directionData(stop, direction) : undefined;
  const hours = direction ? directionHours(stop, direction) : stop?.hours;
  const status = stop ? (direction ? directionUsageStatusLabel(stop, direction) : usageStatusLabel(stop)) : '정류장을 선택해 주세요';

  return (
    <section className={styles.card} aria-labelledby="daily-title">
      <div className={styles.header}><div className={styles.headerText}><div className={styles.eyebrow}>MONTHLY USAGE PATTERN</div><h2 id="daily-title" className={styles.title}>{stop ? stop.name : '정류장'}{directionLabel ? ` · ${directionLabel}` : ''}</h2></div><div className={styles.badge}>{badge} 선택</div></div>
      {available ? <>
        <div className={styles.chart} role="img" aria-label={`${stop.name} ${directionLabel ?? ''} 24시간 이용 집중도 막대 그래프`}>
          {hours?.map((value, chartHour) => {
            const current = chartHour === hour;
            const boarding = direction ? data?.usage.boardings[chartHour] ?? 0 : stop.usage?.boardings[chartHour] ?? 0;
            const alighting = direction ? data?.usage.alightings[chartHour] ?? 0 : stop.usage?.alightings[chartHour] ?? 0;
            return <div key={chartHour} className={styles.barColumn} title={`${chartHour}시: ${value}점, 승차 ${boarding}명, 하차 ${alighting}명`}><span className={styles.bar} style={{ height: `${Math.max(3, value)}%`, background: levelFor(value).color, boxShadow: current ? '0 0 0 2.5px #fff, 0 0 0 4.5px rgba(49,130,246,.55)' : 'none' }} /></div>;
          })}
        </div>
        <div className={styles.labels}>{hours?.map((_, chartHour) => <span key={chartHour} className={styles.label} data-current={chartHour === hour || undefined}>{chartHour % 3 === 0 ? chartHour : ''}</span>)}</div>
        <div className={styles.legend} aria-label="이용 집중도 범례"><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#22C55E' }} />여유</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F5A524' }} />보통</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F0453A' }} />혼잡</span></div>
        <p className={styles.method}>같은 캠퍼스 양방향의 {formatUsagePeriod(direction ? data?.usage.period : stop.usage?.period)} 시간대 이용량 P95를 100점으로 환산</p>
      </> : <div className={styles.empty} role="status"><strong>{direction ? '방향 자료 없음' : '이용량 자료 없음'}</strong><span>{status}</span></div>}
    </section>
  );
}
