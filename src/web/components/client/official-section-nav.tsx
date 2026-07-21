'use client';

import { useEffect, useState } from 'react';

const sections = [
  ['overview', '미션'],
  ['outcomes', '변화'],
  ['for-whom', '첫 점화'],
  ['daily-routine', '하루 루틴'],
  ['how-it-works', '30일 여정'],
  ['verification', '인증'],
  ['rewards', '완주'],
  ['schedule', '일정'],
  ['faq', 'FAQ'],
  ['join', '참가'],
] as const;

export function OfficialSectionNav() {
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-25% 0px -65%', threshold: [0, 0.25, 0.5] });

    sections.forEach(([id]) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  function focusSection(id: string) {
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(`#${id} h2, #${id} h1`);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    });
  }

  return (
    <nav className="anchor-nav glass-nav" aria-label="공식 챌린지 둘러보기">
      {sections.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? 'location' : undefined}
          onClick={() => focusSection(id)}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
