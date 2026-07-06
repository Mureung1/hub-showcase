import React from "react";

const features = [
  {
    title: "방문 횟수 자동 기록",
    description: "직원이 고객을 찾고 방문 버튼만 누르면 누적 방문 수가 바로 반영됩니다.",
  },
  {
    title: "쿠폰 발급 상태 확인",
    description: "사용 가능, 사용 완료, 만료 예정 쿠폰을 한 화면에서 구분해 관리합니다.",
  },
  {
    title: "단골 고객 관리",
    description: "고객별 방문 흐름을 확인해 재방문 혜택과 매장 운영을 쉽게 연결합니다.",
  },
];

const steps = ["고객 검색", "방문 적립", "쿠폰 발급", "사용 처리"];

export default function LoyaltyCouponIntro() {
  return (
    <section className="loyalty-intro" aria-labelledby="loyalty-coupon-title">
      <style>{`
        .loyalty-intro {
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          background: #f7f2ea;
          color: #1f2a2e;
          font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
          padding: 72px 24px;
        }

        .loyalty-intro * {
          box-sizing: border-box;
        }

        .loyalty-intro__inner {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 48px;
          align-items: center;
        }

        .loyalty-intro__eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          background: #e7f0e9;
          color: #236042;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 22px;
        }

        .loyalty-intro__title {
          margin: 0;
          font-size: clamp(36px, 7vw, 72px);
          line-height: 1.02;
          font-weight: 900;
          letter-spacing: 0;
          max-width: 700px;
        }

        .loyalty-intro__lead {
          margin: 24px 0 0;
          max-width: 590px;
          color: #4d5a5e;
          font-size: clamp(17px, 2vw, 21px);
          line-height: 1.7;
          word-break: keep-all;
        }

        .loyalty-intro__actions,
        .loyalty-intro__steps {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .loyalty-intro__actions {
          margin-top: 34px;
        }

        .loyalty-intro__button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 800;
          border: 1px solid #d8d1c7;
        }

        .loyalty-intro__button--primary {
          background: #1f6f8b;
          color: #ffffff;
          border-color: #1f6f8b;
        }

        .loyalty-intro__button--secondary {
          background: #ffffff;
          color: #1f2a2e;
        }

        .loyalty-intro__steps {
          margin-top: 24px;
        }

        .loyalty-intro__step {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          background: #eef6f3;
          color: #2a6252;
          font-size: 14px;
          font-weight: 800;
        }

        .loyalty-intro__features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 42px;
        }

        .loyalty-intro__feature {
          background: #ffffff;
          border: 1px solid #e2d7cb;
          border-radius: 8px;
          padding: 18px;
        }

        .loyalty-intro__feature-title {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }

        .loyalty-intro__feature-text {
          margin: 10px 0 0;
          color: #5d696d;
          font-size: 14px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .loyalty-intro__visual {
          position: relative;
          min-height: 520px;
          border-radius: 18px;
          background: linear-gradient(150deg, #ffffff 0%, #eef6f3 52%, #f8d9bd 100%);
          border: 1px solid #e2d7cb;
          box-shadow: 0 28px 80px rgba(45, 55, 52, 0.16);
          overflow: hidden;
          padding: 28px;
        }

        .loyalty-intro__phone {
          position: absolute;
          inset: 44px 44px auto auto;
          width: min(320px, calc(100% - 88px));
          min-height: 420px;
          border-radius: 28px;
          background: #172126;
          padding: 16px;
          box-shadow: 0 22px 50px rgba(23, 33, 38, 0.32);
        }

        .loyalty-intro__screen {
          min-height: 388px;
          border-radius: 20px;
          background: #fbfaf7;
          padding: 18px;
        }

        .loyalty-intro__screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .loyalty-intro__app-name {
          font-size: 16px;
          font-weight: 900;
        }

        .loyalty-intro__status {
          flex: 0 0 auto;
          border-radius: 999px;
          background: #dff1e5;
          color: #236042;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .loyalty-intro__customer {
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #ebe4da;
          padding: 16px;
          margin-bottom: 14px;
        }

        .loyalty-intro__customer-name {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .loyalty-intro__customer-meta {
          margin: 6px 0 0;
          color: #687478;
          font-size: 13px;
        }

        .loyalty-intro__stamp-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .loyalty-intro__stamp {
          aspect-ratio: 1;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: #f2f0eb;
          color: #7d878a;
          font-size: 14px;
          font-weight: 900;
        }

        .loyalty-intro__stamp--active {
          background: #1f6f8b;
          color: #ffffff;
        }

        .loyalty-intro__coupon {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          border-radius: 12px;
          background: #fff3e8;
          border: 1px solid #f2c9a8;
          padding: 14px;
        }

        .loyalty-intro__coupon-title {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
        }

        .loyalty-intro__coupon-text {
          margin: 4px 0 0;
          color: #71513a;
          font-size: 12px;
        }

        .loyalty-intro__coupon-button {
          min-height: 36px;
          border: 0;
          border-radius: 8px;
          background: #c86535;
          color: #ffffff;
          font-weight: 900;
          padding: 0 12px;
        }

        .loyalty-intro__stats {
          position: absolute;
          left: 28px;
          bottom: 28px;
          width: min(280px, calc(100% - 56px));
          display: grid;
          gap: 12px;
        }

        .loyalty-intro__stat {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(226, 215, 203, 0.9);
          padding: 16px;
          backdrop-filter: blur(8px);
        }

        .loyalty-intro__stat-number {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
        }

        .loyalty-intro__stat-label {
          margin: 4px 0 0;
          color: #5d696d;
          font-size: 13px;
        }

        @media (max-width: 960px) {
          .loyalty-intro {
            padding: 56px 20px;
          }

          .loyalty-intro__inner {
            grid-template-columns: 1fr;
          }

          .loyalty-intro__features {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .loyalty-intro {
            padding: 40px 16px;
          }

          .loyalty-intro__button {
            width: 100%;
          }

          .loyalty-intro__visual {
            min-height: 600px;
            padding: 18px;
          }

          .loyalty-intro__phone {
            inset: 24px 18px auto 18px;
            width: auto;
            min-height: 390px;
          }

          .loyalty-intro__screen {
            min-height: 358px;
          }

          .loyalty-intro__stats {
            left: 18px;
            right: 18px;
            bottom: 18px;
            width: auto;
          }
        }
      `}</style>

      <div className="loyalty-intro__inner">
        <div>
          <span className="loyalty-intro__eyebrow">
            단골 고객 쿠폰 관리 서비스
          </span>
          <h1 id="loyalty-coupon-title" className="loyalty-intro__title">
            종이 쿠폰 없이 방문 적립과 쿠폰 사용을 간단하게
          </h1>
          <p className="loyalty-intro__lead">
            매장 직원은 고객을 빠르게 찾고 방문 횟수를 기록합니다. 고객별
            쿠폰 상태와 사용 이력을 한 화면에서 확인해 단골 혜택을 놓치지
            않도록 돕습니다.
          </p>

          <div className="loyalty-intro__actions" aria-label="주요 동작">
            <a
              href="#coupon-demo"
              className="loyalty-intro__button loyalty-intro__button--primary"
            >
              화면 미리보기
            </a>
            <a
              href="#service-flow"
              className="loyalty-intro__button loyalty-intro__button--secondary"
            >
              관리 흐름 보기
            </a>
          </div>

          <div
            id="service-flow"
            className="loyalty-intro__steps"
            aria-label="서비스 흐름"
          >
            {steps.map((step, index) => (
              <span key={step} className="loyalty-intro__step">
                {index + 1}. {step}
              </span>
            ))}
          </div>

          <div className="loyalty-intro__features">
            {features.map((feature) => (
              <article key={feature.title} className="loyalty-intro__feature">
                <h2 className="loyalty-intro__feature-title">
                  {feature.title}
                </h2>
                <p className="loyalty-intro__feature-text">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div
          id="coupon-demo"
          className="loyalty-intro__visual"
          aria-label="서비스 화면 예시"
        >
          <div className="loyalty-intro__phone">
            <div className="loyalty-intro__screen">
              <div className="loyalty-intro__screen-header">
                <strong className="loyalty-intro__app-name">Coupon Hub</strong>
                <span className="loyalty-intro__status">영업 중</span>
              </div>

              <div className="loyalty-intro__customer">
                <p className="loyalty-intro__customer-name">김민지 고객</p>
                <p className="loyalty-intro__customer-meta">
                  최근 방문 2026.07.06 · 총 8회
                </p>
                <div className="loyalty-intro__stamp-grid" aria-label="방문 적립 8회">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      className={
                        index < 8
                          ? "loyalty-intro__stamp loyalty-intro__stamp--active"
                          : "loyalty-intro__stamp"
                      }
                    >
                      {index < 8 ? "✓" : index + 1}
                    </span>
                  ))}
                </div>
              </div>

              <div className="loyalty-intro__coupon">
                <div>
                  <p className="loyalty-intro__coupon-title">무료 음료 쿠폰</p>
                  <p className="loyalty-intro__coupon-text">
                    2회 더 방문하면 자동 발급
                  </p>
                </div>
                <button type="button" className="loyalty-intro__coupon-button">
                  적립
                </button>
              </div>
            </div>
          </div>

          <div className="loyalty-intro__stats">
            <div className="loyalty-intro__stat">
              <p className="loyalty-intro__stat-number">128명</p>
              <p className="loyalty-intro__stat-label">이번 달 재방문 고객</p>
            </div>
            <div className="loyalty-intro__stat">
              <p className="loyalty-intro__stat-number">42장</p>
              <p className="loyalty-intro__stat-label">사용 가능한 쿠폰</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
