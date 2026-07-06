import React from "react";
import "./ProjectIntro.css";

/**
 * ProjectIntro
 * 워밍업 미션 - 프로젝트 주제 소개 컴포넌트
 * "왜 막히는지 이유도 모른 채 갇히는 상황을 없앤다"
 */
export default function ProjectIntro() {
  const stops = [
    { label: "출발", state: "normal" },
    { label: "환승", state: "normal" },
    { label: "행사 지점", state: "alert" },
    { label: "도착", state: "normal" },
  ];

  return (
    <section className="intro">
      <div className="intro__eyebrow">WARM-UP MISSION · PROJECT TOPIC</div>

      <h1 className="intro__title">
        왜 막히는지, <span className="intro__title--accent">미리</span> 알고
        가자
      </h1>

      <p className="intro__lede">
        목적지 근처에서 열리는 축제, 스포츠 경기, 팝업 행사 때문에 아무 이유도
        모른 채 혼잡에 갇히는 순간들. 에이전트가 대신 정보를 긁어와 이동
        전에 알려줍니다.
      </p>

      <div className="intro__route" aria-label="예상 경로 및 혼잡 지점 표시">
        <div className="intro__route-line">
          {stops.map((stop, idx) => (
            <div className="intro__stop" key={stop.label}>
              <span
                className={
                  "intro__dot" +
                  (stop.state === "alert" ? " intro__dot--alert" : "")
                }
              />
              <span className="intro__stop-label">{stop.label}</span>
              {idx < stops.length - 1 && (
                <span className="intro__segment" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
        <div className="intro__route-note">
          <span className="intro__badge">ALERT</span>
          인근 행사 종료 시각 기준 약 40분간 혼잡 예상
        </div>
      </div>

      <ul className="intro__points">
        <li>
          <strong>수집</strong> — 스포츠 경기, 학교·지역 축제 일정을 에이전트가
          자동으로 모읍니다
        </li>
        <li>
          <strong>판단</strong> — 사용자의 경로·시간대와 이벤트 정보를 대조해
          겹치는 구간을 찾습니다
        </li>
        <li>
          <strong>알림</strong> — 원인과 예상 혼잡 시간을 이동 전에 미리
          안내합니다
        </li>
      </ul>

      <div className="intro__footer">
        <span className="intro__footer-label">SCOPE</span>
        <span>대전 · 충남대 권역 MVP — 4주 프로젝트</span>
      </div>
    </section>
  );
}
