import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function OnboardingMotionPreview() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        return;
      }

      const root = rootRef.current;

      if (!root) {
        return;
      }

      gsap.registerPlugin(useGSAP, ScrollTrigger);

      const media = gsap.matchMedia();

      media.add('(min-width: 768px)', () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            anticipatePin: 1,
            end: '+=140%',
            invalidateOnRefresh: true,
            pin: true,
            scrub: 0.65,
            start: 'top top',
            trigger: root,
          },
        });

        timeline
          .from('.motion-query', {
            autoAlpha: 0,
            duration: 0.2,
            y: 24,
          })
          .from(
            '.motion-source-card',
            {
              autoAlpha: 0,
              rotation: (index) => [-6, 3, 7][index] ?? 0,
              stagger: 0.08,
              x: (index) => [-120, 0, 120][index] ?? 0,
              y: 70,
            },
            0.1
          )
          .to('.motion-source-card', {
            duration: 0.35,
            rotation: 0,
            stagger: 0.06,
            x: 0,
            y: 0,
          })
          .from('.motion-connector', {
            autoAlpha: 0,
            duration: 0.2,
            stagger: 0.06,
            y: 12,
          })
          .from('.motion-pack', {
            autoAlpha: 0,
            duration: 0.25,
            scale: 0.96,
          });
      });

      media.add('(max-width: 767px)', () => {
        gsap
          .timeline({
            defaults: { ease: 'power2.out' },
            scrollTrigger: {
              once: true,
              start: 'top 78%',
              trigger: root,
            },
          })
          .from('.motion-query', {
            autoAlpha: 0,
            duration: 0.35,
            y: 16,
          })
          .from('.motion-source-card', {
            autoAlpha: 0,
            duration: 0.35,
            stagger: 0.12,
            y: 20,
          })
          .from('.motion-connector', {
            autoAlpha: 0,
            duration: 0.25,
            stagger: 0.08,
          })
          .from('.motion-pack', {
            autoAlpha: 0,
            duration: 0.35,
            y: 16,
          });
      });

      return () => media.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      className="motion-chapter"
      id="retrieve-flow"
      ref={rootRef}
      aria-labelledby="motion-chapter-title"
    >
      <div className="motion-chapter__intro">
        <span className="archive-index">03 / RETRIEVE</span>
        <div>
          <h2 id="motion-chapter-title">상황으로 다시 연결되는 꺼내보기</h2>
          <p>
            지금 하는 일을 적으면 저장해둔 링크와 메모가 현재 상황에 가까운
            작업팩으로 다시 모입니다.
          </p>
        </div>
      </div>

      <div className="motion-stage">
        <div className="motion-stage__topline">
          <span>PINNED CHAPTER</span>
          <span>SCROLL TO CONNECT</span>
        </div>
        <p className="motion-query">
          <span>지금 필요한 상황</span>
          <strong>팀 프로젝트 앱 첫 화면 참고</strong>
        </p>
        <div className="motion-sources" aria-hidden="true">
          <article className="motion-source-card motion-source-card--design">
            <span>DESIGN / 02</span>
            <strong>모바일 온보딩 흐름</strong>
            <small>첫 화면의 선택 부담 줄이기</small>
          </article>
          <article className="motion-source-card motion-source-card--dev">
            <span>DEV / 14</span>
            <strong>React 폼 구현 글</strong>
            <small>로그인 이후 입력 상태 관리</small>
          </article>
          <article className="motion-source-card motion-source-card--project">
            <span>PROJECT / 08</span>
            <strong>팀 프로젝트 기획서</strong>
            <small>데모 시나리오와 사용자 흐름</small>
          </article>
        </div>
        <div className="motion-connectors" aria-hidden="true">
          <span className="motion-connector">메모와 가까워요</span>
          <span className="motion-connector">디자인 카테고리에 저장했어요</span>
          <span className="motion-connector">
            같은 프로젝트에서 다시 봤어요
          </span>
        </div>
        <article className="motion-pack">
          <span>WORK PACK / CONNECTED</span>
          <h3>연결된 저장물 3개</h3>
          <p>지금 하는 일과 가까운 메모와 카테고리를 기준으로 모았어요.</p>
        </article>
      </div>
    </section>
  );
}
