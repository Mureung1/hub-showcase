import React from 'react';
import './ProjectIntro.css';

function ProjectIntro() {
  return (
    <section className="intro">
      <div className="intro__inner">
        <p className="intro__eyebrow">4주 프로젝트 소개</p>
        <h1 className="intro__title">
          다 팔리기 전에,
          <br />
          미리 <span className="intro__title-accent">압니다.</span>
        </h1>
        <p className="intro__lede">
          네이버 스마트스토어 셀러를 위한 재고 소진 예측 &amp; 발주 타이밍 알림 서비스
        </p>

        <div className="intro__gauge-card">
          <div className="intro__gauge-header">
            <span className="intro__gauge-label">무항생제 계란 30구</span>
            <span className="intro__gauge-badge">발주 필요</span>
          </div>
          <div className="intro__gauge-track">
            <div className="intro__gauge-fill" />
            <div className="intro__gauge-threshold" />
          </div>
          <div className="intro__gauge-footer">
            <span>현재 재고 8개</span>
            <span>예상 소진 · 2일 후</span>
          </div>
        </div>

        <div className="intro__grid">
          <div className="intro__card">
            <p className="intro__card-num">01</p>
            <h2 className="intro__card-title">문제</h2>
            <p className="intro__card-body">
              재고 관리 시스템이 없는 소규모 셀러는 감으로 발주해서
              품절과 과잉재고를 반복합니다.
            </p>
          </div>
          <div className="intro__card">
            <p className="intro__card-num">02</p>
            <h2 className="intro__card-title">해결</h2>
            <p className="intro__card-body">
              판매 데이터를 기반으로 소진 시점을 예측하고,
              재발주 타이밍을 먼저 알려드립니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProjectIntro;
