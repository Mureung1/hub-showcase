import type { KeyboardEvent } from 'react';
import { levelFor } from '../lib/congestion';
import { directionHours, directionUsageStatusLabel, isDirectionUsageReady, isUsageReady, usageStatusLabel } from '../lib/usage';
import type { Campus, DirectionKey, Stop } from '../types';
import styles from './StopMap.module.css';

interface StopMapProps {
  campus: Campus;
  selectedId: string;
  hour: number;
  direction?: DirectionKey;
  onSelect: (id: string) => void;
}

interface LabelOffset {
  x: number;
  y: number;
}

function viewportFor(campus: Campus): [number, number, number, number] | undefined {
  return campus.mapViewport?.bounds ?? campus.boundary?.bounds;
}

function clampMapPoint({ cx, cy }: { cx: number; cy: number }): { cx: number; cy: number } {
  return {
    cx: Math.min(376, Math.max(24, cx)),
    cy: Math.min(264, Math.max(24, cy)),
  };
}

function projectPoint(lon: number, lat: number, campus: Campus): { cx: number; cy: number } {
  const bounds = viewportFor(campus);
  if (!bounds) return { cx: 200, cy: 150 };
  const [south, north, west, east] = bounds;
  return {
    cx: 24 + ((lon - west) / (east - west || 1)) * 352,
    cy: 24 + ((north - lat) / (north - south || 1)) * 252,
  };
}

function mapPosition(stop: Stop, campus: Campus): { cx: number; cy: number } {
  if (stop.lat !== undefined && stop.lon !== undefined && viewportFor(campus)) return projectPoint(stop.lon, stop.lat, campus);
  if (stop.cx !== undefined && stop.cy !== undefined) return { cx: stop.cx, cy: stop.cy };
  return { cx: stop.cx ?? 200, cy: stop.cy ?? 150 };
}

function labelOffsetFor(index: number): LabelOffset {
  const offsets: LabelOffset[] = [
    { x: 0, y: 22 },
    { x: 0, y: -48 },
    { x: 86, y: -11 },
    { x: -86, y: -11 },
    { x: 72, y: 26 },
    { x: -72, y: 26 },
  ];
  return offsets[index % offsets.length];
}

function collisionIndex(position: { cx: number; cy: number }, previous: { cx: number; cy: number }[]): number {
  return previous.filter((item) => Math.abs(item.cx - position.cx) < 84 && Math.abs(item.cy - position.cy) < 48).length;
}

function Pin({ stop, campus, hour, direction, selected, labelOffset, onSelect }: { stop: Stop; campus: Campus; hour: number; direction?: DirectionKey; selected: boolean; labelOffset: LabelOffset; onSelect: (id: string) => void }) {
  const available = direction ? isDirectionUsageReady(stop, direction) : isUsageReady(stop);
  const hours = direction ? directionHours(stop, direction) : stop.hours;
  const value = available ? hours?.[hour] : undefined;
  const level = value === undefined ? undefined : levelFor(value);
  const color = level?.color ?? '#94a3b8';
  const width = Math.min(196, Math.max(58, stop.name.length * 11 + 18));
  const { cx, cy } = mapPosition(stop, campus);
  const safeCx = Math.min(376, Math.max(24, cx));
  const safeCy = Math.min(264, Math.max(24, cy));
  const labelCx = Math.min(392 - width / 2, Math.max(8 + width / 2, safeCx + labelOffset.x));
  const labelCy = Math.min(268, Math.max(8, safeCy + (selected && labelOffset.y > 0 ? labelOffset.y + 4 : labelOffset.y)));
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(stop.id); }
  };
  const status = direction ? directionUsageStatusLabel(stop, direction) : usageStatusLabel(stop);
  const directionLabel = direction ? campus.directionConfig?.directions[direction].label : undefined;
  const ariaLabel = available ? `${stop.name}, ${directionLabel ? `${directionLabel}, ` : ''}${hour}시 이용 집중도 ${value}점, ${level?.label}` : `${stop.name}, ${status}`;

  return (
    <g onClick={() => onSelect(stop.id)} onKeyDown={onKeyDown} className={styles.pin} role="button" tabIndex={0} aria-label={ariaLabel}>
      <g transform={`translate(${safeCx} ${safeCy})`}>
        <circle r={29} fill="transparent" />
        {selected && <circle r={23} fill={color} stroke={color} strokeWidth={2.5} opacity={0.2} className={styles.selectionHalo} />}
        <circle r={selected ? 17 : 13} fill={color} stroke="#fff" strokeWidth={3.5} />
        <circle r={4} fill="#fff" />
      </g>
      <g transform={`translate(${labelCx} ${labelCy})`} className={styles.label}>
        <rect x={-width / 2} y={0} width={width} height={22} rx={11} fill={selected ? color : '#fff'} stroke={selected ? color : '#d9e2eb'} />
        <text x={0} y={15} textAnchor="middle" fontSize={10.5} fontWeight={selected ? 800 : 700} fill={selected ? '#fff' : '#3d4651'}>{stop.name}</text>
      </g>
    </g>
  );
}

export function StopMap({ campus, selectedId, hour, direction, onSelect }: StopMapProps) {
  const positions = campus.stops.map((stop) => mapPosition(stop, campus));
  const routePositions = campus.roadRoute?.status === 'ready'
    ? campus.roadRoute.coordinates.map(([lon, lat]) => projectPoint(lon, lat, campus))
    : positions;
  const routePoints = routePositions
    .map((position) => {
      const { cx, cy } = clampMapPoint(position);
      return `${cx},${cy}`;
    })
    .join(' ');
  const pinData = campus.stops.map((stop, index) => {
    const selected = stop.id === selectedId;
    return { stop, selected, labelOffset: stop.labelOffset ?? labelOffsetFor(collisionIndex(positions[index], positions.slice(0, index))) };
  });
  const orderedPins = [...pinData].sort((a, b) => Number(a.selected) - Number(b.selected));

  return (
    <section className={styles.card} aria-labelledby="map-title">
      <div className={styles.header}>
        <div><div className={styles.eyebrow}>CAMPUS MAP</div><h2 id="map-title" className={styles.title}>정류장을 눌러 이용 흐름을 확인하세요</h2></div>
        <div className={styles.countBadge}>정류장 {campus.stops.length}곳</div>
      </div>
      <div className={styles.mapArea}>
        <svg viewBox="0 0 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className={styles.svg} aria-label={`${campus.name} 정류장 지도`}>
          {campus.mapImage ? <image href={campus.mapImage} x="0" y="0" width="400" height="300" preserveAspectRatio="none" /> : <>
            <rect x="8" y="8" width="384" height="284" rx="26" fill="#EDF6EE" />
            <rect x="30" y="196" width="150" height="80" rx="16" fill="#D8ECDA" /><rect x="60" y="86" width="72" height="52" rx="7" fill="#D3DEE8" /><rect x="152" y="66" width="60" height="70" rx="7" fill="#D3DEE8" /><rect x="250" y="104" width="86" height="60" rx="7" fill="#D3DEE8" /><rect x="126" y="150" width="92" height="48" rx="7" fill="#CBD8E4" />
            <path d="M20 250 H360" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M340 44 V270" stroke="#FBFDFC" strokeWidth="16" strokeLinecap="round" /><path d="M250 44 V250" stroke="#FBFDFC" strokeWidth="13" strokeLinecap="round" />
          </>}
          {positions.length > 1 && (
            <g className={styles.routeLayer} aria-hidden="true">
              <polyline points={routePoints} className={styles.routeShadow} />
              <polyline points={routePoints} className={styles.routeBase} />
              <polyline points={routePoints} className={styles.routeAccent} />
            </g>
          )}
          {orderedPins.map(({ stop, selected, labelOffset }) => <Pin key={stop.id} stop={stop} campus={campus} hour={hour} direction={direction} selected={selected} labelOffset={labelOffset} onSelect={onSelect} />)}
        </svg>
      </div>
      <div className={styles.legend} aria-label="이용 집중도 범례"><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#22C55E' }} />여유</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F5A524' }} />보통</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#F0453A' }} />혼잡</span><span className={styles.legendItem}><i className={styles.dot} style={{ background: '#94A3B8' }} />자료 없음</span></div>
      <div className={styles.sourceRow}><span>지도 © OpenStreetMap contributors</span>{campus.sourceFile && <a href={campus.sourceFile} target="_blank" rel="noreferrer">출처·라이선스</a>}</div>
    </section>
  );
}
