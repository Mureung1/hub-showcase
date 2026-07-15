import { useState } from "react";

/**
 * CoSyncIntro
 * "협업 및 모임 도움 에이전트" 프로젝트 소개 컴포넌트.
 *
 * 시그니처 인터랙션: 랜턴(에이전트)은 평소엔 조용히 꺼져 있다가,
 * 사용자가 "도움 요청하기"를 눌렀을 때만 켜지며 개입한다.
 * — 이 프로젝트의 핵심 설계 원칙(요청 기반 개입, 비감시)을
 *   실제 동작으로 체험하게 만드는 장치.
 */
export default function CoSyncIntro() {
  const [requested, setRequested] = useState(false);

  return (
    <div className="cosync-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

        .cosync-root {
          --dusk-950: #12142A;
          --dusk-800: #232A52;
          --dusk-700: #323B6E;
          --twilight-500: #6669B0;
          --lantern-400: #E8B26B;
          --lantern-200: #F6DBAA;
          --mist-100: #EEEFF6;
          --mist-300: #C7CAE2;
          --rose-400: #C98A93;

          font-family: 'IBM Plex Sans KR', sans-serif;
          background: radial-gradient(120% 90% at 50% -10%, var(--dusk-700) 0%, var(--dusk-950) 55%, #090a1a 100%);
          color: var(--mist-100);
          padding: 72px 24px 56px;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }

        .cosync-root *, .cosync-root *::before, .cosync-root *::after {
          box-sizing: border-box;
        }

        .cosync-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1.5px 1.5px at 12% 18%, rgba(238,239,246,0.55), transparent),
            radial-gradient(1.5px 1.5px at 28% 8%, rgba(238,239,246,0.4), transparent),
            radial-gradient(1px 1px at 62% 14%, rgba(238,239,246,0.5), transparent),
            radial-gradient(1.5px 1.5px at 82% 22%, rgba(238,239,246,0.35), transparent),
            radial-gradient(1px 1px at 45% 6%, rgba(238,239,246,0.45), transparent),
            radial-gradient(1.5px 1.5px at 92% 10%, rgba(238,239,246,0.4), transparent);
          pointer-events: none;
          opacity: 0.9;
        }

        .cosync-inner {
          position: relative;
          max-width: 620px;
          margin: 0 auto;
        }

        .cosync-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--mist-300);
          margin: 0 0 18px;
        }

        .cosync-headline {
          font-family: 'Noto Serif KR', serif;
          font-weight: 700;
          font-size: clamp(28px, 4.2vw, 40px);
          line-height: 1.35;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }

        .cosync-headline em {
          font-style: normal;
          color: var(--lantern-200);
        }

        .cosync-sub {
          font-size: 16px;
          line-height: 1.7;
          color: var(--mist-300);
          margin: 0 0 48px;
          max-width: 480px;
        }

        .cosync-horizon {
          position: relative;
          border-top: 1px solid rgba(199, 202, 226, 0.18);
          padding-top: 40px;
          margin-bottom: 52px;
        }

        .cosync-lantern-row {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 22px;
        }

        .cosync-lantern {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${''}
          transition: box-shadow 0.6s ease, background 0.6s ease;
        }

        .cosync-lantern-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          transition: background 0.6s ease, box-shadow 0.6s ease;
        }

        .cosync-status {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(199, 202, 226, 0.3);
          color: var(--mist-300);
          transition: all 0.5s ease;
        }

        .cosync-line {
          font-size: 15px;
          line-height: 1.7;
          color: var(--mist-100);
          margin: 0;
          min-height: 52px;
        }

        .cosync-line .quiet {
          color: var(--mist-300);
        }

        .cosync-draft {
          margin-top: 18px;
          padding: 18px 20px;
          background: rgba(232, 178, 107, 0.08);
          border: 1px solid rgba(232, 178, 107, 0.35);
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.65;
          color: var(--lantern-200);
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.5s ease, opacity 0.5s ease, padding 0.5s ease, margin 0.5s ease;
        }

        .cosync-draft.open {
          max-height: 160px;
          opacity: 1;
        }

        .cosync-draft strong {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--rose-400);
          margin-bottom: 8px;
          font-weight: 500;
        }

        .cosync-btn {
          margin-top: 22px;
          font-family: 'IBM Plex Sans KR', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--dusk-950);
          background: var(--lantern-200);
          border: none;
          padding: 12px 22px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.3s ease;
        }

        .cosync-btn:hover {
          transform: translateY(-1px);
        }

        .cosync-btn:focus-visible {
          outline: 2px solid var(--mist-100);
          outline-offset: 3px;
        }

        .cosync-btn[disabled] {
          background: var(--dusk-700);
          color: var(--mist-300);
          cursor: default;
          transform: none;
        }

        .cosync-pillars {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 44px;
        }

        .cosync-pillar {
          background: rgba(238, 239, 246, 0.04);
          border: 1px solid rgba(199, 202, 226, 0.14);
          border-radius: 14px;
          padding: 20px 18px;
        }

        .cosync-pillar-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--twilight-500);
          background: rgba(102, 105, 176, 0.18);
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .cosync-pillar h3 {
          font-family: 'Noto Serif KR', serif;
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 8px;
          color: var(--mist-100);
        }

        .cosync-pillar p {
          font-size: 13px;
          line-height: 1.6;
          color: var(--mist-300);
          margin: 0;
        }

        .cosync-footer {
          border-top: 1px solid rgba(199, 202, 226, 0.18);
          padding-top: 28px;
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-style: normal;
          color: var(--mist-300);
          text-align: center;
        }

        .cosync-footer strong {
          color: var(--lantern-200);
          font-weight: 500;
        }

        @media (prefers-reduced-motion: reduce) {
          .cosync-lantern, .cosync-lantern-dot, .cosync-draft, .cosync-btn, .cosync-status {
            transition: none !important;
          }
        }
      `}</style>

      <div className="cosync-stars" aria-hidden="true" />

      <div className="cosync-inner">
        <p className="cosync-eyebrow">협업 및 모임 도움 에이전트 · Co-Sync Agent</p>

        <h1 className="cosync-headline">
          필요할 때, 필요한 만큼만 돕습니다.
        </h1>

        <p className="cosync-sub">
          조별과제, 스터디, 소규모 모임의 일정과 역할을 정리합니다. 제안에는 항상 이유를 함께
          보여주고, 그 외의 개입은 사용자가 직접 요청할 때만 이루어집니다.
        </p>

        <div className="cosync-horizon">
          <div className="cosync-lantern-row">
            <div
              className="cosync-lantern"
              style={{
                background: requested
                  ? "radial-gradient(circle, rgba(232,178,107,0.35) 0%, rgba(232,178,107,0.05) 70%)"
                  : "transparent",
                boxShadow: requested ? "0 0 24px 4px rgba(232,178,107,0.35)" : "none",
              }}
            >
              <div
                className="cosync-lantern-dot"
                style={{
                  background: requested ? "var(--lantern-200)" : "var(--dusk-700)",
                  boxShadow: requested ? "0 0 12px 3px rgba(246,219,170,0.7)" : "none",
                }}
              />
            </div>
            <span className="cosync-status">
              {requested ? "RESPONDING" : "STANDBY"}
            </span>
          </div>

          <p className="cosync-line">
            {requested ? (
              <>요청을 확인했습니다. 메시지 초안을 준비했습니다.</>
            ) : (
              <span className="quiet">
                B님의 응답이 3일째 없습니다. 요청하기 전까지는 개입하지 않습니다.
              </span>
            )}
          </p>

          <div className={`cosync-draft ${requested ? "open" : ""}`}>
            <strong>메시지 초안</strong>
            "요즘 어떻게 지내? 마감 전에 진행 상황 한 번 나눠볼까?"
          </div>

          <button
            className="cosync-btn"
            onClick={() => setRequested(true)}
            disabled={requested}
          >
            {requested ? "요청 완료" : "도움 요청하기"}
          </button>
        </div>

        <div className="cosync-pillars">
          <div className="cosync-pillar">
            <span className="cosync-pillar-label">기능 A</span>
            <h3>근거 있는 조율</h3>
            <p>시간과 역할을 제안할 때 이유를 함께 보여줍니다.</p>
          </div>
          <div className="cosync-pillar">
            <span className="cosync-pillar-label">기능 B</span>
            <h3>요청 기반 개입</h3>
            <p>상황을 지켜보지 않습니다. 개입은 요청에서 시작됩니다.</p>
          </div>
          <div className="cosync-pillar">
            <span className="cosync-pillar-label">기능 C</span>
            <h3>안전한 결산</h3>
            <p>행동 기반 문항과 최소 인원 기준으로 결과를 공개합니다.</p>
          </div>
        </div>

        <div className="cosync-footer">
          모든 결정은 사용자가 내립니다.
        </div>
      </div>
    </div>
  );
}
