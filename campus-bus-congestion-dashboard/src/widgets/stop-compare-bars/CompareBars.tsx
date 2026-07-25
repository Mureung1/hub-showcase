import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { levelFor } from '../../entities/usage/congestion';
import { directionHours, directionUsageStatusLabel, isDirectionUsageReady, isUsageReady, usageStatusLabel } from '../../entities/usage/usage';
import type { CampusDirections, DirectionKey, Stop } from '../../entities/campus/types';
import styles from './CompareBars.module.css';

interface CompareBarsProps {
  stops: Stop[];
  selectedId: string;
  hour: number;
  period: string;
  direction?: DirectionKey;
  directionConfig?: CampusDirections;
  onSelect: (id: string) => void;
  onHour: (hour: number) => void;
  onDirection?: (direction: DirectionKey) => void;
}

function hourFromPointer(event: ReactPointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 23);
}

export function CompareBars({ stops, selectedId, hour, period, direction, directionConfig, onSelect, onHour, onDirection }: CompareBarsProps) {
  const [dragging, setDragging] = useState(false);
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;
  const pct = (hour / 23) * 100;
  const setFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => onHour(hourFromPointer(event));
  const routeNames = directionConfig?.route.map((stopId) => stops.find((stop) => stop.id === stopId)?.name ?? stopId) ?? [];

  return (
    <section className={styles.card} aria-labelledby="compare-title">
      <div className={styles.header}>
        <div><div className={styles.eyebrow}>MONTHLY USAGE COMPARISON</div><h2 id="compare-title" className={styles.title}>시간대별 정류장 비교</h2></div>
        <div className={styles.headerActions}>
          {directionConfig && direction && onDirection && <div className={styles.directionToggle} role="group" aria-label="진행 방향 선택">
            {(['a', 'c'] as DirectionKey[]).map((key) => {
              const selected = direction === key;
              const orderedRoute = key === 'a' ? [...routeNames].reverse() : routeNames;
              return <span key={key} className={styles.directionOption}>
                <button type="button" className={styles.directionButton} data-selected={selected || undefined} aria-pressed={selected} onClick={() => onDirection(key)}>{directionConfig.directions[key].label}</button>
                <span className={styles.directionTooltip} role="tooltip">{orderedRoute.join(' → ')}</span>
              </span>;
            })}
          </div>}
          <div className={styles.hourReadout}>{hourLabel}<br />{period} 기준</div>
        </div>
      </div>
      <div className={styles.rows}>
        {stops.map((stop) => {
          const available = direction ? isDirectionUsageReady(stop, direction) : isUsageReady(stop);
          const hours = direction ? directionHours(stop, direction) : stop.hours;
          const value = available ? hours?.[hour] ?? 0 : undefined;
          const level = value === undefined ? undefined : levelFor(value);
          const selected = stop.id === selectedId;
          const status = direction ? directionUsageStatusLabel(stop, direction) : usageStatusLabel(stop);
          const directionLabel = direction && directionConfig ? `${directionConfig.directions[direction].label}, ` : '';
          return <button key={stop.id} type="button" onClick={() => onSelect(stop.id)} className={styles.row} data-selected={selected || undefined} data-unavailable={!available || undefined} aria-pressed={selected} aria-label={`${stop.name}, ${directionLabel}${available ? `${hourLabel} 이용 집중도 ${value}점` : status}`}>
            <span className={styles.name}>{stop.name}</span>
            <span className={styles.track}>{available && <span className={styles.fill} style={{ width: `${Math.max(4, value ?? 0)}%`, background: level?.color }} />}</span>
            {available && level ? <span className={styles.valueGroup}><strong className={styles.value} style={{ color: level.color }}>{value}<small>점</small></strong><span className={styles.chip} style={{ color: level.color, background: level.soft }}>{level.label}</span></span> : <span className={styles.unavailable}>{status}</span>}
          </button>;
        })}
      </div>
      <div className={styles.scrubberSection}>
        <div className={styles.scrubberHeader}><span className={styles.scrubberLabel}>시간대 선택</span><output className={styles.scrubberValue}>{hourLabel}</output></div>
        <div className={styles.scrubberTrackWrap} onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event); }} onPointerMove={(event) => { if (dragging) setFromPointer(event); }} onPointerUp={(event) => { setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); }} role="slider" tabIndex={0} aria-label="시간대 선택" aria-valuemin={0} aria-valuemax={23} aria-valuenow={hour} aria-valuetext={hourLabel} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onHour(Math.max(0, hour - 1)); if (event.key === 'ArrowRight') onHour(Math.min(23, hour + 1)); }}>
          <span className={styles.scrubberTrack} /><span className={styles.scrubberFill} style={{ width: `${pct}%`, transition: dragging ? 'none' : undefined }} /><span className={styles.scrubberThumb} style={{ left: `${pct}%`, transition: dragging ? 'none' : undefined }} />
        </div>
        <div className={styles.scrubberTicks}><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
      </div>
    </section>
  );
}
