export default function ConsumptionCoachIntro() {
  return (
    <div className="ck-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');

        .ck-page {
          --bg: #E4EAF1;
          --ink: #1D2024;
          --ink-soft: #565B63;
          --line: #DADEE3;

          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          color: var(--ink);
          padding: 60px 16px;
          font-family: 'Noto Sans KR', sans-serif;
          box-sizing: border-box;
        }
        .ck-page *, .ck-page *::before, .ck-page *::after { box-sizing: border-box; }

        .ck-machine {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .ck-printer {
          position: relative;
          width: 300px;
          height: 58px;
          border-radius: 14px;
          background: linear-gradient(180deg, #f6f7f9 0%, #d9dce0 42%, #b6bac0 43%, #e7e9eb 62%, #c6cace 100%);
          box-shadow:
            0 12px 22px rgba(20, 30, 45, 0.18),
            inset 0 1px 0 rgba(255,255,255,0.8),
            inset 0 -1px 0 rgba(0,0,0,0.15);
          z-index: 2;
        }
        .ck-slot {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 78%;
          height: 9px;
          background: #17181b;
          border-radius: 5px;
          box-shadow: inset 0 2px 3px rgba(0,0,0,0.7);
        }

        .ck-receipt-wrap {
          position: relative;
          margin-top: -16px;
          z-index: 1;
          width: 320px;
          max-width: 100%;
        }

        .ck-receipt {
          position: relative;
          background: #ffffff;
          padding: 44px 28px 26px;
          box-shadow: 0 28px 48px rgba(20, 30, 45, 0.18);
        }
        .ck-receipt::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 14px;
          background: linear-gradient(180deg, rgba(0,0,0,0.10), transparent);
        }
        .ck-receipt::after {
          content: "";
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 11px;
          background:
            linear-gradient(135deg, var(--bg) 50%, transparent 50%),
            linear-gradient(-135deg, var(--bg) 50%, transparent 50%);
          background-size: 18px 18px;
          background-repeat: repeat-x;
          transform: rotate(180deg);
        }

        .ck-title {
          text-align: center;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.01em;
          margin: 0;
          color: var(--ink);
        }

        .ck-rule-double {
          margin: 16px 0 20px;
        }
        .ck-rule-double span {
          display: block;
          border-top: 1.5px solid var(--ink);
        }
        .ck-rule-double span + span {
          margin-top: 3px;
        }

        .ck-pitch {
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink);
          margin: 0 0 14px;
        }

        .ck-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          font-size: 12.5px;
          padding: 5px 0;
          color: var(--ink);
        }
        .ck-row span:first-child { color: var(--ink-soft); white-space: nowrap; }
        .ck-row span:last-child { font-weight: 500; text-align: right; }

        .ck-divider {
          border: none;
          border-top: 1px dashed var(--line);
          margin: 18px 0;
        }

        .ck-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }

        .ck-features { margin-bottom: 6px; }
        .ck-feature {
          padding: 12px 0;
          border-bottom: 1px dotted var(--line);
        }
        .ck-feature:last-child { border-bottom: none; }
        .ck-feature-name {
          font-weight: 700;
          font-size: 13px;
          color: var(--ink);
          margin-bottom: 4px;
        }
        .ck-feature-desc {
          font-size: 12px;
          color: var(--ink-soft);
          line-height: 1.55;
          margin: 0;
        }

        .ck-barcode {
          height: 34px;
          margin: 0 auto 10px;
          width: 84%;
          background-image: repeating-linear-gradient(
            90deg,
            var(--ink) 0px, var(--ink) 2px,
            transparent 2px, transparent 4px,
            var(--ink) 4px, var(--ink) 5px,
            transparent 5px, transparent 8px,
            var(--ink) 8px, var(--ink) 11px,
            transparent 11px, transparent 13px,
            var(--ink) 13px, var(--ink) 14px,
            transparent 14px, transparent 17px
          );
        }
        .ck-code {
          text-align: center;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: var(--ink-soft);
          margin-bottom: 8px;
        }

        @media (max-width: 360px) {
          .ck-printer { width: 88vw; }
          .ck-receipt-wrap { width: 88vw; }
        }
      `}</style>

      <div className="ck-machine">
        <div className="ck-printer">
          <div className="ck-slot" />
        </div>

        <div className="ck-receipt-wrap">
          <div className="ck-receipt">
            <h1 className="ck-title">AI 소비 코치</h1>

            <div className="ck-rule-double">
              <span></span>
              <span></span>
            </div>

            <p className="ck-pitch">
              기록하는 가계부가 아니라, 소비 습관을 바꿔주는 AI 코치 — 영수증을 찍으면 자취생 특화
              카테고리로 분석하고, 현재 소비 속도로 생활비가 언제 바닥나는지 예측해 알려줍니다.
            </p>

            <div className="ck-row"><span>대주제</span><span>대학생(본인) 문제 해결</span></div>
            <div className="ck-row"><span>개발 기간</span><span>4주</span></div>
            <div className="ck-row"><span>타겟 유저</span><span>자취·기숙사 대학생</span></div>

            <hr className="ck-divider" />

            <div className="ck-section-label">핵심 기능</div>
            <div className="ck-row"><span>카테고리 자동 분류</span><span>F4</span></div>
            <div className="ck-row"><span>생활비 소진일 예측</span><span>F6</span></div>
            <div className="ck-row"><span>월말 생존 모드</span><span>F7</span></div>
            <div className="ck-row"><span>업로드 즉시 코칭</span><span>F8</span></div>

            <hr className="ck-divider" />

            <div className="ck-section-label">기술 스택</div>
            <div className="ck-features">
              <div className="ck-feature">
                <div className="ck-feature-name">OCR</div>
                <p className="ck-feature-desc">네이버 클로바 OCR · 업스테이지 Document AI · Google Cloud Vision 중 비교 후 선택</p>
              </div>
              <div className="ck-feature">
                <div className="ck-feature-name">AI 코칭</div>
                <p className="ck-feature-desc">LLM API(Claude/GPT 등) — 자취생 페르소나와 소비 데이터를 프롬프트에 주입</p>
              </div>
              <div className="ck-feature">
                <div className="ck-feature-name">AI 에이전트 (F11, 스트레치)</div>
                <p className="ck-feature-desc">LLM Function Calling / Tool Use — 레시피 검색 등 외부 도구를 스스로 호출</p>
              </div>
              <div className="ck-feature">
                <div className="ck-feature-name">백엔드</div>
                <p className="ck-feature-desc">Node.js 또는 Spring — 학습 중인 스택 기준으로 선택</p>
              </div>
              <div className="ck-feature">
                <div className="ck-feature-name">DB</div>
                <p className="ck-feature-desc">PostgreSQL / MySQL — 영수증 원본과 파싱된 지출 내역 테이블 분리</p>
              </div>
              <div className="ck-feature">
                <div className="ck-feature-name">프론트엔드</div>
                <p className="ck-feature-desc">React — 대시보드 차트 라이브러리 활용</p>
              </div>
            </div>

            <hr className="ck-divider" />

            <div className="ck-barcode" />
            <div className="ck-code">#AICOACH-0001</div>
          </div>
        </div>
      </div>
    </div>
  );
}