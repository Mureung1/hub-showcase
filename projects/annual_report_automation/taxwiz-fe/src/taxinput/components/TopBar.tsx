// 위저드 상단 — 얇은 유틸리티 바 + 브랜드/현재 위치 행 + 진행 실선.
// 구조는 정부 부처 포털의 공통 골격(얇은 유틸바 → 로고+명칭 → 카테고리 내비)에서 가져왔다.
// 여기서 "카테고리 내비"에 해당하는 건 좌측 TopicRail이라 상단에는 두지 않는다.
//
// 이전 버전에 있던 것 중 뺀 것 (DESIGN.md §7.1):
//   - backdrop-filter 글래스모피즘 → 불투명 배경 + 실선
//   - 그라디언트 진행바 → 단색 실선
//   - 섹션 pill 줄 → 좌측 레일이 대체 (좁은 화면에선 제목 위 eyebrow가 같은 정보를 남긴다)
// 진행률 %와 "약 N문항 남음"은 우측 LivePanel로 옮겼다 — 여기 실선은 위치 감각용 최소 표시.
import React from 'react';
import { ANNUAL_TOPIC_ORDER, TOPIC_META } from '../catalog';
import styles from './TopBar.module.css';

interface TopBarProps {
  topicKey: string;
  progressPct: number;
  canGoBack: boolean;
  onBack: () => void;
  /** 이 위저드가 진행하는 토픽 순서 — 현재 위치 표기에 쓴다 (기본: 연간 입력) */
  topicOrder?: string[];
  /** 더 갈 "이전"이 없을 때(첫 질문) 이전 버튼이 이걸 호출한다 — 위저드에서 홈으로 나가는 길 */
  onExit?: () => void;
  /** 상단에 함께 보여줄 문맥 — 보통 회사명 */
  context?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  topicKey, progressPct, canGoBack, onBack, topicOrder = ANNUAL_TOPIC_ORDER, onExit, context,
}) => {
  const curIdx = topicOrder.indexOf(topicKey);
  const section = TOPIC_META[topicKey].section;

  return (
    <header className={styles.header}>
      <div className={styles.utility}>
        <span className={styles.brand}>Tax<em>Wiz</em></span>
        {context && <span className={styles.context}>{context}</span>}
        <span className={styles.spacer} />
        <span className={styles.step}>
          {curIdx >= 0 && `${curIdx + 1} / ${topicOrder.length}단계`}
        </span>
        {onExit && (
          <button type="button" className={styles.exitBtn} onClick={onExit}>
            나가기
          </button>
        )}
      </div>

      <div className={styles.bar}>
        <button
          type="button"
          className={styles.backBtn}
          disabled={!canGoBack && !onExit}
          onClick={canGoBack ? onBack : onExit}
          aria-label={canGoBack ? '이전 질문으로' : '홈으로 나가기'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {canGoBack ? '이전' : '홈으로'}
        </button>
        <span className={styles.here}>{section}</span>
      </div>

      <div className={styles.track} role="presentation">
        <div className={styles.fill} style={{ width: `${progressPct}%` }} />
      </div>
    </header>
  );
};
