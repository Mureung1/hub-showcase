import type { KeyboardEvent } from 'react';
import { levelFor } from '../lib/congestion';
import type { Stop } from '../types';
import styles from './StopMap.module.css';

interface StopMapProps { stops: Stop[]; selectedId: string; hour: number; onSelect: (id: string) => void; }

function Pin({ stop, hour, selected, onSelect }: { stop: Stop; hour: number; selected: boolean; onSelect: (id: string) => void }) {
  const value = stop.hours[hour] ?? 0;
  const level = levelFor(value);
  const width = Math.max(48, stop.name.length * 13 + 16);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(stop.id); }
  };

  return (
    <g transform={`translate(${stop.cx} ${stop.cy})`} onClick={() => onSelect(stop.id)} onKeyDown={onKeyDown} className={styles.pin} role="button" tabIndex={0} aria-label={`${stop.name}, 혼잡도 ${value}, ${level.label}`}>
      <circle r={28} fill="transparent" />
      {selected && <circle r={16} fill={level.color} opacity={0.5} className={styles.pulse} />}
      <circle r={selected ? 17 : 13} fill={level.color} stroke="#fff" strokeWidth={3.5} />
      <circle r={4} fill="#fff" />
      <g transform={`translate(0 ${selected ? 26 : 22})`}>
        <rect x={-width / 2} y={0} width={width} height={20} rx={10} fill={selected ? level.color : '#fff'} />
        <text x={0} y={14} textAnchor="middle" fontSize={11.5} fontWeight={selected ? 800 : 700} fill={selected ? '#fff' : '#3d4651'}>{stop.name}</text>
      </g>
    </g>
  );
}

export function StopMap({ stops, selectedId, hour, onSelect }: StopMapProps) {
  return (
    <section className={styles.card} aria-labelledby="map-title">
      <div className={styles.header}>
        <div><div className={styles.eyebrow}>CAMPUS MAP</div><h2 id="map-title" className={styles.title}>정류장을 눌러 선택하세요</h2></div>
        <div className={styles.countBadge}>정류장 {stops.length}곳</div>
      </div>
      <div className={styles.mapArea}>
        <svg viewBox="0 0 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className={styles.svg} aria-label="캠퍼스 정류장 지도">
          <rect x="8" y="8" width="384" height="284" rx="26" fill="#EDF6EE" />
          <rect x="30" y="196" width="150" height="80" rx="16" fill="#D8ECDA" /><rect x="60" y="86" width="72" height="52" rx="7" fill="#D3DEE8" /><rect x="152" y="66" width="60" height="70" rx="7" fill="#D3DEE8" /><rect x="250" y="104" width="86" height="60" rx="7" fill="#D3DEE8" /><rect x="126" y="150" width="92" height="48" rx="7" fill="#CBD8E4" />
          <path d="M20 250 H360" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M340 44 V270" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M250 44 V250" stroke="#FBFDFC" strokeWidth="13" strokeLinecap="round" />
          <path d="M20 250 H360" stroke="#DDE6DE" strokeWidth="1.5" strokeDasharray="5 7" /><path d="M340 44 V270" stroke="#DDE6DE" strokeWidth="1.5" strokeDasharray="5 7" />
          {stops.map((stop) => <Pin key={stop.id} stop={stop} hour={hour} selected={stop.id === selectedId} onSelect={onSelect} />)}
        </svg>
      </div>
      <div className={styles.legend} aria-label="혼잡도 범례"><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#22C55E' }} />여유</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F5A524' }} />보통</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F0453A' }} />혼잡</span></div>
    </section>
  );
}
