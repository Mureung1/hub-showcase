import { useState } from 'react';
import { CAMPUSES, CAMPUS_BY_ID, DEFAULT_CAMPUS_ID } from '../data/campuses';
import { CompareBars } from './CompareBars';
import { DailyChart } from './DailyChart';
import { StopMap } from './StopMap';
import styles from './Dashboard.module.css';

function currentHour(): number {
  const hour = new Date().getHours();
  return Number.isNaN(hour) ? 9 : hour;
}

export function Dashboard() {
  const [campusId, setCampusId] = useState(DEFAULT_CAMPUS_ID);
  const [selectedId, setSelectedId] = useState(CAMPUS_BY_ID[DEFAULT_CAMPUS_ID].stops[0].id);
  const [hour, setHour] = useState(currentHour());

  const campus = CAMPUS_BY_ID[campusId] ?? CAMPUS_BY_ID[DEFAULT_CAMPUS_ID];
  const selectedStop = campus.stops.find((stop) => stop.id === selectedId) ?? campus.stops[0];
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  const handleCampusChange = (id: string) => {
    const nextCampus = CAMPUS_BY_ID[id];
    if (!nextCampus) return;
    setCampusId(id);
    setSelectedId(nextCampus.stops[0].id);
  };

  return (
    <main className={styles.card} aria-label="캠퍼스 버스 혼잡도 대시보드">
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="15" rx="4" fill="#fff" />
              <rect x="6" y="6" width="12" height="5" rx="1.5" fill="#3182F6" />
              <circle cx="8" cy="15" r="1.6" fill="#3182F6" />
              <circle cx="16" cy="15" r="1.6" fill="#3182F6" />
              <rect x="5" y="18" width="3" height="3" rx="1" fill="#fff" />
              <rect x="16" y="18" width="3" height="3" rx="1" fill="#fff" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandLabel}>CAMPUS FLOW · 버스 혼잡도</div>
            <div className={styles.campusPicker}>
              <label className={styles.srOnly} htmlFor="campus-select">캠퍼스 선택</label>
              <select id="campus-select" value={campusId} onChange={(event) => handleCampusChange(event.target.value)} className={styles.campusSelect}>
                {CAMPUSES.map((campusOption) => <option key={campusOption.id} value={campusOption.id}>{campusOption.name}</option>)}
                <option value="soon" disabled>+ 전국 캠퍼스 확장 예정</option>
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" className={styles.campusChevron} aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="#3182F6" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className={styles.statusWrap}>
          <span className={styles.modelBadge}>예측 모델</span>
          <div className={styles.hourBadge} aria-label={`선택 시간 ${hourLabel}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#3182F6" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="#3182F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.hourValue}>{hourLabel}</span><span className={styles.hourSuffix}>기준</span>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mapArea}><StopMap stops={campus.stops} selectedId={selectedId} hour={hour} onSelect={setSelectedId} /></div>
        <div className={styles.compareArea}><CompareBars stops={campus.stops} selectedId={selectedId} hour={hour} onSelect={setSelectedId} onHour={setHour} /></div>
        <div className={styles.dailyArea}><DailyChart stop={selectedStop} hour={hour} /></div>
      </div>
      <p className={styles.notice}>수업 시간과 이동량 패턴을 바탕으로 계산한 혼잡도 예측값입니다.</p>
    </main>
  );
}
