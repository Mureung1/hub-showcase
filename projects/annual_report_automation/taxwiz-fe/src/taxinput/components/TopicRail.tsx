// 위저드 좌측 토픽 네비 (DESIGN.md §9.1) — TurboTax EasyStep Navigator 방식.
// 17개 토픽 전체를 섹션별로 묶어 보여주고, 각 토픽의 완료/현재/남음 상태를 표시한다.
// 이미 지나온 토픽만 클릭해 되돌아갈 수 있다 (앞으로 점프는 useEngine.goToTopic이 막는다).
import React, { useMemo } from 'react';
import { TOPIC_META } from '../catalog';
import styles from './TopicRail.module.css';

interface TopicRailProps {
  topicOrder: string[];
  topicKey: string;
  /** 지나온 토픽들 — 이 안에 있는 것만 클릭 가능 */
  visitedTopics: string[];
  onJump: (topicKey: string) => void;
}

export const TopicRail: React.FC<TopicRailProps> = ({ topicOrder, topicKey, visitedTopics, onJump }) => {
  // 섹션 → 토픽 목록. 순서는 topicOrder를 그대로 따른다(Map은 삽입 순서를 보존).
  const sections = useMemo(() => {
    const m = new Map<string, string[]>();
    topicOrder.forEach((k) => {
      const s = TOPIC_META[k].section;
      if (!m.has(s)) m.set(s, []);
      m.get(s)!.push(k);
    });
    return [...m.entries()];
  }, [topicOrder]);

  const visited = new Set(visitedTopics);

  return (
    <nav className={styles.rail} aria-label="입력 단계">
      {sections.map(([section, keys]) => {
        const sectionDone = keys.every((k) => visited.has(k));
        return (
          <div key={section} className={styles.group}>
            <div className={[styles.groupName, sectionDone ? styles.groupDone : ''].join(' ')}>{section}</div>
            <ul className={styles.list}>
              {keys.map((k) => {
                const isCurrent = k === topicKey;
                const isDone = visited.has(k);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      className={[
                        styles.item,
                        isCurrent ? styles.current : '',
                        isDone ? styles.done : '',
                      ].join(' ')}
                      disabled={!isDone}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => onJump(k)}
                      title={isDone ? '이 단계로 돌아가기' : undefined}
                    >
                      <span className={styles.marker} aria-hidden="true">
                        {isDone ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path d="M4 12.5l5.2 5.2L20 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span className={styles.itemLabel}>{shortTitle(k)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
};

/** 레일은 폭이 좁다 — "재무상태표 · 유동자산"처럼 섹션명이 앞에 붙은 제목은
 *  이미 그룹 헤더에 같은 말이 있으므로 뒷부분만 남긴다. */
function shortTitle(topicKey: string): string {
  const t = TOPIC_META[topicKey].title;
  const i = t.indexOf(' · ');
  return i >= 0 ? t.slice(i + 3) : t;
}
