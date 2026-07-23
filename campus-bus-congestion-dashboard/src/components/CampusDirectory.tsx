import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Campus, DirectionKey } from '../types';
import { campusPresentation, fallbackCampusPresentation } from '../data/campus-presentation';
import { campusHasUsage, formatUsagePeriod } from '../lib/usage';
import { levelFor } from '../lib/congestion';
import styles from './CampusDirectory.module.css';

interface CampusDirectoryProps {
  campuses: Campus[];
  onSelect: (campusId: string) => void;
}

type ThemeStyle = CSSProperties & { '--campus-color': string };
type MarkStyle = CSSProperties & {
  '--mark-x'?: string;
  '--mark-y'?: string;
  '--mark-scale'?: number;
};
type ClockStyle = CSSProperties & {
  '--hour-angle': string;
  '--minute-angle': string;
  '--second-angle': string;
};
type RecommendationStyle = CSSProperties & {
  '--recommend-color': string;
  '--recommend-bg': string;
};

interface DirectionRecommendation {
  direction: DirectionKey;
  label: string;
  stopName?: string;
  score?: number;
  level?: ReturnType<typeof levelFor>;
}

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function directionRecommendations(campus: Campus, hour: number): DirectionRecommendation[] {
  const config = campus.directionConfig;
  if (!config) return [];

  return (['a', 'c'] as DirectionKey[]).map((direction) => {
    const candidates = campus.stops
      .map((stop, index) => {
        const usage = stop.directions?.[direction]?.usage;
        const score = usage?.status === 'ready' && usage.hours?.length === 24 ? usage.hours[hour] : undefined;
        return { stop, index, score };
      })
      .filter((candidate): candidate is { stop: Campus['stops'][number]; index: number; score: number } => Number.isFinite(candidate.score))
      .sort((left, right) => left.score - right.score || left.index - right.index);
    const best = candidates[0];
    const level = best ? levelFor(best.score) : undefined;

    return {
      direction,
      label: config.directions[direction].label,
      stopName: best?.stop.name,
      score: best?.score,
      level,
    };
  });
}

export function CampusDirectory({ campuses, onSelect }: CampusDirectoryProps) {
  const [now, setNow] = useState(() => new Date());
  const stopCount = campuses.reduce((total, campus) => total + campus.stops.length, 0);
  const period = formatUsagePeriod(campuses.flatMap((campus) => campus.stops).find((stop) => stop.usage)?.usage?.period);
  const readyCampusCount = campuses.filter(campusHasUsage).length;
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const timeLabel = `${padTime(hour)}:${padTime(minute)}`;
  const clockStyle: ClockStyle = {
    '--hour-angle': `${((hour % 12) + minute / 60) * 30}deg`,
    '--minute-angle': `${(minute + second / 60) * 6}deg`,
    '--second-angle': `${second * 6}deg`,
  };
  const recommendationsByCampus = useMemo(() => Object.fromEntries(
    campuses.map((campus) => [campus.id, directionRecommendations(campus, hour)]),
  ), [campuses, hour]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.shell}>
      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="Campus Flow 처음으로">
          <span className={styles.brandMark} aria-hidden="true">CF</span>
          <span><strong>Campus Flow</strong><small>전국 거점대 정류장 지도</small></span>
        </a>
        <span className={styles.status} data-ready={readyCampusCount > 0 || undefined}><i aria-hidden="true" /> {readyCampusCount > 0 ? `${period} 공공데이터 기준` : '공공데이터 정류장 매핑 준비'}</span>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>전국 거점대 캠퍼스·정류장 지도</span>
          <h1>우리 학교 가는 길,<br /><em>정류장부터 한눈에</em></h1>
          <p>전국 {campuses.length}개 거점국립대의 실제 캠퍼스 경계와 주요 접근 정류장 {stopCount}곳을 모았어요. 학교를 선택해 정류장 위치와 이동 정보를 확인해 보세요.</p>
          <div className={styles.heroFacts} aria-label="서비스 제공 범위">
            <span><strong>{campuses.length}</strong>개 대학</span>
            <span><strong>{stopCount}</strong>개 정류장</span>
            <span><strong>{readyCampusCount}</strong>개 지역 통계 대상</span>
            <span><strong>OSM</strong> 실제 지도</span>
          </div>
        </div>
        <div className={styles.heroClockPanel} aria-label={`현재 시각 ${hour}시 ${minute}분`}>
          <div className={styles.clockFace} style={clockStyle} aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.clockTick} style={{ transform: `rotate(${index * 30}deg)` }} />)}
            <i className={styles.clockHandHour} />
            <i className={styles.clockHandMinute} />
            <i className={styles.clockHandSecond} />
            <b />
          </div>
          <strong>{timeLabel}</strong>
          <span>현재 시각대 기준</span>
        </div>
      </section>

      <section className={styles.directory} aria-labelledby="directory-title">
        <div className={styles.sectionHeading}>
          <div><span>CHOOSE YOUR CAMPUS</span><h2 id="directory-title">내 학교를 선택해 주세요</h2></div>
          <p>학교 카드를 누르면 주요 정류장 위치를 바로 볼 수 있어요.</p>
        </div>
        <div className={styles.grid}>
          {campuses.map((campus, index) => {
            const presentation = campusPresentation[campus.id] ?? fallbackCampusPresentation;
            const themeStyle: ThemeStyle = { '--campus-color': presentation.primary };
            const markPreviewClassName = [
              styles.markPreview,
              presentation.markSurface === 'brand'
                ? styles.markPreviewBrand
                : presentation.markSurface === 'blend'
                  ? styles.markPreviewBlend
                  : '',
            ].filter(Boolean).join(' ');
            const markImageClassName = presentation.markCrop === 'round-symbol'
              ? styles.markCropRound
              : presentation.markCrop === 'wide-symbol'
                ? styles.markCropWide
                : presentation.markCrop === 'compact-symbol'
                  ? styles.markCropCompact
                : undefined;
            const markStyle: MarkStyle = {
              '--mark-x': presentation.markOffset?.x ?? '0px',
              '--mark-y': presentation.markOffset?.y ?? '0px',
              '--mark-scale': presentation.markOffset?.scale ?? 1,
            };
            const hasUsage = campusHasUsage(campus);
            const supported = campus.stops.some((stop) => stop.usage?.status !== 'unsupported-region');
            const availability = hasUsage ? '통계 제공' : supported ? '매핑 필요' : '지도만 제공';
            const recommendations = recommendationsByCampus[campus.id] ?? [];
            return (
              <button key={campus.id} type="button" className={styles.campusCard} style={themeStyle} onClick={() => onSelect(campus.id)} aria-label={`${campus.name} 정류장 지도 보기`}>
                <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span className={markPreviewClassName} aria-hidden="true">
                  {presentation.markImage ? (
                    <img
                      className={markImageClassName}
                      src={presentation.markImage}
                      alt=""
                      style={markStyle}
                    />
                  ) : (
                    <span className={styles.markFallback}>{presentation.shortName}</span>
                  )}
                </span>
                <span className={styles.cardBody}>
                  <small>{presentation.location}</small>
                  <strong>{presentation.shortName}</strong>
                  <span className={styles.cardStatusLine}>
                    <span className={styles.availability} data-ready={hasUsage || undefined} data-supported={supported || undefined}>{availability}</span>
                    {recommendations.length > 0 && <span className={styles.recommendationTitle}>추천 정류장</span>}
                  </span>
                  {recommendations.length > 0 && (
                    <span className={styles.recommendations} aria-label={`${presentation.shortName} 현재 시간대 방향별 저혼잡 정류장`}>
                      {recommendations.map((recommendation) => {
                        const recommendationStyle: RecommendationStyle = {
                          '--recommend-color': recommendation.level?.color ?? '#7b8494',
                          '--recommend-bg': recommendation.level?.soft ?? '#f1f3f6',
                        };
                        return (
                          <span key={recommendation.direction} className={styles.recommendationRow} style={recommendationStyle}>
                            <em>{recommendation.label}</em>
                            {recommendation.stopName && recommendation.score !== undefined ? (
                              <strong>{recommendation.stopName} <b>{recommendation.score}점 · {recommendation.level?.label}</b></strong>
                            ) : (
                              <strong>자료 없음</strong>
                            )}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  <span className={styles.cardMeta}>{campus.stops.length}개 정류장 <i aria-hidden="true">→</i></span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <div><strong>Campus Flow</strong><span>캠퍼스 이동을 더 쉽고 가볍게</span></div>
        <p>지도·정류장 © OpenStreetMap contributors · 이용 집중도는 국토교통부 AI 합성 교통카드 통계 기반입니다.</p>
      </footer>
    </main>
  );
}
