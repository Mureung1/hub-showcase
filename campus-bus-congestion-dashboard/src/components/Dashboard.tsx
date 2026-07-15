import { useState, type CSSProperties, type ReactNode } from 'react';
import type { BusDataProvider } from '../data/provider';
import { campusPresentation, fallbackCampusPresentation, type CampusPresentation } from '../data/campus-presentation';
import type { Campus } from '../types';
import { CompareBars } from './CompareBars';
import { DailyChart } from './DailyChart';
import { StopMap } from './StopMap';
import styles from './Dashboard.module.css';

function currentHour(): number {
  const hour = new Date().getHours();
  return Number.isNaN(hour) ? 9 : hour;
}
interface DashboardProps {
  provider: BusDataProvider;
  initialCampusId: string;
  onBack: () => void;
}

type ThemeStyle = CSSProperties & { '--campus-color': string };

function DetailHeader({ campus, presentation, onBack, actions }: { campus: Campus; presentation: CampusPresentation; onBack: () => void; actions: ReactNode }) {
  return (
    <header className={styles.detailHeader}>
      <button type="button" className={styles.backButton} onClick={onBack}><span aria-hidden="true">←</span> 다른 대학 보기</button>
      <div className={styles.campusIdentity}>
        <span className={styles.campusSwatch} aria-hidden="true">{presentation.shortName.slice(0, 1)}</span>
        <div>
          <div className={styles.brandLabel}>CAMPUS FLOW · 정류장 지도</div>
          <div className={styles.campusTitle}>{campus.name}</div>
        </div>
      </div>
      <div className={styles.statusWrap}>{actions}</div>
    </header>
  );
}

export function Dashboard({ provider, initialCampusId, onBack }: DashboardProps) {
  const campus = provider.campuses.find((campusOption) => campusOption.id === initialCampusId) ?? provider.campuses[0];
  const [selectedId, setSelectedId] = useState(campus?.stops[0]?.id ?? '');
  const [hour, setHour] = useState(currentHour());
  const [showSample, setShowSample] = useState(true);

  if (!campus) {
    return <main className={styles.card} aria-label="캠퍼스 버스 데이터 공통 기준"><div className={styles.emptyState}><span className={styles.modelBadge}>공통 기준</span><h1>배포 프로필을 선택하세요</h1><p>{provider.notice}</p><button type="button" className={styles.backButton} onClick={onBack}>대학 목록으로</button></div></main>;
  }

  const presentation = campusPresentation[campus.id] ?? fallbackCampusPresentation;
  const themeStyle: ThemeStyle = { '--campus-color': presentation.primary };
  const selectedStop = campus.stops.find((stop) => stop.id === selectedId) ?? campus.stops[0];
  const hasSampleData = campus.stops.every((stop) => stop.hours?.length === 24);
  const sampleMode = provider.status === 'pending' && showSample && hasSampleData;
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  if (provider.status === 'pending' && !sampleMode) {
    return (
      <main className={styles.card} style={themeStyle} aria-label="전국 거점대 실제 정류장 지도">
        <DetailHeader campus={campus} presentation={presentation} onBack={onBack} actions={<><span className={styles.pendingBadge}>API 미연결</span>{hasSampleData && <button type="button" className={styles.previewToggle} onClick={() => setShowSample(true)}>샘플 데이터 보기</button>}</>} />
        <section className={styles.detailIntro}>
          <div className={styles.detailIntroText}><span className={styles.detailKicker}>{presentation.location}</span><h1>{presentation.shortName} 정류장을<br />지도에서 확인해요</h1><p>실제 캠퍼스 경계와 주요 접근 정류장 3곳을 표시하고 있어요.</p></div>
          <span className={styles.dataTrust}>실제 지도 · OSM</span>
        </section>
        <div className={styles.pendingGrid}>
          <div className={styles.pendingMapArea}><StopMap campus={campus} selectedId={selectedId} hour={hour} pending onSelect={setSelectedId} /></div>
          <section className={styles.pendingPanel} aria-live="polite">
            <span className={styles.pendingPanelEyebrow}>선택한 실제 정류장</span>
            <h2>{selectedStop?.name}</h2>
            <p>실시간 혼잡도 데이터<br />연동 준비 중</p>
            <span className={styles.pendingPanelMeta}>샘플 데이터 보기에서 정류장별 출력 형태와 24시간 그래프를 미리 볼 수 있어요.</span>
          </section>
        </div>
        <p className={styles.notice}>{provider.notice}</p>
      </main>
    );
  }

  return (
    <main className={styles.card} style={themeStyle} aria-label={sampleMode ? '전국 거점대 샘플 혼잡도 미리보기' : '캠퍼스 버스 혼잡도 대시보드'}>
      <DetailHeader campus={campus} presentation={presentation} onBack={onBack} actions={<><span className={sampleMode ? styles.sampleBadge : styles.modelBadge}>{sampleMode ? '샘플 데이터' : provider.label}</span>{sampleMode && <button type="button" className={styles.previewToggle} onClick={() => setShowSample(false)}>실제 지도만 보기</button>}<div className={styles.hourBadge} aria-label={`${sampleMode ? '샘플 ' : ''}선택 시간 ${hourLabel}`}><span className={styles.hourValue}>{hourLabel}</span><span className={styles.hourSuffix}>{sampleMode ? '샘플' : '기준'}</span></div></>} />
      <section className={styles.detailIntro}>
        <div className={styles.detailIntroText}><span className={styles.detailKicker}>{presentation.location}</span><h1>{presentation.shortName} 정류장을<br />한눈에 비교해요</h1><p>정류장을 선택하고 시간대를 움직여 화면에 표시되는 정보를 확인해 보세요.</p></div>
        <span className={styles.dataTrust}>화면 확인용 샘플</span>
      </section>
      <div className={styles.grid}>
        <div className={styles.mapArea}><StopMap campus={campus} selectedId={selectedId} hour={hour} sample={sampleMode} onSelect={setSelectedId} /></div>
        <div className={styles.compareArea}><CompareBars stops={campus.stops} selectedId={selectedId} hour={hour} sample={sampleMode} onSelect={setSelectedId} onHour={setHour} /></div>
        <div className={styles.dailyArea}><DailyChart stop={selectedStop} hour={hour} sample={sampleMode} /></div>
      </div>
      <p className={sampleMode ? styles.sampleNotice : styles.notice}>{sampleMode ? '화면 확인용 샘플 데이터입니다. 실제 혼잡도·도착 정보가 아니며 운영 판단에 사용할 수 없습니다.' : provider.notice}</p>
    </main>
  );
}
