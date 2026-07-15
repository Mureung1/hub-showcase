import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { levelFor } from '../lib/congestion';
import type { Stop } from '../types';
import styles from './CompareBars.module.css';

interface CompareBarsProps { stops: Stop[]; selectedId: string; hour: number; sample?: boolean; onSelect: (id: string) => void; onHour: (hour: number) => void; }

function hourFromPointer(event: ReactPointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 23);
}

export function CompareBars({ stops, selectedId, hour, sample = false, onSelect, onHour }: CompareBarsProps) {
  const [dragging, setDragging] = useState(false);
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;
  const pct = (hour / 23) * 100;
  const setFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => onHour(hourFromPointer(event));

  return (
    <section className={styles.card} aria-labelledby="compare-title">
      <div className={styles.header}><div><div className={styles.eyebrow}>{sample ? 'SAMPLE COMPARISON' : 'LIVE COMPARISON'}</div><h2 id="compare-title" className={styles.title}>{sample ? '샘플 시간대 정류장 비교' : '지금 어디가 덜 붐빌까?'}</h2></div><div className={styles.hourReadout}>{hourLabel}<br />{sample ? '샘플' : '기준'}</div></div>
      <div className={styles.rows}>
        {stops.map((stop) => {
          const value = stop.hours?.[hour] ?? 0;
          const level = levelFor(value);
          const selected = stop.id === selectedId;
          return <button key={stop.id} type="button" onClick={() => onSelect(stop.id)} className={styles.row} data-selected={selected || undefined} aria-pressed={selected}>
            <span className={styles.name}>{stop.name}</span><span className={styles.track}><span className={styles.fill} style={{ width: `${Math.max(4, value)}%`, background: level.color }} /></span><span className={styles.valueGroup}><strong className={styles.value} style={{ color: level.color }}>{value}</strong><span className={styles.chip} style={{ color: level.color, background: level.soft }}>{level.label}</span></span>
          </button>;
        })}
      </div>
      <div className={styles.scrubberSection}>
        <div className={styles.scrubberHeader}><span className={styles.scrubberLabel}>시간대 드래그</span><output className={styles.scrubberValue}>{hourLabel}</output></div>
        <div className={styles.scrubberTrackWrap} onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event); }} onPointerMove={(event) => { if (dragging) setFromPointer(event); }} onPointerUp={(event) => { setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); }} role="slider" tabIndex={0} aria-label="시간대 선택" aria-valuemin={0} aria-valuemax={23} aria-valuenow={hour} aria-valuetext={hourLabel} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onHour(Math.max(0, hour - 1)); if (event.key === 'ArrowRight') onHour(Math.min(23, hour + 1)); }}>
          <span className={styles.scrubberTrack} /><span className={styles.scrubberFill} style={{ width: `${pct}%`, transition: dragging ? 'none' : undefined }} /><span className={styles.scrubberThumb} style={{ left: `${pct}%`, transition: dragging ? 'none' : undefined }} />
        </div>
        <div className={styles.scrubberTicks}><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
      </div>
    </section>
  );
}
