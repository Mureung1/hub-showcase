import { useState, type CSSProperties, type ReactNode } from 'react';
import type { BusDataProvider } from '../data/provider';
import { campusPresentation, fallbackCampusPresentation, type CampusPresentation } from '../data/campus-presentation';
import { campusHasDirectionUsage, campusHasUsage, directionData, formatUsagePeriod, isDirectionUsageReady, isUsageReady } from '../lib/usage';
import type { Campus, DirectionKey } from '../types';
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
          <div className={styles.brandLabel}>CAMPUS FLOW · 정류장 이용 통계</div>
          <div className={styles.campusTitle}>{campus.name}</div>
        </div>
      </div>
      <div className={styles.statusWrap}>{actions}</div>
    </header>
  );
}

export function Dashboard({ provider, initialCampusId, onBack }: DashboardProps) {
  const campus = provider.campuses.find((campusOption) => campusOption.id === initialCampusId) ?? provider.campuses[0];
  const initialDirection: DirectionKey = campus?.directionConfig && !campusHasDirectionUsage(campus, 'a') && campusHasDirectionUsage(campus, 'c') ? 'c' : 'a';
  const firstReadyId = campus?.directionConfig
    ? campus.stops.find((stop) => isDirectionUsageReady(stop, initialDirection))?.id ?? campus.stops[0]?.id ?? ''
    : campus?.stops.find(isUsageReady)?.id ?? campus?.stops[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(firstReadyId);
  const [hour, setHour] = useState(currentHour());
  const [direction, setDirection] = useState<DirectionKey>(initialDirection);

  if (!campus) {
    return <main className={styles.card} aria-label="캠퍼스 정류장 데이터"><div className={styles.emptyState}><h1>표시할 캠퍼스가 없습니다</h1><p>{provider.notice}</p><button type="button" className={styles.backButton} onClick={onBack}>대학 목록으로</button></div></main>;
  }

  const presentation = campusPresentation[campus.id] ?? fallbackCampusPresentation;
  const themeStyle: ThemeStyle = { '--campus-color': presentation.primary };
  const selectedStop = campus.stops.find((stop) => stop.id === selectedId) ?? campus.stops[0];
  const activeDirection = campus.directionConfig ? direction : undefined;
  const activeDirectionLabel = activeDirection ? campus.directionConfig?.directions[activeDirection].label : undefined;
  const activeUsage = activeDirection ? directionData(selectedStop, activeDirection)?.usage : selectedStop?.usage;
  const hasUsage = campusHasUsage(campus);
  const hasAggregatedPlatforms = !campus.directionConfig && campus.stops.some((stop) => stop.usage?.aggregation === 'sum-exact-name-platforms');
  const isSupportedRegion = campus.stops.some((stop) => stop.usage?.status !== 'unsupported-region');
  const providerBadge = hasUsage ? provider.label : isSupportedRegion ? '정류장 매핑 필요' : '지도만 제공';
  const period = formatUsagePeriod(activeUsage?.period);
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  return (
    <main className={styles.card} style={themeStyle} aria-label={`${campus.name} 정류장 이용 집중도`}>
      <DetailHeader
        campus={campus}
        presentation={presentation}
        onBack={onBack}
        actions={<>
          <span className={hasUsage ? styles.modelBadge : styles.pendingBadge}>{providerBadge}</span>
          <div className={styles.hourBadge} aria-label={`선택 시간 ${hourLabel}`}><span className={styles.hourValue}>{hourLabel}</span><span className={styles.hourSuffix}>선택</span></div>
        </>}
      />
      <section className={styles.detailIntro}>
        <div className={styles.detailIntroText}>
          <span className={styles.detailKicker}>{presentation.location}</span>
          <h1>{presentation.shortName} 정류장 이용 흐름을<br />시간대별로 비교해요</h1>
          <p>{hasUsage ? `${period} ${campus.directionConfig ? '양방향 ' : hasAggregatedPlatforms ? '동일 이름 양방향 승강장 합산 ' : ''}승·하차량을 같은 캠퍼스 안에서 비교한 상대 점수입니다.` : '실제 정류장 위치를 확인할 수 있으며, 지원 지역 밖이거나 정류장 매핑이 필요한 경우 통계는 표시하지 않습니다.'}</p>
        </div>
        <span className={styles.dataTrust}>{hasUsage ? `AI 합성 통계 · ${period}` : '실제 지도 · OSM'}</span>
      </section>
      <div className={styles.grid}>
        <div className={styles.mapArea}><StopMap campus={campus} selectedId={selectedId} hour={hour} direction={activeDirection} onSelect={setSelectedId} /></div>
        <div className={styles.compareArea}><CompareBars stops={campus.stops} selectedId={selectedId} hour={hour} period={period} direction={activeDirection} directionConfig={campus.directionConfig} onSelect={setSelectedId} onHour={setHour} onDirection={campus.directionConfig ? setDirection : undefined} /></div>
        <div className={styles.dailyArea}><DailyChart stop={selectedStop} hour={hour} direction={activeDirection} directionLabel={activeDirectionLabel} /></div>
      </div>
      <p className={styles.notice}>{provider.notice} 지도·정류장 위치는 OpenStreetMap 자료를 사용합니다.</p>
    </main>
  );
}
