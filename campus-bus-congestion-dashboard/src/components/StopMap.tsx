import type { KeyboardEvent } from 'react';
import { levelFor } from '../lib/congestion';
import type { Campus, Stop } from '../types';
import styles from './StopMap.module.css';

interface StopMapProps {
  campus: Campus;
  selectedId: string;
  hour: number;
  pending?: boolean;
  sample?: boolean;
  onSelect: (id: string) => void;
}

function mapPosition(stop: Stop, campus: Campus): { cx: number; cy: number } {
  if (stop.lat === undefined || stop.lon === undefined || !campus.boundary) return { cx: stop.cx ?? 200, cy: stop.cy ?? 150 };
  const [south, north, west, east] = campus.boundary.bounds;
  const lats = [south, north, ...campus.stops.flatMap((item) => item.lat === undefined ? [] : [item.lat])];
  const lons = [west, east, ...campus.stops.flatMap((item) => item.lon === undefined ? [] : [item.lon])];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    cx: 24 + ((stop.lon - minLon) / (maxLon - minLon || 1)) * 352,
    cy: 24 + ((maxLat - stop.lat) / (maxLat - minLat || 1)) * 252,
  };
}

function Pin({ stop, campus, hour, selected, pending, sample, onSelect }: { stop: Stop; campus: Campus; hour: number; selected: boolean; pending: boolean; sample: boolean; onSelect: (id: string) => void }) {
  const value = stop.hours?.[hour];
  const level = value === undefined ? undefined : levelFor(value);
  const color = pending ? '#3182F6' : level?.color ?? '#3182F6';
  const width = Math.min(196, Math.max(58, stop.name.length * 11 + 18));
  const { cx, cy } = mapPosition(stop, campus);
  const safeCx = Math.min(392 - width / 2, Math.max(8 + width / 2, cx));
  const safeCy = Math.min(248, Math.max(30, cy));
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(stop.id); }
  };
  const ariaLabel = pending ? `${stop.name}, 실제 버스정류장` : `${stop.name}, ${sample ? '샘플 ' : ''}혼잡도 ${value}, ${level?.label}`;

  return (
    <g transform={`translate(${safeCx} ${safeCy})`} onClick={() => onSelect(stop.id)} onKeyDown={onKeyDown} className={styles.pin} role="button" tabIndex={0} aria-label={ariaLabel}>
      <circle r={29} fill="transparent" />
      {selected && <circle r={23} fill={color} stroke={color} strokeWidth={2.5} opacity={0.2} className={styles.selectionHalo} />}
      <circle r={selected ? 17 : 13} fill={color} stroke="#fff" strokeWidth={3.5} />
      <circle r={4} fill="#fff" />
      <g transform={`translate(0 ${selected ? 26 : 22})`}>
        <rect x={-width / 2} y={0} width={width} height={22} rx={11} fill={selected ? color : '#fff'} stroke={selected ? color : '#d9e2eb'} />
        <text x={0} y={15} textAnchor="middle" fontSize={10.5} fontWeight={selected ? 800 : 700} fill={selected ? '#fff' : '#3d4651'}>{stop.name}</text>
      </g>
    </g>
  );
}

export function StopMap({ campus, selectedId, hour, pending = false, sample = false, onSelect }: StopMapProps) {
  return (
    <section className={styles.card} aria-labelledby="map-title">
      <div className={styles.header}>
        <div><div className={styles.eyebrow}>CAMPUS MAP</div><h2 id="map-title" className={styles.title}>{pending ? '실제 접근 정류장을 선택하세요' : '정류장을 눌러 선택하세요'}</h2></div>
        <div className={styles.countBadge}>정류장 {campus.stops.length}곳</div>
      </div>
      <div className={styles.mapArea}>
        <svg viewBox="0 0 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className={styles.svg} aria-label={`${campus.name} 정류장 지도`}>
          {campus.mapImage ? <image href={campus.mapImage} x="0" y="0" width="400" height="300" preserveAspectRatio="none" /> : <>
            <rect x="8" y="8" width="384" height="284" rx="26" fill="#EDF6EE" />
            <rect x="30" y="196" width="150" height="80" rx="16" fill="#D8ECDA" /><rect x="60" y="86" width="72" height="52" rx="7" fill="#D3DEE8" /><rect x="152" y="66" width="60" height="70" rx="7" fill="#D3DEE8" /><rect x="250" y="104" width="86" height="60" rx="7" fill="#D3DEE8" /><rect x="126" y="150" width="92" height="48" rx="7" fill="#CBD8E4" />
            <path d="M20 250 H360" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M340 44 V270" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M250 44 V250" stroke="#FBFDFC" strokeWidth="13" strokeLinecap="round" />
          </>}
          {campus.stops.map((stop) => <Pin key={stop.id} stop={stop} campus={campus} hour={hour} pending={pending} sample={sample} selected={stop.id === selectedId} onSelect={onSelect} />)}
        </svg>
      </div>
      {pending ? <div className={styles.sourceRow}><span>데이터 © OpenStreetMap contributors</span>{campus.sourceFile && <a href={campus.sourceFile} target="_blank" rel="noreferrer">출처·라이선스</a>}</div> : <div className={styles.legend} aria-label="혼잡도 범례"><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#22C55E' }} />여유</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F5A524' }} />보통</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F0453A' }} />혼잡</span></div>}
    </section>
  );
}
