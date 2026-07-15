import type { CSSProperties } from 'react';
import type { Campus } from '../types';
import { campusPresentation, fallbackCampusPresentation } from '../data/campus-presentation';
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

export function CampusDirectory({ campuses, onSelect }: CampusDirectoryProps) {
  const stopCount = campuses.reduce((total, campus) => total + campus.stops.length, 0);

  return (
    <main className={styles.shell}>
      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="Campus Flow 처음으로">
          <span className={styles.brandMark} aria-hidden="true">CF</span>
          <span><strong>Campus Flow</strong><small>전국 거점대 정류장 지도</small></span>
        </a>
        <span className={styles.status}><i aria-hidden="true" /> 실시간 혼잡도 연동 준비 중</span>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>전국 거점대 캠퍼스·정류장 지도</span>
          <h1>우리 학교 가는 길,<br /><em>정류장부터 한눈에</em></h1>
          <p>전국 {campuses.length}개 거점국립대의 실제 캠퍼스 경계와 주요 접근 정류장 {stopCount}곳을 모았어요. 학교를 선택해 정류장 위치와 이동 정보를 확인해 보세요.</p>
          <div className={styles.heroFacts} aria-label="서비스 제공 범위">
            <span><strong>{campuses.length}</strong>개 대학</span>
            <span><strong>{stopCount}</strong>개 정류장</span>
            <span><strong>OSM</strong> 실제 지도</span>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.orbitOne} />
          <span className={styles.orbitTwo} />
          <div className={styles.heroPin}><i />내 캠퍼스 찾기</div>
          <div className={styles.heroCard}><strong>{campuses.length}</strong><span>전국 거점대<br />캠퍼스 연결</span></div>
          <div className={styles.heroRoute}><i /><i /><i /></div>
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
                  <span>{campus.stops.length}개 정류장 <i aria-hidden="true">→</i></span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <div><strong>Campus Flow</strong><span>캠퍼스 이동을 더 쉽고 가볍게</span></div>
        <p>지도·정류장 데이터 © OpenStreetMap contributors · 혼잡도는 기능 미리보기용 샘플입니다.</p>
      </footer>
    </main>
  );
}
