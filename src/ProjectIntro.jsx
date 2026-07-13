import React from "react";
import "./ProjectIntro.css";

/**
 * ProjectIntro
 * 워밍업 미션 - 프로젝트 주제 소개 컴포넌트
 * "왜 막히는지 이유도 모른 채 갇히는 상황을 없앤다"
 *
 * 디자인 컨셉: 지하철 노선도 / 전광판 — 경로 위의 한 지점만
 * 다른 모양으로 표시해 "이상 지점"을 짚어주는 방식
 */
export default function ProjectIntro() {
  const stops = [
    { label: "출발", time: "17:00" },
    { label: "환승", time: "17:22" },
    { label: "행사 지점", time: "17:41", alert: true },
    { label: "도착", time: "18:05" },
  ];

  return (
    <section className="intro">
      <header className="intro__header">
        <span className="intro__kicker">WARM-UP MISSION</span>
        <span className="intro__kicker-divider" aria-hidden="true" />
        <span className="intro__kicker">PROJECT TOPIC</span>
      </header>

      <h1 className="intro__title">
        왜 막히는지 모른 채
        <br />
        갇히지 않도록
      </h1>

      <p className="intro__lede">
        목적지 주변에서 열리는 축제, 스포츠 경기, 팝업 행사 정보를 에이전트가
        미리 모아, 이동하기 전에 혼잡의 원인과 시점을 알려줍니다.
      </p>

      <div className="intro__board">
        <div className="intro__board-heading">
          <span>예상 경로</span>
          <span className="intro__board-heading-sub">TODAY · 17:00</span>
        </div>

        <div className="intro__line">
          <div className="intro__line-track" aria-hidden="true" />
          {stops.map((stop) => (
            <div className="intro__stop" key={stop.label}>
              <span
                className={
                  "intro__marker" +
                  (stop.alert ? " intro__marker--alert" : "")
                }
              />
              <span className="intro__stop-time">{stop.time}</span>
              <span className="intro__stop-label">{stop.label}</span>
            </div>
          ))}
        </div>

        <div className="intro__notice">
          <span className="intro__notice-tag">ALERT</span>
          <span>행사 종료 시각 기준 약 40분간 혼잡이 예상됩니다</span>
        </div>
      </div>

      <div className="intro__flow">
        <div className="intro__flow-item">
          <span className="intro__flow-index">01</span>
          <div>
            <p className="intro__flow-title">수집</p>
            <p className="intro__flow-desc">
              경기·축제·행사 일정을 자동으로 모읍니다
            </p>
          </div>
        </div>
        <div className="intro__flow-item">
          <span className="intro__flow-index">02</span>
          <div>
            <p className="intro__flow-title">판단</p>
            <p className="intro__flow-desc">
              경로·시간대와 겹치는 지점을 찾아냅니다
            </p>
          </div>
        </div>
        <div className="intro__flow-item">
          <span className="intro__flow-index">03</span>
          <div>
            <p className="intro__flow-title">안내</p>
            <p className="intro__flow-desc">
              원인과 예상 혼잡 구간을 미리 전달합니다
            </p>
          </div>
        </div>
      </div>

      <footer className="intro__footer">
        <span>SCOPE — 대전 · 충남대 권역 MVP</span>
        <span>4-WEEK PROJECT</span>
      </footer>
    </section>
  );
}
