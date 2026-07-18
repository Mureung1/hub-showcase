'use client';
import { useEffect, useState } from 'react';
const sections = [['overview','소개'],['outcomes','기대 결과'],['for-whom','추천 대상'],['daily-routine','일일 루틴'],['how-it-works','진행 방식'],['verification','인증'],['rewards','혜택'],['schedule','일정'],['faq','FAQ'],['join','참가']] as const;
export function OfficialSectionNav() {
  const [active,setActive] = useState('overview');
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },{ rootMargin:'-25% 0px -65%',threshold:[0,.25,.5] });
    sections.forEach(([id]) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  },[]);
  function focusSection(id: string) { requestAnimationFrame(() => { const heading = document.querySelector<HTMLElement>(`#${id} h2, #${id} h1`); heading?.setAttribute('tabindex','-1'); heading?.focus({ preventScroll: true }); }); }
  return <nav className="anchor-nav glass-nav" aria-label="캠페인 섹션">{sections.map(([id,label]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => focusSection(id)}>{label}</a>)}</nav>;
}
